import { isTauri } from "@tauri-apps/api/core";
import { load, type Store } from "@tauri-apps/plugin-store";

const settingsStorePath = "settings.json";
const settingsStoreAutoSaveMs = 300;

let settingsStorePromise: Promise<Store> | null = null;

function getSettingsStore() {
  settingsStorePromise ??= load(settingsStorePath, {
    autoSave: settingsStoreAutoSaveMs,
    defaults: {},
  });
  return settingsStorePromise;
}

export async function readStoredJson<T>(key: string, fallback: T): Promise<T> {
  return readStoredValue(key, fallback, (value): value is T => value !== undefined);
}

export async function readStoredString(key: string) {
  return readStoredValue<string | null>(key, null, (value): value is string => typeof value === "string");
}

export async function writeStoredValue(key: string, value: unknown) {
  if (!isTauri()) {
    return;
  }

  const store = await getSettingsStore();
  await store.set(key, value);
}

async function readStoredValue<T>(
  key: string,
  fallback: T,
  isStoredValue: (value: unknown) => value is T,
): Promise<T> {
  if (!isTauri()) {
    return fallback;
  }

  try {
    const store = await getSettingsStore();
    const stored = await store.get<unknown>(key);

    if (isStoredValue(stored)) {
      return stored;
    }

    return fallback;
  } catch {
    return fallback;
  }
}
