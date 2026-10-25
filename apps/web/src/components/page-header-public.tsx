import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

// ログインしていなくても表示するページ用のヘッダー。残高は出さない
export function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 bg-white/70 px-4 backdrop-blur">
      <button
        type="button"
        onClick={() => router.history.back()}
        className="-ml-2 rounded-full p-1 text-slate-500"
        aria-label="もどる"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <h1 className="truncate text-lg font-extrabold text-slate-800">{title}</h1>
    </header>
  );
}
