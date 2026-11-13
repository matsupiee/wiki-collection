export const storagePrefix = "wiki-collection-web";
export function installationSecret() {
  const existing = localStorage.getItem(storagePrefix);
  if (existing) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(storagePrefix, value);
  return value;
}
