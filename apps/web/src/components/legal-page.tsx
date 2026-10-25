import type { ReactNode } from "react";

import { PageHeader } from "./page-header-public";

// 規約類のページの共通レイアウト。［］の部分は運営者の情報が決まり次第埋める
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="pb-12">
      <PageHeader title={title} />
      <article className="mx-4 space-y-5 rounded-3xl bg-white/90 p-6 text-sm leading-relaxed text-slate-700 shadow-sm [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-extrabold [&_h2]:text-slate-800 [&_li]:ml-5 [&_li]:list-disc [&_table]:w-full [&_td]:border-t [&_td]:border-slate-100 [&_td]:py-2 [&_td]:align-top [&_th]:w-32 [&_th]:border-t [&_th]:border-slate-100 [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_th]:align-top">
        {children}
        <p className="text-xs text-slate-400">最終更新日: {updatedAt}</p>
      </article>
    </div>
  );
}
