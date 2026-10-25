import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@wiki-collection/api/routers/index";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();
