import { readStoredJson, writeStoredValue } from "../preferences/storage";
import { defaultSolidPaint, normalizePaint, paintToCss } from "../settings/paint/paintUtils";
import type { Paint } from "../settings/paint/types";

export type GlobalPaint = {
  id: string;
  name: string;
  paint: Paint;
};

export type OverlayAppearance = {
  activePaintId: string;
  opacity: number;
  paints: GlobalPaint[];
};

export const overlayAppearanceChangedEvent = "overlay-appearance-changed";
export const defaultGlobalPaint: GlobalPaint = {
  id: "global-paint-1",
  name: "1",
  paint: defaultSolidPaint,
};

export const defaultOverlayAppearance: OverlayAppearance = {
  activePaintId: defaultGlobalPaint.id,
  opacity: 1,
  paints: [defaultGlobalPaint],
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
  document.documentElement.style.setProperty("--ma-overlay-opacity", String(appearance.opacity));
  document.documentElement.style.setProperty("--ma-overlay-paint", paintToCss(getActiveOverlayPaint(appearance)));
}

export function getActiveOverlayPaint(appearance: OverlayAppearance): Paint {
  return (
    appearance.paints.find((paint) => paint.id === appearance.activePaintId)?.paint ??
    appearance.paints[0]?.paint ??
    defaultSolidPaint
  );
}

export function createGlobalPaint(paint: Paint = defaultSolidPaint, name?: string): GlobalPaint {
  return {
    id: createGlobalPaintId(),
    name: name ?? "",
    paint: normalizePaint(paint),
  };
}

function normalizeOverlayAppearance(appearance: Partial<OverlayAppearance>): OverlayAppearance {
  const paints = normalizeGlobalPaints(appearance.paints);
  const activePaintId =
    typeof appearance.activePaintId === "string" && paints.some((paint) => paint.id === appearance.activePaintId)
      ? appearance.activePaintId
      : paints[0].id;
  const opacity =
    typeof appearance.opacity === "number" && Number.isFinite(appearance.opacity)
      ? Math.min(1, Math.max(0, appearance.opacity))
      : defaultOverlayAppearance.opacity;

  return { activePaintId, opacity, paints };
}

function normalizeGlobalPaints(paints: GlobalPaint[] | undefined): GlobalPaint[] {
  const normalizedPaints =
    paints
      ?.filter((paint) => typeof paint?.id === "string")
      .map((paint, index) => ({
        id: paint.id,
        name: typeof paint.name === "string" && paint.name.trim() ? paint.name : String(index + 1),
        paint: normalizePaint(paint.paint),
      })) ?? [];

  return normalizedPaints.length > 0 ? normalizedPaints : defaultOverlayAppearance.paints;
}

function createGlobalPaintId() {
  return globalThis.crypto?.randomUUID?.() ?? `global-paint-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
