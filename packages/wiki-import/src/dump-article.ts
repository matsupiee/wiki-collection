import path from "node:path";
import { z } from "zod";

export const dumpFile = path.resolve(import.meta.dirname, "../.cache/articles-ja.jsonl");
export const dumpArticleFields = z.object({
  pageId: z.number().int().positive(),
  title: z.string().min(1),
  revisionId: z.number().int().positive(),
  articleLength: z.number().int().nonnegative(),
});
export const metadataSchema = z.object({
  categories: z.array(z.string()),
  isDisambiguation: z.boolean(),
  instanceOf: z
    .object({ id: z.string().regex(/^Q[1-9]\d*$/), label: z.string().min(1) })
    .nullable(),
  image: z.object({ url: z.string(), credit: z.string().min(1) }).nullable(),
});
export const dumpArticleSchema = dumpArticleFields.extend({
  metadata: metadataSchema.optional(),
  summary: z.string(),
  monthlyPageviews: z.number().int().nonnegative(),
});
export type DumpArticle = z.infer<typeof dumpArticleSchema>;
