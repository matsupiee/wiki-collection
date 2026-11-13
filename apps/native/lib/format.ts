import { t, locale } from "@/lib/i18n";
export const formatPt = (value: number) => `${value.toLocaleString(locale)}pt`;
export function formatClock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
export function formatDuration(ms: number): string {
  if (ms <= 0) return t("zeroSeconds");
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return t("daysHours", { days, hours });
  if (hours > 0) return t("hoursMinutes", { hours, minutes });
  if (minutes > 0) return t("minutesSeconds", { minutes, seconds });
  return t("seconds", { seconds });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
