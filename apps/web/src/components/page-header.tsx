import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { BalanceBadge } from "./balance-badge";

export function PageHeader({ title, back }: { title?: string; back?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-white/70 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-1">
        {back && (
          <Link to={back} className="-ml-2 rounded-full p-1 text-slate-500" aria-label="もどる">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        )}
        {title ? (
          <h1 className="truncate text-lg font-extrabold text-slate-800">{title}</h1>
        ) : (
          <span className="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-lg font-black text-transparent">
            Wiki Collection
          </span>
        )}
      </div>
      <BalanceBadge />
    </header>
  );
}
