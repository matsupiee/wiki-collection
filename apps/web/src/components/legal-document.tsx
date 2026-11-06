import { createElement } from "react";
import { legalDocuments, type LegalBlock } from "@wiki-collection/ui/lib/legal";
import { LegalPage } from "./legal-page";
function render(block: LegalBlock, index: number): React.ReactNode {
  return createElement(block.tag, { key: index }, block.text ?? block.children?.map(render));
}
export function LegalDocument({ document }: { document: keyof typeof legalDocuments }) {
  const page = legalDocuments[document];
  return (
    <LegalPage title={page.title} updatedAt={page.updatedAt}>
      {page.blocks.map(render)}
    </LegalPage>
  );
}
