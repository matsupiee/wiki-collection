export const formatPt = (value: number) => `${value.toLocaleString("ja-JP")}pt`;
export const formatPrice = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100);
export function formatClock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0秒";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}日${hours}時間`;
  if (hours > 0) return `${hours}時間${minutes}分`;
  if (minutes > 0) return `${minutes}分${seconds}秒`;
  return `${seconds}秒`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
