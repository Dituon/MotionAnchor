import type { ColorChannel, ColorSpace } from "@heroui/react";

import { ColorField, ColorSwatch, ListBox, Select } from "@heroui/react";
import { useState } from "react";

type ColorFieldsProps = {
  isDisabled?: boolean;
};

const colorChannelsByColorSpace: Record<ColorSpace, ColorChannel[]> = {
  hsb: ["hue", "saturation", "brightness"],
  hsl: ["hue", "saturation", "lightness"],
  rgb: ["red", "green", "blue"],
};

export function ColorFields({ isDisabled = false }: ColorFieldsProps) {
  const [colorSpace, setColorSpace] = useState<ColorSpace>("hsl");

  return (
    <div className="grid gap-2">
      <div className="grid w-full grid-cols-2 items-center gap-2">
        <ColorField>
          <ColorField.Group variant="secondary">
            <ColorField.Prefix>
              <ColorSwatch size="xs" />
            </ColorField.Prefix>
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
        <Select
          isDisabled={isDisabled}
          value={colorSpace}
          variant="secondary"
          onChange={(nextValue) => {
            if (typeof nextValue === "string" && isColorSpace(nextValue)) {
              setColorSpace(nextValue);
            }
          }}
        >
          <Select.Trigger>
            <Select.Value className="uppercase" />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {Object.keys(colorChannelsByColorSpace).map((space) => (
                <ListBox.Item key={space} className="uppercase" id={space} textValue={space}>
                  {space}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className="grid w-full grid-cols-3 items-center gap-2">
        {colorChannelsByColorSpace[colorSpace].map((channel) => (
          <ColorField
            key={channel}
            channel={channel}
            colorSpace={colorSpace}
            isDisabled={isDisabled}
          >
            <ColorField.Group variant="secondary">
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
        ))}
      </div>
    </div>
  );
}

function isColorSpace(value: string): value is ColorSpace {
  return value === "hsb" || value === "hsl" || value === "rgb";
}
