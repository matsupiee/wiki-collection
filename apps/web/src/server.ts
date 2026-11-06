import handler from "@tanstack/react-start/server-entry";
import { createDb } from "@wiki-collection/db";
import { runDailyBattles } from "@wiki-collection/api/shared/battle/run-daily-battles";
import type { WebEnv } from "@wiki-collection/infra/alchemy.run";

export default {
  fetch: handler.fetch,
  async scheduled(controller: ScheduledController, env: WebEnv) {
    const day = await runDailyBattles(createDb(env), new Date(controller.scheduledTime));
    console.log(
      JSON.stringify({
        event: "daily-battles-completed",
        date: day.date,
        teams: day.ranking.length,
      }),
    );
  },
};
