// Expo Web の開発サーバーだけを追加する。本番では別オリジンのブラウザーを許可しない。
export function browserOrigins(baseURL: string): string[] {
  const base = new URL(baseURL);
  return [
    base.origin,
    ...(["localhost", "127.0.0.1"].includes(base.hostname)
      ? [
          "http://localhost:8081",
          "http://127.0.0.1:8081",
          "http://localhost:8082",
          "http://127.0.0.1:8082",
        ]
      : []),
  ];
}
