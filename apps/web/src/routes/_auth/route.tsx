import { Outlet, createFileRoute, redirect, useLocation } from "@tanstack/react-router";

import { BottomNav } from "@/components/bottom-nav";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await getUser();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

function AuthLayout() {
  const { pathname } = useLocation();
  // 開封の演出中は全画面にするため、タブを隠す
  const immersive = /^\/openings\/[^/]+$/.test(pathname);
  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      {!immersive && <BottomNav />}
    </div>
  );
}
