import { Link } from "@tanstack/react-router";
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="mb-4 bg-white/90 px-4 py-4">
      <Link to="/" className="text-sm text-sky-700 underline">
        規約・法定表記一覧
      </Link>
      <h1 className="mt-2 text-lg font-extrabold text-slate-800">{title}</h1>
    </header>
  );
}
