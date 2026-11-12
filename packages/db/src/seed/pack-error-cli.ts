// 旧APIがSQLを返す状態を、実データに触れずにiOSで再現する確認用サーバー。
const packs = {
  freePack: { remaining: 10, limit: 10, nextRefillAt: null },
  packs: [
    {
      id: "basic",
      slug: "basic",
      name: "基本パック",
      type: "free_basic",
      description: "すべてのジャンルのカードが出る無料パック。",
      priceCoins: 0,
      colorHex: "#ff8800",
      genreName: null,
    },
  ],
};
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 43871,
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/auth/get-session") {
      return Response.json({
        session: { id: "fixture", userId: "fixture" },
        user: { id: "fixture", name: "しろう" },
      });
    }
    if (!pathname.startsWith("/api/trpc/")) return new Response(null, { status: 404 });
    const results = pathname
      .slice("/api/trpc/".length)
      .split(",")
      .map((path) => {
        if (path === "pack.list") return { result: { data: packs } };
        if (path === "coin.getBalance") return { result: { data: { total: 0 } } };
        return {
          error: {
            code: -32603,
            message: 'Failed query: insert into "free_pack_allowance" values (?)',
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
          },
        };
      });
    return Response.json(results);
  },
});
console.log(server.url.href);
