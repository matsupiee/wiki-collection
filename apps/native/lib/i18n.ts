import { I18n } from "i18n-js";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import { useSyncExternalStore } from "react";
import { getPreferredLocales, readPreference, writePreference } from "./preferred-locales";

export function resolveLocale(preferences: readonly string[]) {
  return preferences.find((tag) => /^(ja|en)(-|$)/i.test(tag)) ?? "ja";
}

export type LanguagePreference = "system" | "ja" | "en";
const storageKey = "wiki-collection.display-language";

function readLanguage(): LanguagePreference {
  try {
    const value = readPreference(storageKey);
    if (value === "ja" || value === "en") return value;
  } catch {
    // Storage can be unavailable before the device is unlocked.
  }
  return "system";
}

let preference = readLanguage();
function selectedLocale() {
  const locales = getPreferredLocales();
  return preference === "system"
    ? resolveLocale(locales)
    : (locales.find((tag) => tag.split("-")[0] === preference) ?? preference);
}

export let locale = selectedLocale();
const i18n = new I18n({ ja, en }, { locale, defaultLocale: "ja", enableFallback: true });

export type MessageKey = keyof typeof ja;

export function t(key: MessageKey, values?: Record<string, string | number>) {
  return i18n.t(key, values);
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLanguagePreference() {
  return useSyncExternalStore(
    subscribe,
    () => preference,
    () => "system" as const,
  );
}

export function useTranslation() {
  useSyncExternalStore(
    subscribe,
    () => locale,
    () => "ja",
  );
  return t;
}

export function setLanguagePreference(next: LanguagePreference) {
  writePreference(storageKey, next);
  preference = next;
  locale = selectedLocale();
  i18n.locale = locale;
  for (const listener of listeners) listener();
}
