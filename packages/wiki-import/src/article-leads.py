"""Stream article metadata and introductory wikitext from a MediaWiki XML dump."""
import bz2
import json
import re
import sys
import xml.etree.ElementTree as ET

heading = re.compile(r"^={1,6}[^\n]+?=+[ \t]*$", re.MULTILINE)
with bz2.open(sys.argv[1]) as source:
    events = ET.iterparse(source, events=("start", "end"))
    _, root = next(events)
    for event, page in events:
        if event != "end" or page.tag.rsplit("}", 1)[-1] != "page":
            continue
        if page.findtext("{*}ns") == "0" and page.find("{*}redirect") is None:
            revision = page.find("{*}revision")
            text = revision.find("{*}text")
            body = (text.text or "") if text is not None else ""
            section = heading.search(body)
            print(json.dumps({
                "pageId": int(page.findtext("{*}id")),
                "title": page.findtext("{*}title"),
                "revisionId": int(revision.findtext("{*}id")),
                "articleLength": int(text.get("bytes")) if text is not None and text.get("bytes") else len(body.encode()),
                "lead": body[:section.start()] if section else body,
            }, ensure_ascii=False))
        root.clear()
