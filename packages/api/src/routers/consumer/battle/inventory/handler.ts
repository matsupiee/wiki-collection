import { and, asc, eq } from "drizzle-orm";
import { elementOf } from "@wiki-collection/db/battle";
import { card, genre, userCard } from "@wiki-collection/db/schema/index";
import { notInTeam } from "../../../../shared/card/not-in-team";
import type { ProtectedContext } from "../../../../context";

export async function handler({ ctx }: { ctx: ProtectedContext }) {
  const rows = await ctx.db
    .select({
      copy: userCard,
      card,
      genreSlug: genre.slug,
      available: notInTeam().mapWith(Boolean),
    })
    .from(userCard)
    .innerJoin(card, eq(card.id, userCard.cardId))
    .innerJoin(genre, eq(genre.id, card.genreId))
    .where(and(eq(userCard.userId, ctx.session.user.id), eq(userCard.status, "owned")))
    .orderBy(asc(userCard.createdAt), asc(userCard.id));
  return rows.map(({ copy, card: c, genreSlug, available }) => ({
    id: copy.id,
    cardId: c.id,
    title: c.title,
    imageUrl: c.imageUrl,
    attack: c.monthlyPageviews + copy.attackBonus,
    defense: c.articleLength === null ? null : c.articleLength + copy.defenseBonus,
    baseAttack: c.monthlyPageviews,
    baseDefense: c.articleLength,
    attackBonus: copy.attackBonus,
    defenseBonus: copy.defenseBonus,
    element: elementOf(genreSlug),
    inTeam: !available,
  }));
}
