import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import "varlock/auto-load";

export const db = Cloudflare.D1.Database("database", {
  migrations: "../../packages/db/src/migrations",
});

export const cardImages = Cloudflare.R2.Bucket("card-images", {});

export const web = Cloudflare.Website.Vite("web", {
  rootDir: "../../apps/web",
  main: "src/server.ts",
  observability: { enabled: true, traces: { enabled: true } },
  compatibility: {
    flags: ["nodejs_compat", "global_fetch_strictly_public"],
  },
  env: {
    DB: db,
    CARD_IMAGES: cardImages,
    IMAGES: Cloudflare.Images.Images("IMAGES"),
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: Cloudflare.Worker.URL,
  },
});

export type WebEnv = Cloudflare.InferEnv<typeof web>;

export default Alchemy.Stack(
  "wiki-collection",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const webWorker = yield* web;
    const imageBucket = yield* cardImages;

    return {
      web: webWorker.url,
      cardImagesBucket: imageBucket.bucketName,
    };
  }),
);
