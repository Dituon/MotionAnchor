import { Button, Toolbar } from "@heroui/react";
import { Minus, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";

export function WindowTitleBar({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const minimizeWindow = () => getCurrentWindow().minimize().catch(console.error);
  const closeWindow = onClose ?? (() => getCurrentWindow().close().catch(console.error));

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
        onPress={minimizeWindow}
      >
        <Minus aria-hidden="true" />
      </Button>
      <Button
        isIconOnly
        aria-label={t("window.close")}
        size="sm"
        variant="ghost"
        onPress={closeWindow}
      >
        <X aria-hidden="true" />
      </Button>
    </Toolbar>
  );
}
