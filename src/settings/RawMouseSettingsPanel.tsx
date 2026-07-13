import { Button, Card, InputGroup, Slider, TextField, Typography } from "@heroui/react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RawMouseSettingsPayload } from "../tauri/types";

const minRefreshRateHz = 1;
const maxRefreshRateHz = 1000;

function clampRefreshRate(value: number) {
  if (!Number.isFinite(value)) {
    return minRefreshRateHz;
  }

  return Math.round(Math.min(maxRefreshRateHz, Math.max(minRefreshRateHz, value)));
}

function formatHz(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return "-- Hz";
  }

  return `${Math.round(value ?? 0).toLocaleString()} Hz`;
}

export function RawMouseSettingsPanel({
  onMaxRefreshRateChange,
  settings,
}: {
  onMaxRefreshRateChange: (maxRefreshRateHz: number | null) => void | Promise<void>;
  settings: RawMouseSettingsPayload | null;
}) {
  const { t } = useTranslation();
  const defaultRefreshRateHz = settings?.defaultRefreshRateHz ?? 120;
  const effectiveRefreshRateHz = settings?.effectiveRefreshRateHz ?? defaultRefreshRateHz;
  const configuredRefreshRateHz = settings?.maxRefreshRateHz ?? null;
  const editorValue = configuredRefreshRateHz ?? effectiveRefreshRateHz;

  const updateManualRefreshRate = (value: number) => {
    void onMaxRefreshRateChange(clampRefreshRate(value));
  };

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("rawMouseSettings.title")}</Card.Title>
          <Card.Description>{t("rawMouseSettings.description")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="grid gap-1">
            <Typography.Paragraph className="text-muted">{t("rawMouseSettings.mode")}</Typography.Paragraph>
            <Typography.Code>
              {configuredRefreshRateHz === null ? t("rawMouseSettings.auto") : t("rawMouseSettings.manual")}
            </Typography.Code>
          </div>
          <div className="grid gap-1">
            <Typography.Paragraph className="text-muted">{t("rawMouseSettings.default")}</Typography.Paragraph>
            <Typography.Code>{formatHz(defaultRefreshRateHz)}</Typography.Code>
          </div>
          <div className="grid gap-1">
            <Typography.Paragraph className="text-muted">{t("rawMouseSettings.effective")}</Typography.Paragraph>
            <Typography.Code>{formatHz(effectiveRefreshRateHz)}</Typography.Code>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
          <Slider
            aria-label={t("rawMouseSettings.maxRefreshRate")}
            className="min-w-0"
            minValue={minRefreshRateHz}
            maxValue={maxRefreshRateHz}
            step={1}
            value={editorValue}
            onChange={(nextValue) => {
              if (typeof nextValue === "number") {
                updateManualRefreshRate(nextValue);
              }
            }}
          >
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>

          <TextField aria-label={t("rawMouseSettings.maxRefreshRate")}>
            <InputGroup fullWidth variant="secondary">
              <InputGroup.Input
                className="w-full"
                min={minRefreshRateHz}
                max={maxRefreshRateHz}
                step={1}
                type="number"
                value={String(editorValue)}
                onChange={(event) => updateManualRefreshRate(Number(event.target.value))}
              />
              <InputGroup.Suffix>Hz</InputGroup.Suffix>
            </InputGroup>
          </TextField>
        </div>

        <Button
          isDisabled={configuredRefreshRateHz === null}
          size="sm"
          variant="secondary"
          onPress={() => {
            void onMaxRefreshRateChange(null);
          }}
        >
          <RotateCcw aria-hidden="true" />
          {t("rawMouseSettings.useDefault")}
        </Button>
      </Card.Content>
    </Card>
  );
}
