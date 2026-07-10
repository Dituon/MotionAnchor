import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Kbd } from "@heroui/react";
import { Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ShortcutKeys } from "./ShortcutKeys";

const modifierCodes = new Set([
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
  "ShiftLeft",
  "ShiftRight",
]);

function shortcutFromEvent(event: ReactKeyboardEvent, includeKey: boolean) {
  const parts = [
    event.ctrlKey && "control",
    event.altKey && "alt",
    event.shiftKey && "shift",
    event.metaKey && "super",
    includeKey && event.code,
  ].filter(Boolean);

  return parts.join("+");
}

export function ShortcutRecorder({
  onCancel,
  onRecord,
}: {
  onCancel: () => void;
  onRecord: (shortcut: string) => void;
}) {
  const { t } = useTranslation();
  const recorderRef = useRef<HTMLDivElement>(null);
  const pendingShortcutRef = useRef<{ code: string; value: string } | null>(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    recorderRef.current?.focus();
  }, []);

  return (
    <div
      ref={recorderRef}
      aria-label={t("shortcuts.recordTitle")}
      className="flex min-h-9 items-center gap-2 rounded-sm bg-surface-secondary px-3 text-sm text-muted outline-none ring-2 ring-accent"
      role="textbox"
      tabIndex={0}
      onBlur={onCancel}
      onKeyDown={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (event.repeat) {
          return;
        }

        if (event.code === "Escape" && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
          onCancel();
          return;
        }

        const isModifier = modifierCodes.has(event.code);
        const shortcut = shortcutFromEvent(event, !isModifier);
        setPreview(shortcut);

        if (!isModifier) {
          pendingShortcutRef.current = { code: event.code, value: shortcut };
        }
      }}
      onKeyUp={(event) => {
        event.preventDefault();
        event.stopPropagation();

        const pendingShortcut = pendingShortcutRef.current;
        if (pendingShortcut?.code === event.code) {
          pendingShortcutRef.current = null;
          onRecord(pendingShortcut.value);
          return;
        }

        if (!pendingShortcut) {
          setPreview(shortcutFromEvent(event, false));
        }
      }}
    >
      <Keyboard aria-hidden="true" className="size-4 shrink-0" />
      {preview ? (
        <ShortcutKeys value={preview} variant="light" />
      ) : (
        <Kbd variant="light">
          <Kbd.Content>{t("shortcuts.recordPrompt")}</Kbd.Content>
        </Kbd>
      )}
    </div>
  );
}
