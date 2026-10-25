import { genre, pack } from "@wiki-collection/db/schema/index";
import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { getFreePackStatus } from "../../../../shared/pack/get-free-pack-status";
import type { PackListOutput } from "./route";

export async function handler({ ctx }: { ctx: ProtectedContext }): Promise<PackListOutput> {
  const now = new Date();
  const [packs, freePack] = await Promise.all([
    ctx.db
      .select({
        id: pack.id,
        slug: pack.slug,
        name: pack.name,
        description: pack.description,
        type: pack.type,
        priceCoins: pack.priceCoins,
        colorHex: pack.colorHex,
        genreName: genre.name,
      })
      .from(pack)
      .leftJoin(genre, eq(genre.id, pack.genreId))
      .where(
        and(
          eq(pack.isActive, true),
          or(isNull(pack.startsAt), lte(pack.startsAt, now)),
          or(isNull(pack.endsAt), gt(pack.endsAt, now)),
        ),
      )
      .orderBy(asc(pack.sortOrder)),
    getFreePackStatus(ctx.db, ctx.session.user.id, now),
  ]);
  return {
    packs,
    freePack: { ...freePack, dailyResetsAt: freePack.dailyResetsAt.toISOString() },
  };
}
