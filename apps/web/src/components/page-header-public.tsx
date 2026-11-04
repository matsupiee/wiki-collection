import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

// ログインしていなくても表示するページ用のヘッダー。残高は出さない
export function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="full-bleed sticky top-0 z-30 mb-4 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center gap-1 px-4">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="-ml-2 rounded-full p-1 text-slate-500"
          aria-label="もどる"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="truncate text-lg font-extrabold text-slate-800">{title}</h1>
      </div>
    </header>
  );
}
