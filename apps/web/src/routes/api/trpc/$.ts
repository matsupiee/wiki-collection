import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@wiki-collection/api/routers/index";

import { withApiCors } from "../../../lib/api-cors";
import { ENV } from "../../../env.server";

import { createContext } from "../../../context";

function handler({ request }: { request: Request }) {
  return withApiCors(request, ENV.BETTER_AUTH_URL, () =>
    fetchRequestHandler({
      req: request,
      router: appRouter,
      createContext,
      endpoint: "/api/trpc",
    }),
  );
}

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      OPTIONS: handler,
      GET: handler,
      POST: handler,
    },
  },
});
