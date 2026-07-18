import { Button, Toolbar } from "@heroui/react";
import { Minus, X } from "lucide-react";
import type { ReactNode } from "react";

export type WindowTitleBarControls = {
  onClose: () => void;
  onMinimize: () => void;
};

export function WindowTitleBar({
  controls,
  leadingContent,
}: {
  controls?: WindowTitleBarControls;
  leadingContent?: ReactNode;
}) {
  return (
    <Toolbar className="h-10 w-full shrink-0 justify-between gap-2 bg-background px-2" data-tauri-drag-region>
      <div className="flex min-w-0 flex-1 items-center gap-2">{leadingContent}</div>
      <div className="flex shrink-0 items-center gap-1">
        <Button isIconOnly size="sm" variant="ghost" onPress={() => controls?.onMinimize()}>
          <Minus aria-hidden="true" />
        </Button>
        <Button isIconOnly size="sm" variant="ghost" onPress={() => controls?.onClose()}>
          <X aria-hidden="true" />
        </Button>
      </div>
    </Toolbar>
  );
}
