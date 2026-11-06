import { openBrowserAsync } from "expo-web-browser";
import { apiUrl } from "./client";
export type LegalPath = `/legal/${"terms" | "privacy" | "tokushoho" | "payment-services"}`;
// 本文はWebで管理し、OS標準のアプリ内ブラウザで表示する。
export async function openLegalPage(path: LegalPath) {
  await openBrowserAsync(new URL(path, apiUrl).toString());
}
