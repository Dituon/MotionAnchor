export function numberSetting(settings: Record<string, unknown>, key: string, fallback: number) {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function lengthSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: number,
  fallbackUnit = "px",
) {
  const value = settings[key];

  if (typeof value === "object" && value !== null && "value" in value && "unit" in value) {
    const candidate = value as { value?: unknown; unit?: unknown };

    if (typeof candidate.value === "number" && Number.isFinite(candidate.value) && isLengthUnit(candidate.unit)) {
      return `${candidate.value}${candidate.unit}`;
    }
  }

  return `${fallback}${fallbackUnit}`;
}

export function stringSetting(settings: Record<string, unknown>, key: string, fallback: string) {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

export function colorSetting(settings: Record<string, unknown>, key: string) {
  const value = stringSetting(settings, key, "").trim();
  return value || "var(--ma-overlay-color)";
}

export function canvasColorSetting(settings: Record<string, unknown>, key: string) {
  const value = stringSetting(settings, key, "").trim();

  return (
    value ||
    getComputedStyle(document.documentElement).getPropertyValue("--ma-overlay-color").trim() ||
    "#4cd964"
  );
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function isLengthUnit(value: unknown) {
  return value === "%" || value === "px";
}
