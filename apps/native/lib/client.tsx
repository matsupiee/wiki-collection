import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@wiki-collection/api/routers/index";
import { useEffect, type PropsWithChildren } from "react";

export const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? "http://localhost:3001" : "")
).replace(/\/$/, "");
if (!apiUrl) throw new Error("EXPO_PUBLIC_API_URL を設定してください");
export const auth = createAuthClient({
  baseURL: apiUrl,
  plugins: [
    expoClient({
      scheme: "wiki-collection",
      storagePrefix: "wiki-collection",
      storage: SecureStore,
    }),
  ],
});
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiUrl}/api/trpc`,
      headers: async () => (Platform.OS === "web" ? {} : { cookie: await auth.getCookie() }),
      fetch: (url, options) =>
        fetch(url, { ...options, credentials: Platform.OS === "web" ? "include" : "omit" }),
    }),
  ],
});
export function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
