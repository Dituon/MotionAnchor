import { Button, Toolbar } from "@heroui/react";
import { Minus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export type WindowTitleBarControls = {
  onClose: () => void;
  onMinimize: () => void;
};

export function WindowTitleBar({ controls }: { controls: WindowTitleBarControls }) {
  const { t } = useTranslation();

  return (
    <Toolbar
      aria-label={t("window.controls")}
      className="h-10 w-full shrink-0 justify-end bg-background px-1"
      data-tauri-drag-region
    >
      <Button
        isIconOnly
        aria-label={t("window.minimize")}
        size="sm"
        variant="ghost"
        onPress={controls.onMinimize}
      >
        <Minus aria-hidden="true" />
      </Button>
      <Button
        isIconOnly
        aria-label={t("window.close")}
        size="sm"
        variant="ghost"
        onPress={controls.onClose}
      >
        <X aria-hidden="true" />
      </Button>
    </Toolbar>
  );
}
