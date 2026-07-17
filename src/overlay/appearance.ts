import { readStoredJson, writeStoredValue } from "../preferences/storage";
import { defaultSolidPaint, normalizePaint, paintToCss } from "../settings/paint/paintUtils";
import type { Paint } from "../settings/paint/types";
import { defaultGlobalPaints } from "./globalPaintPresets";

export type GlobalPaint = {
  id: string;
  paint: Paint;
};

export type OverlayAppearance = {
  activePaintId: string;
  opacity: number;
  paints: GlobalPaint[];
};

export const overlayAppearanceChangedEvent = "overlay-appearance-changed";
export const defaultGlobalPaint: GlobalPaint = defaultGlobalPaints[0];

export const defaultOverlayAppearance: OverlayAppearance = {
  activePaintId: defaultGlobalPaint.id,
  opacity: 1,
  paints: defaultGlobalPaints,
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

export function createGlobalPaint(id: string, paint: Paint = defaultSolidPaint): GlobalPaint {
  return {
    id: normalizeGlobalPaintId(id) ?? "1",
    paint: normalizePaint(paint),
  };
}

export function getNextGlobalPaintId(paints: GlobalPaint[]): string {
  const maxId = paints.reduce((max, paint) => {
    const normalizedId = normalizeGlobalPaintId(paint.id);
    const numericId = normalizedId ? Number(normalizedId) : 0;

    return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
  }, 0);

  return String(maxId + 1);
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
      ?.filter((paint) => isNumericString(paint.id))
      .map((paint) => ({
        id: paint.id,
        paint: normalizePaint(paint.paint),
      })) ?? [];

  return normalizedPaints.length > 0 ? normalizedPaints : defaultGlobalPaints;
}

function normalizeGlobalPaintId(id: unknown) {
  const trimmedId = typeof id === "string" ? id.trim() : "";

  return isNumericString(trimmedId) ? String(Number(trimmedId)) : null;
}

function isNumericString(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";

  return /^\d+$/.test(text) && Number(text) > 0;
}
