import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@wiki-collection/api/routers/index";
import { publicErrorReason } from "@wiki-collection/api/public-error";
import { t } from "./i18n";

export function errorReason(error: unknown): ReturnType<typeof publicErrorReason> {
  if (error instanceof TRPCClientError) {
    const data = (error as TRPCClientError<AppRouter>).data;
    if (data?.reason) return data.reason;
  }
  const message =
    error && typeof error === "object" && "message" in error ? error.message : undefined;
  return publicErrorReason(message);
}

export function errorMessage(error: unknown, fallback = t("operationFailed")) {
  const reason = errorReason(error);
  if (reason.key === "operationFailed") return fallback;
  return reason.key === "minimumBid" ? t(reason.key, { amount: reason.amount }) : t(reason.key);
}
