export function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);

    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readStoredString(key: string) {
  return window.localStorage.getItem(key);
}

export function writeStoredValue(key: string, value: unknown) {
  window.localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
}
