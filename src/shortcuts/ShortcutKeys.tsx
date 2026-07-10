import { Kbd } from "@heroui/react";

function displayKey(key: string) {
  return key
    .replace(/^Key/, "")
    .replace(/^Digit/, "")
    .replace("control", "Ctrl")
    .replace("shift", "Shift")
    .replace("alt", "Alt")
    .replace("super", "Super");
}

export function ShortcutKeys({ value, variant }: { value: string; variant?: "default" | "light" }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {value.split("+").map((key) => (
        <Kbd key={key} variant={variant}>
          <Kbd.Content>{displayKey(key)}</Kbd.Content>
        </Kbd>
      ))}
    </div>
  );
}
