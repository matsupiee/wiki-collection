import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@wiki-collection/ui/components/button";

import { PackArt } from "@/components/pack-art";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (await getUser()) throw redirect({ to: "/packs" });
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="relative flex h-64 items-end justify-center">
        <PackArt name="歴史" colorHex="#b45309" className="-mr-10 w-28 -rotate-12 opacity-90" />
        <PackArt name="基本パック" colorHex="#7c3aed" className="z-10 w-40" label="無料" />
        <PackArt name="宇宙" colorHex="#4f46e5" className="-ml-10 w-28 rotate-12 opacity-90" />
      </div>
      <div className="space-y-3">
        <h1 className="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-4xl font-black text-transparent">
          Wiki Collection
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Wikipedia の記事がカードになった。
          <br />
          よく読まれている記事ほどレア。パックを開けて集めよう。
        </p>
        <p className="text-xs font-bold text-violet-600">
          登録すると無料パックを 20 パック開けられる
        </p>
      </div>
      <Link to="/login" className="w-full">
        <Button className="h-12 w-full rounded-full bg-sky-500 text-base font-extrabold text-white shadow-lg hover:bg-sky-600">
          はじめる
        </Button>
      </Link>
      <footer className="flex gap-4 text-xs text-slate-400">
        <Link to="/legal/terms">利用規約</Link>
        <Link to="/legal/privacy">プライバシーポリシー</Link>
        <Link to="/legal/tokushoho">特定商取引法に基づく表記</Link>
      </footer>
    </main>
  );
}
