import { eq } from "drizzle-orm";
import { z } from "zod";
import { appVersion, mobilePlatform, needsUpdate } from "@wiki-collection/db/app-version";
import { appUpdatePolicy } from "@wiki-collection/db/schema/index";
import { publicProcedure } from "../index";

export const appUpdate = publicProcedure
  .input(z.object({ platform: mobilePlatform, version: appVersion }))
  .query(async ({ ctx, input }) => {
    const [policy] = await ctx.db
      .select()
      .from(appUpdatePolicy)
      .where(eq(appUpdatePolicy.platform, input.platform));
    return { required: policy ? needsUpdate(input.version, policy.minimumVersion) : false };
  });
