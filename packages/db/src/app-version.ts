import { z } from "zod";

export const mobilePlatform = z.enum(["ios", "android"]);
export const appVersion = z.string().regex(/^\d{1,9}(\.\d{1,9}){0,2}$/);

export function needsUpdate(installed: string, minimum: string) {
  const current = appVersion.parse(installed).split(".").map(Number);
  const required = appVersion.parse(minimum).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const difference = (current[i] ?? 0) - (required[i] ?? 0);
    if (difference !== 0) return difference < 0;
  }
  return false;
}
