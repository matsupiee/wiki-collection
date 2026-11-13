import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";

export const getPreferredLocales = () => getLocales().map((locale) => locale.languageTag);
export const readPreference = (key: string) => SecureStore.getItem(key);
export const writePreference = (key: string, value: string) => SecureStore.setItem(key, value);
