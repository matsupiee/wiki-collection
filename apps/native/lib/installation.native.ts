import { File, Paths } from "expo-file-system";
import { randomUUID, getRandomBytes } from "expo-crypto";
import * as SecureStore from "expo-secure-store";

// Keychain survives an iOS uninstall. The app container owns the namespace for this install.
const marker = new File(Paths.document, "auth-installation");
if (!marker.exists) marker.writeSync(randomUUID());
export const storagePrefix = "wiki-" + marker.textSync();
export function installationSecret() {
  const key = storagePrefix + ".secret";
  const existing = SecureStore.getItem(key);
  if (existing) return existing;
  const value = Array.from(getRandomBytes(32), (b) => b.toString(16).padStart(2, "0")).join("");
  SecureStore.setItem(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return value;
}
