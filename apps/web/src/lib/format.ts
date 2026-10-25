import type { Rarity } from "@wiki-collection/db/enums";

export const rarityLabels: Record<Rarity, string> = {
  common: "コモン",
  uncommon: "アンコモン",
  rare: "レア",
  double_rare: "ダブルレア",
  legendary: "レジェンド",
};

export const rarityRank: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  double_rare: 3,
  legendary: 4,
};

export function formatPt(value: number): string {
  return `${value.toLocaleString("ja-JP")}pt`;
}

export function formatPageviews(value: number): string {
  if (value >= 10000)
    return `${(value / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万`;
  return value.toLocaleString("ja-JP");
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

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}
