const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 日本時間の日付（YYYY-MM-DD）。毎日の無料枠は日本時間の 0 時に切り替わる
export function toJstDate(now: Date): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}
