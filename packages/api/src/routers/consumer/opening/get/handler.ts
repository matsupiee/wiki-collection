import { card, genre, pack, packOpening, userCard } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { OpeningGetInput, OpeningGetOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: OpeningGetInput;
  ctx: ProtectedContext;
}): Promise<OpeningGetOutput> {
  const [found] = await ctx.db
    .select({
      opening: packOpening,
      pack: { id: pack.id, slug: pack.slug, name: pack.name, colorHex: pack.colorHex },
    })
    .from(packOpening)
    .innerJoin(pack, eq(pack.id, packOpening.packId))
    .where(and(eq(packOpening.id, input.openingId), eq(packOpening.userId, ctx.session.user.id)));
  if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "開封の記録が見つかりません" });

  // 売却や還元で持ち主や状態が変わっていても、開封の結果としては表示する
  const cards = await ctx.db
    .select({
      userCardId: userCard.id,
      slot: userCard.slot,
      isNew: userCard.isNewOnAcquire,
      card: {
        id: card.id,
        title: card.title,
        summary: card.summary,
        imageUrl: card.imageUrl,
        rarity: card.rarity,
        monthlyPageviews: card.monthlyPageviews,
        genreName: genre.name,
        genreColorHex: genre.colorHex,
      },
    })
    .from(userCard)
    .innerJoin(card, eq(card.id, userCard.cardId))
    .innerJoin(genre, eq(genre.id, card.genreId))
    .where(eq(userCard.packOpeningId, found.opening.id))
    .orderBy(asc(userCard.slot));

  return {
    opening: {
      id: found.opening.id,
      createdAt: found.opening.createdAt.toISOString(),
      revealedAt: found.opening.revealedAt?.toISOString() ?? null,
    },
    pack: found.pack,
    cards: cards.map((c) => ({ ...c, slot: c.slot ?? 0 })),
  };
}
