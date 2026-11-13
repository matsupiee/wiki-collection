export const getPreferredLocales = () => globalThis.navigator?.languages ?? [];
export const readPreference = (key: string) => globalThis.localStorage?.getItem(key);
export const writePreference = (key: string, value: string) => globalThis.localStorage.setItem(key, value);
