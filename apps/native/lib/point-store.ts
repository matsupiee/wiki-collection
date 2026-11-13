import { requireOptionalNativeModule } from "expo";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { client, queryClient } from "./client";

interface Store {
  addListener(event: "updated", listener: () => void): { remove(): void };
  prices(ids: string[]): Promise<Record<string, string>>;
  buy(id: string, token: string): Promise<string>;
  unfinished(token: string): Promise<string[]>;
  finish(receipt: string): Promise<void>;
}
export const ios = Platform.OS === "ios";
export const store = ios ? requireOptionalNativeModule<Store>("PointStore") : null;

export async function deliver(receipt: string) {
  const purchase = await client.shop.purchase.mutate({ receipt });
  await store!.finish(receipt);
  await queryClient.invalidateQueries();
  return purchase.coins;
}

export function usePointCatalog(userId?: string, enabled = true) {
  return useQuery({
    queryKey: ["point-catalog", userId],
    queryFn: () => client.shop.listProducts.query(),
    enabled: enabled && !!userId,
  });
}

export function StoreRecovery({ userId }: { userId: string }) {
  const catalog = usePointCatalog(userId, !!store);
  const token = catalog.data?.storeEnabled && catalog.data.accountToken;
  useEffect(() => {
    if (!store || !token) return;
    let active = true;
    const recover = async () => {
      for (const receipt of await store!.unfinished(token)) {
        if (!active) break;
        await deliver(receipt).catch(() => {});
      }
    };
    // A failed delivery stays in StoreKit until the API is reachable again.
    const retry = () => void recover().catch(() => {});
    const listener = store.addListener("updated", retry);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") retry();
    });
    retry();
    const timer = setInterval(retry, 60000);
    return () => {
      active = false;
      clearInterval(timer);
      listener.remove();
      foreground.remove();
    };
  }, [token]);
  return null;
}
