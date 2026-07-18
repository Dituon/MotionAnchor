import {
  Button,
  Card,
  Label,
  Slider,
  Typography,
} from "@heroui/react";
import { EyeOff, Gauge, Maximize2, Monitor, MousePointer2, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

import type { GlobalPaint } from "../overlay/appearance";
import { PaintEditorButton, PaintSwatch, type Paint } from "./paint";

type StartPageProps = {
  activePaintId: string;
  globalPaints: GlobalPaint[];
  onActivePaintChange: (paintId: string) => void;
  onGlobalPaintAdd: () => void;
  onGlobalPaintDelete: (paintId: string) => void;
  onOpacityChange: (opacity: number) => void;
  onPaintChange: (paint: Paint) => void;
  opacity: number;
  activePaint: Paint;
};

type GameSettingTip = {
  icon: ComponentType<{ "aria-hidden": "true"; className: string }>;
  key: string;
};

const gameSettingTips = [
  { icon: Monitor, key: "displayMode" },
  { icon: EyeOff, key: "motionBlur" },
  { icon: SlidersHorizontal, key: "fov" },
  { icon: Gauge, key: "frameRate" },
  { icon: MousePointer2, key: "mouseInput" },
  { icon: Maximize2, key: "resolutionScale" },
] satisfies GameSettingTip[];

const roundIconButtonClass = "h-11 w-11 min-w-0 shrink-0 rounded-full p-0";

export function StartPage({
  activePaint,
  activePaintId,
  globalPaints,
  onActivePaintChange,
  onGlobalPaintAdd,
  onGlobalPaintDelete,
  onOpacityChange,
  onPaintChange,
  opacity,
}: StartPageProps) {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
      <OverlaySetupCard
        activePaint={activePaint}
        activePaintId={activePaintId}
        globalPaints={globalPaints}
        opacity={opacity}
        onActivePaintChange={onActivePaintChange}
        onGlobalPaintAdd={onGlobalPaintAdd}
        onGlobalPaintDelete={onGlobalPaintDelete}
        onOpacityChange={onOpacityChange}
        onPaintChange={onPaintChange}
      />
      <GameSettingsCard />
    </div>
  );
}

function OverlaySetupCard({
  activePaint,
  activePaintId,
  globalPaints,
  opacity,
  onActivePaintChange,
  onGlobalPaintAdd,
  onGlobalPaintDelete,
  onOpacityChange,
  onPaintChange,
}: StartPageProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("start.title")}</Card.Title>
          <Card.Description>{t("start.description")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-5">
        <GlobalPaintPalette
          activePaint={activePaint}
          activePaintId={activePaintId}
          paints={globalPaints}
          onAdd={onGlobalPaintAdd}
          onDelete={onGlobalPaintDelete}
          onPaintChange={onPaintChange}
          onSelect={onActivePaintChange}
        />
        <GlobalOpacitySetting opacity={opacity} onOpacityChange={onOpacityChange} />
      </Card.Content>
    </Card>
  );
}

function GlobalPaintPalette({
  activePaint,
  activePaintId,
  paints,
  onAdd,
  onDelete,
  onPaintChange,
  onSelect,
}: {
  activePaint: Paint;
  activePaintId: string;
  paints: GlobalPaint[];
  onAdd: () => void;
  onDelete: (paintId: string) => void;
  onPaintChange: (paint: Paint) => void;
  onSelect: (paintId: string) => void;
}) {
  const { t } = useTranslation();
  const activeGlobalPaint = paints.find((paint) => paint.id === activePaintId) ?? paints[0];

  return (
    <div className="grid gap-2">
      <Label>{t("start.globalColor")}</Label>
      <div className="flex min-w-0 flex-wrap gap-2">
        {paints.map((paint) => {
          const isSelected = paint.id === activePaintId;

          return (
            <Button
              key={paint.id}
              className={`h-11 w-11 min-w-0 rounded-full p-0 ${
                isSelected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
              }`}
              variant={isSelected ? "secondary" : "ghost"}
              onPress={() => onSelect(paint.id)}
            >
              <PaintSwatch className="h-9 w-9" paint={paint.paint} />
            </Button>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Button isIconOnly className={roundIconButtonClass} size="sm" variant="secondary" onPress={onAdd}>
            <Plus aria-hidden="true" />
          </Button>
          <PaintEditorButton className={roundIconButtonClass} value={activePaint} onChange={onPaintChange} />
          <Button
            isIconOnly
            className={roundIconButtonClass}
            isDisabled={!activeGlobalPaint || paints.length <= 1}
            size="sm"
            variant="tertiary"
            onPress={() => activeGlobalPaint && onDelete(activeGlobalPaint.id)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function GlobalOpacitySetting({
  opacity,
  onOpacityChange,
}: Pick<StartPageProps, "opacity" | "onOpacityChange">) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{t("start.globalOpacity")}</Label>
        <Typography.Code>{Math.round(opacity * 100)}%</Typography.Code>
      </div>
      <Slider
        minValue={0}
        maxValue={1}
        step={0.01}
        value={opacity}
        onChange={(value) => {
          if (typeof value === "number") {
            onOpacityChange(value);
          }
        }}
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </div>
  );
}

function GameSettingsCard() {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("start.gameSettingsTitle")}</Card.Title>
          <Card.Description>{t("start.gameSettingsDescription")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
        {gameSettingTips.map((tip) => (
          <GameSettingTipRow key={tip.key} tip={tip} />
        ))}
      </Card.Content>
    </Card>
  );
}

function GameSettingTipRow({ tip }: { tip: GameSettingTip }) {
  const { t } = useTranslation();
  const Icon = tip.icon;

  return (
    <div className="grid gap-3 rounded-md py-3 sm:grid-cols-[2rem_minmax(0,1fr)]">
      <Icon aria-hidden="true" className="size-5 text-muted" />
      <div className="min-w-0">
        <Typography.Paragraph className="font-medium">{t(`start.tips.${tip.key}.title`)}</Typography.Paragraph>
        <Typography.Paragraph className="text-muted">{t(`start.tips.${tip.key}.description`)}</Typography.Paragraph>
      </div>
    </div>
  );
}
