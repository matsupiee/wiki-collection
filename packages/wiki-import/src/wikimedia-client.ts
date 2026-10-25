// Wikimedia の API を呼ぶクライアント。fetch しか使わないので、bun のコマンドからも Workers からも使える。
// User-Agent はポリシー（https://meta.wikimedia.org/wiki/User-Agent_policy）に沿って、アプリ名と連絡先にリポジトリの URL を入れる
export const USER_AGENT = "wiki-collection/0.1 (+https://github.com/matsupiee/wiki-collection)";

export type WikimediaClient = {
  // 404 は null を返す。閲覧数のない記事などで起きるため
  getJson<T>(url: string): Promise<T | null>;
};

type Options = {
  fetch?: typeof fetch;
  // 同時に投げるリクエストの数。Wikimedia に負荷をかけないよう少なくする
  concurrency?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
};

export function createWikimediaClient(options: Options = {}): WikimediaClient {
  const doFetch = options.fetch ?? fetch;
  const concurrency = options.concurrency ?? 3;
  const maxRetries = options.maxRetries ?? 4;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  let running = 0;
  const waiting: (() => void)[] = [];
  async function acquire() {
    if (running < concurrency) {
      running++;
      return;
    }
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  function release() {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }

  async function request<T>(url: string): Promise<T | null> {
    for (let attempt = 0; ; attempt++) {
      const res = await doFetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.status === 404) return null;
      // Action API は maxlag を超えると 200 のまま error.code = "maxlag" を返す
      const body = res.ok ? ((await res.json()) as T & { error?: { code?: string } }) : null;
      const retryable = res.status === 429 || res.status >= 500 || body?.error?.code === "maxlag";
      if (!retryable) {
        if (!res.ok) throw new Error(`Wikimedia API が ${res.status} を返しました: ${url}`);
        if (body?.error) throw new Error(`Wikimedia API のエラー ${body.error.code}: ${url}`);
        return body;
      }
      if (attempt >= maxRetries) {
        throw new Error(`Wikimedia API の再試行が上限に達しました（${res.status}）: ${url}`);
      }
      const retryAfter = Number(res.headers.get("Retry-After"));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
    }
  }

  return {
    async getJson<T>(url: string) {
      await acquire();
      try {
        return await request<T>(url);
      } finally {
        release();
      }
    },
  };
}
