import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
export const getRouter = () =>
  createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: () => (
      <main className="p-6">
        <h1>ページが見つかりません</h1>
        <a href="/">規約・法定表記へ</a>
      </main>
    ),
  });
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
