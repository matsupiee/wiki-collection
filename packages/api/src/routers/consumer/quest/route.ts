import z from "zod";
import { protectedProcedure, router } from "../../../index";
import { listQuests } from "@wiki-collection/db/quests/rewards";
export const questRouter = router({
  list: protectedProcedure
    .output(
      z.object({
        quests: z.array(
          z.object({
            id: z.string(),
            group: z.string(),
            metric: z.string(),
            target: z.number(),
            reward: z.number(),
            progress: z.number(),
            completedAt: z.string().nullable(),
          }),
        ),
      }),
    )
    .query(async ({ ctx }) => ({ quests: await listQuests(ctx.db, ctx.session.user.id) })),
});
