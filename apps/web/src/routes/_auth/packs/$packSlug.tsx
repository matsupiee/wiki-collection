import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/packs/$packSlug")({
  beforeLoad: () => {
    throw redirect({ to: "/packs", replace: true });
  },
});
