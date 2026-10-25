const MIN_EXTRACT_LENGTH = 30;

// カードにしない記事の理由を返す。カードにしてよい記事は null。
// 取り込みは人の確認をはさまないので、トラブルになりやすい記事やカードにしにくい記事をここで外す。
// 外し漏れたカードは、あとから card.isActive を false にして止める
export function getExclusionReason(page: {
  title: string;
  categories: string[];
  isDisambiguation: boolean;
  // 要約を取る前に判定するときは undefined
  extract?: string;
}): string | null {
  if (page.isDisambiguation || page.categories.includes("曖昧さ回避")) return "曖昧さ回避";
  if (page.title.includes("一覧")) return "一覧記事";
  // 被害者のいる出来事をレアリティ付きのカードにしない
  if (page.categories.some((c) => /事件|事故|テロ|殺人|災害/.test(c))) return "事件・事故";
  if (page.extract !== undefined && page.extract.length < MIN_EXTRACT_LENGTH) return "要約が短い";
  return null;
}
