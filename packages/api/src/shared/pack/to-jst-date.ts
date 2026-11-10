const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 日本時間の日付（YYYY-MM-DD）
export function toJstDate(now: Date): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}
