import { Link } from "@tanstack/react-router";
import { BookOpen, Gift, Store, User } from "lucide-react";

const tabs = [
  { to: "/packs", label: "パック", icon: Gift },
  { to: "/collection", label: "コレクション", icon: BookOpen },
  { to: "/market", label: "マーケット", icon: Store },
  { to: "/me", label: "マイページ", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {tabs.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-slate-400"
          activeProps={{ className: "text-sky-600" }}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
