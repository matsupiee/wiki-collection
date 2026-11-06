import { createFileRoute } from "@tanstack/react-router";
import { serveCardImage } from "@wiki-collection/api/shared/card/serve-image";
import { ENV } from "@/env.server";

const handler = ({ request }: { request: Request }) => serveCardImage(request, ENV.CARD_IMAGES);
export const Route = createFileRoute("/api/card-images")({
  server: { handlers: { GET: handler, HEAD: handler } },
});
