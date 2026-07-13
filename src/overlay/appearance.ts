import { readStoredJson, writeStoredValue } from "../preferences/storage";

export type OverlayAppearance = {
  color: string;
  customColors: string[];
  opacity: number;
};

export const overlayAppearanceChangedEvent = "overlay-appearance-changed";
export const defaultOverlayAppearance: OverlayAppearance = {
  color: "#4cd964",
  customColors: [],
  opacity: 1,
};

const storageKey = "motionAnchor.overlayAppearance";

export async function getOverlayAppearance(): Promise<OverlayAppearance> {
  const stored = await readStoredJson<Partial<OverlayAppearance>>(storageKey, {});

  return normalizeOverlayAppearance(stored);
}

export async function storeOverlayAppearance(appearance: OverlayAppearance) {
  const nextAppearance = normalizeOverlayAppearance(appearance);

  await writeStoredValue(storageKey, nextAppearance);
  return nextAppearance;
}

export function applyOverlayAppearance(appearance: OverlayAppearance) {
  document.documentElement.style.setProperty("--ma-overlay-color", appearance.color);
  document.documentElement.style.setProperty("--ma-overlay-opacity", String(appearance.opacity));
}

function normalizeOverlayAppearance(appearance: Partial<OverlayAppearance>): OverlayAppearance {
  const color = normalizeColor(appearance.color) || defaultOverlayAppearance.color;
  const customColors = uniqueColors(Array.isArray(appearance.customColors) ? appearance.customColors : []);
  const opacity =
    typeof appearance.opacity === "number" && Number.isFinite(appearance.opacity)
      ? Math.min(1, Math.max(0, appearance.opacity))
      : defaultOverlayAppearance.opacity;

  return { color, customColors, opacity };
}

export function normalizeColor(color: unknown) {
  const normalized = typeof color === "string" ? color.trim().toLowerCase() : "";

  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : "";
}

export function uniqueColors(colors: unknown[]) {
  const seen = new Set<string>();
  const normalizedColors: string[] = [];

  for (const color of colors) {
    const normalized = normalizeColor(color);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    normalizedColors.push(normalized);
  }

  return normalizedColors;
}
