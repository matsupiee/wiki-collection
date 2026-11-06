import { createFileRoute } from "@tanstack/react-router";

import { withApiCors } from "../../../lib/api-cors";
import { ENV } from "../../../env.server";

import { createAuth } from "../../../services";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      OPTIONS: ({ request }) =>
        withApiCors(request, ENV.BETTER_AUTH_URL, async () => new Response(null)),
      GET: async ({ request }) => {
        const auth = await createAuth();
        return withApiCors(request, ENV.BETTER_AUTH_URL, () => auth.handler(request));
      },
      POST: async ({ request }) => {
        const auth = await createAuth();
        return withApiCors(request, ENV.BETTER_AUTH_URL, () => auth.handler(request));
      },
    },
  },
});
