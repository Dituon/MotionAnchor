import { Chip } from "@heroui/react";
import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";

export function OverlayVisibilityChip({
  isBusy,
  isVisible,
  onToggle,
}: {
  isBusy: boolean;
  isVisible: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      aria-pressed={isVisible}
      className="min-w-0 rounded-full outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-wait disabled:opacity-60"
      disabled={isBusy}
      type="button"
      onClick={onToggle}
    >
      <Chip color={isVisible ? "success" : "default"} size="sm" variant={isVisible ? "primary" : "secondary"}>
        <Layers aria-hidden="true" className="size-3.5" />
        <Chip.Label className="truncate">
          {isVisible ? t("settings.overlayEnabled") : t("settings.overlayDisabled")}
        </Chip.Label>
      </Chip>
    </button>
  );
}
