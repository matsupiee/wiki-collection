import { createFileRoute, Link } from "@tanstack/react-router";
import { legalDocuments } from "@/lib/legal";
export const Route = createFileRoute("/")({ component: LegalIndex });
function LegalIndex() {
  return (
    <main className="space-y-6 p-6">
      <h1 className="text-xl font-extrabold">Wiki Collection 規約・法定表記</h1>
      <p>ゲームはネイティブアプリでご利用ください。</p>
      <nav aria-label="規約・法定表記">
        <ul className="space-y-4">
          {Object.entries(legalDocuments).map(([slug, document]) => (
            <li key={slug}>
              <Link to={`/legal/${slug}` as "/legal/terms"} className="text-sky-700 underline">
                {document.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
