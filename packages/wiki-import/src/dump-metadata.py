"""Join public Wikimedia snapshots. SQLite holds the indexes, never the full entity dumps."""
import bz2
import gzip
import hashlib
import json
import re
import sqlite3
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import quote

ROOT = "https://dumps.wikimedia.org"
USER_AGENT = "wiki-collection/0.1 (+https://github.com/matsupiee/wiki-collection)"


@contextmanager
def source(relative, directory):
    name = relative.rsplit("/", 1)[1]
    print(f"Reading {name}", file=sys.stderr, flush=True)
    def decompress(stream):
        return gzip.GzipFile(fileobj=stream) if name.endswith(".gz") else bz2.BZ2File(stream)
    if directory:
        with Path(directory, name).open("rb") as stream, decompress(stream) as data:
            yield data
        return
    with subprocess.Popen(["curl", "--fail", "--silent", "--show-error", "--location",
                           "--user-agent", USER_AGENT, f"{ROOT}/{relative}"],
                          stdout=subprocess.PIPE) as process:
        try:
            with process.stdout, decompress(process.stdout) as data:
                yield data
            if process.wait():
                raise OSError(f"Could not download {name}")
        finally:
            if process.poll() is None:
                process.terminate()


# mysqldump escapes quotes, delimiters and binary fields inside SQL strings.
VALUE = re.compile(rb"'(?:[^'\\]|\\.)*'|[^,()\s]+")
ESCAPES = {b"0": b"\0", b"n": b"\n", b"r": b"\r", b"t": b"\t", b"b": b"\b", b"Z": b"\x1a"}


def string(value):
    if value.startswith(b"'"):
        value = re.sub(rb"\\(.)", lambda m: ESCAPES.get(m[1], m[1]), value[1:-1])
    return value.decode()


def sql_rows(table, fields, directory):
    name = f"jawiki-latest-{table}.sql.gz"
    with source(f"jawiki/latest/{name}", directory) as data:
        columns = []
        indexes = []
        rows = False
        prefix = f"INSERT INTO `{table}` VALUES".encode()
        for line in data:
            if line.startswith(b"  `"):
                columns.append(line.split(b"`", 2)[1].decode())
            if line.startswith(prefix):
                indexes = [columns.index(field) for field in fields]
                rows = True
                line = line[len(prefix):]
            if not rows:
                continue
            line = line.strip()
            pos = 0
            while pos < len(line):
                if line[pos:pos+1] != b"(":
                    raise ValueError(f"Invalid {table} row")
                pos += 1
                values = []
                while True:
                    token = VALUE.match(line, pos)
                    if token is None:
                        raise ValueError(f"Invalid {table} field")
                    values.append(token[0])
                    pos = token.end()
                    separator = line[pos:pos+1]
                    pos += 1
                    if separator == b")":
                        break
                    if separator != b",":
                        raise ValueError(f"Invalid {table} separator")
                yield tuple(values[i] for i in indexes)
                if line[pos:pos+1] == b";":
                    rows = False
                elif line[pos:pos+1] != b",":
                    raise ValueError(f"Invalid {table} delimiter")
                pos += 1
        if not columns or rows:
            raise ValueError(f"Incomplete {name}")


def entity_lines(relative, directory):
    with source(relative, directory) as data:
        if data.readline().strip() != b"[":
            raise ValueError("Invalid Wikibase JSON dump")
        for line in data:
            line = line.strip()
            if line == b"]":
                return
            if line:
                yield line.rstrip(b",")
        raise ValueError("Incomplete Wikibase JSON dump")


def index_jawiki(db, directory):
    targets = {int(i): string(name).replace("_", " ") for i, ns, name in
               sql_rows("linktarget", ["lt_id", "lt_namespace", "lt_title"], directory) if int(ns) == 14}
    db.executemany("INSERT INTO categories VALUES (?,?)",
                   ((int(page), targets[int(target)]) for page, target in
                    sql_rows("categorylinks", ["cl_from", "cl_target_id"], directory) if int(target) in targets))
    db.execute("CREATE INDEX category_page ON categories(page)")
    for page, key, value in sql_rows("page_props", ["pp_page", "pp_propname", "pp_value"], directory):
        if key in (b"'wikibase_item'", b"'page_image_free'", b"'disambiguation'"):
            db.execute("INSERT INTO props VALUES (?,?,?)", (int(page), string(key), string(value)))
    db.executemany("INSERT INTO local_files VALUES (?)",
                   ((string(name),) for name, in sql_rows("image", ["img_name"], directory)))


def value(snak):
    return snak.get("datavalue", {}).get("value")


def index_wikidata(db, directory):
    wanted = {r[0] for r in db.execute("SELECT val FROM props WHERE key='wikibase_item'")}
    for line in entity_lines("wikidatawiki/entities/latest-all.json.bz2", directory):
        # The item header precedes claims; almost all unrelated entities lack a Japanese label.
        if b'"ja"' not in line:
            header = re.search(rb'"id"\s*:\s*"(Q\d+)"', line[:180])
            if header and header[1].decode() not in wanted:
                continue
        entity = json.loads(line)
        qid = entity["id"]
        label = entity.get("labels", {}).get("ja", {}).get("value")
        if label:
            db.execute("INSERT INTO labels VALUES (?,?)", (qid, label))
        if qid in wanted:
            for claim in entity.get("claims", {}).get("P31", []):
                target = value(claim["mainsnak"])
                if claim["rank"] != "deprecated" and isinstance(target, dict) and target.get("id"):
                    db.execute("INSERT INTO classes VALUES (?,?,?)",
                               (qid, target["id"], int(claim["rank"] == "preferred")))


LICENSES = {
    "Q6938433": "CC0", "Q20007257": "CC BY 4.0", "Q30942811": "CC BY 1.0",
    "Q18199165": "CC BY-SA 4.0", "Q14946043": "CC BY-SA 3.0", "Q19113751": "CC BY-SA 2.5",
}


def commons_image(name, claims):
    # Use a direct raster URL only when the original is within the existing 10 MiB input limit.
    if not name.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif")):
        return None
    def active(prop):
        return [claim for claim in claims.get(prop, []) if claim.get("rank") != "deprecated"]
    sizes = [value(c["mainsnak"]) for c in active("P3575")]
    if not sizes or not all(isinstance(s, dict) and s.get("unit", "").endswith("/Q8799")
                            and 0 < float(s["amount"]) <= 10 * 1024**2 for s in sizes):
        return None
    licenses = active("P275")
    if len(licenses) != 1 or licenses[0].get("qualifiers"):
        return None
    item = value(licenses[0]["mainsnak"])
    license_name = LICENSES.get(item.get("id")) if isinstance(item, dict) else None
    if not license_name:
        return None
    names = []
    for creator in active("P170"):
        qualifiers = creator.get("qualifiers", {})
        names_for_creator = [value(q) for q in qualifiers.get("P2093", []) or qualifiers.get("P4174", [])]
        if not names_for_creator or not all(isinstance(n, str) and n.strip() for n in names_for_creator):
            return None
        names.extend(names_for_creator)
    if not names and license_name != "CC0":
        return None
    digest = hashlib.md5(name.encode()).hexdigest()
    return {"url": f"https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{quote(name, safe='')}",
            "credit": "・".join([*dict.fromkeys(names), license_name]) + "（Wikimedia Commons）"}


# MediaInfo stores the file title beside the namespace and revision at the end of
# each entity. Avoid decoding all statements of millions of unrelated files.
# If the exporter changes this layout, fall back to parsing the whole entity.
FILE_HEADER = b',"ns":6,"title":'
FILE_TITLE = re.compile(rb'("(?:[^"\\]|\\.)*"),"lastrevid":')


def index_commons(db, directory):
    wanted = {r[0] for r in db.execute("SELECT val FROM props WHERE key='page_image_free' EXCEPT SELECT name FROM local_files")}
    for line in entity_lines("commonswiki/entities/latest-mediainfo.json.bz2", directory):
        offset = line.rfind(FILE_HEADER)
        if offset >= 0:
            match = FILE_TITLE.match(line, offset + len(FILE_HEADER))
            if match:
                title = json.loads(match[1])
                if title.removeprefix("File:").replace(" ", "_") not in wanted:
                    continue
        entity = json.loads(line)
        title = entity.get("title", "")
        if not title.startswith("File:"):
            continue
        name = title[5:].replace(" ", "_")
        if name in wanted:
            image = commons_image(name, entity.get("statements", {}))
            if image:
                db.execute("INSERT INTO images VALUES (?,?)", (name, json.dumps(image, ensure_ascii=False)))


def enrich(db, articles):
    local_files = {r[0] for r in db.execute("SELECT name FROM local_files")}
    with open(articles, encoding="utf-8") as rows:
        for row in rows:
            article = json.loads(row)
            pid = article["pageId"]
            props = dict(db.execute("SELECT key,val FROM props WHERE page=?", (pid,)))
            categories = [r[0] for r in db.execute("SELECT name FROM categories WHERE page=? ORDER BY name", (pid,))]
            genre = db.execute("""SELECT c.target,l.name FROM classes c JOIN labels l ON c.target=l.id
                                  WHERE c.id=? ORDER BY c.preferred DESC, cast(substr(c.target,2) as integer)
                                  LIMIT 1""", (props.get("wikibase_item"),)).fetchone()
            file = props.get("page_image_free")
            if file in local_files:
                file = None
            image = db.execute("SELECT metadata FROM images WHERE name=?", (file,)).fetchone()
            article["metadata"] = {"categories":categories, "isDisambiguation":"disambiguation" in props,
                                   "instanceOf":{"id":genre[0],"label":genre[1]} if genre else None,
                                   "image": json.loads(image[0]) if image else None}
            article["unresolvedImage"] = file if not image else None
            print(json.dumps(article, ensure_ascii=False))


if __name__ == "__main__":
    articles, index, directory = sys.argv[1:]
    with sqlite3.connect(index) as db:
        db.executescript("""
          PRAGMA journal_mode=OFF;
          PRAGMA synchronous=OFF;
          CREATE TABLE categories(page INTEGER,name TEXT);
          CREATE TABLE props(page INTEGER,key TEXT,val TEXT,PRIMARY KEY(page,key)) WITHOUT ROWID;
          CREATE TABLE classes(id TEXT,target TEXT,preferred INTEGER);
          CREATE INDEX class_item ON classes(id);
          CREATE TABLE labels(id TEXT PRIMARY KEY,name TEXT) WITHOUT ROWID;
          CREATE TABLE images(name TEXT PRIMARY KEY,metadata TEXT) WITHOUT ROWID;
          CREATE TABLE local_files(name TEXT PRIMARY KEY) WITHOUT ROWID;
        """)
        index_jawiki(db, directory)
        index_wikidata(db, directory)
        index_commons(db, directory)
        enrich(db, articles)
