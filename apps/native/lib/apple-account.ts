import { useQuery } from "@tanstack/react-query";
import { auth } from "./client";

export function useAppleStatus(userId?: string) {
  return useQuery({
    queryKey: ["apple-account", userId],
    enabled: !!userId,
    queryFn: async () => {
      const result = await auth.$fetch<{ linked: boolean }>("/installation/status");
      if (!result.data) throw new Error("Account status unavailable");
      return result.data.linked;
    },
  });
}
