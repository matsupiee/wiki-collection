import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/me/")({
  component: MyPage,
});

const menu = [
  { to: "/me/trades", label: "出品・入札の管理" },
  { to: "/me/wallet", label: "pt の履歴" },
  { to: "/me/openings", label: "開封履歴" },
  { to: "/legal/terms", label: "利用規約" },
  { to: "/legal/privacy", label: "プライバシーポリシー" },
  { to: "/legal/tokushoho", label: "特定商取引法に基づく表記" },
  { to: "/legal/payment-services", label: "資金決済法に基づく表示" },
] as const;

function MyPage() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <PageHeader title="マイページ" />
      <section className="mx-4 rounded-3xl bg-white/90 p-5 shadow-sm">
        <p className="text-lg font-black">{session.user.name}</p>
        <p className="text-xs text-slate-500">{session.user.email}</p>
      </section>
      <ul className="mx-4 mt-4 divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white/90 shadow-sm">
        {menu.map((m) => (
          <li key={m.to}>
            <Link
              to={m.to}
              className="flex items-center justify-between px-5 py-4 text-sm font-bold"
            >
              {m.label} <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mx-auto mt-6 block text-sm font-bold text-rose-500"
        onClick={() =>
          authClient.signOut({ fetchOptions: { onSuccess: () => navigate({ to: "/" }) } })
        }
      >
        ログアウト
      </button>
    </div>
  );
}
