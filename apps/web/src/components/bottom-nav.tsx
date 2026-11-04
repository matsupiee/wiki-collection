import { Link } from "@tanstack/react-router";
import { BookOpen, Gift, Store, User } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const tabs = [
  { to: "/packs", label: "パック", icon: Gift },
  { to: "/collection", label: "コレクション", icon: BookOpen },
  { to: "/market", label: "マーケット", icon: Store },
  { to: "/me", label: "マイページ", icon: User },
] as const;

export function BottomNav() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // 本文のコンテナやカードの変形・重なりから切り離し、画面下端に固定する。
  return createPortal(
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-40 h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid h-full max-w-md grid-cols-4">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors"
            activeOptions={{ exact: false, includeSearch: false }}
            activeProps={{ className: "bg-sky-50 text-sky-700" }}
            inactiveProps={{ className: "text-slate-500 hover:bg-slate-50 hover:text-slate-700" }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>,
    document.body,
  );
}
