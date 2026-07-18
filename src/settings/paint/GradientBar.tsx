import { colorSliderVariants } from "@heroui/react";
import type { CSSProperties } from "react";
import { useRef } from "react";

import { clamp01, gradientBarCss } from "./paintUtils";
import type { GradientStop, Paint } from "./types";

type GradientBarProps = {
  activeIndex: number;
  isDisabled?: boolean;
  paint: Paint;
  stops: GradientStop[];
  onAddStop: (offset: number) => void;
  onSelectStop: (index: number) => void;
  onStopOffsetChange: (index: number, offset: number) => void;
};

export function GradientBar({
  activeIndex,
  isDisabled = false,
  paint,
  stops,
  onAddStop,
  onSelectStop,
  onStopOffsetChange,
}: GradientBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slots = colorSliderVariants();
  const startColor = stops[0]?.color ?? "transparent";
  const endColor = stops[stops.length - 1]?.color ?? "transparent";

  const offsetFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();

    if (!rect || rect.width <= 0) {
      return 0;
    }

    return clamp01((clientX - rect.left) / rect.width);
  };

  return (
    <div className={slots.base()} data-orientation="horizontal" data-slot="color-slider">
      <div
        ref={trackRef}
        className={slots.track()}
        data-slot="color-slider-track"
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        style={{
          "--track-end-color": endColor,
          "--track-start-color": startColor,
          background: `${gradientBarCss(paint)}, repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px`,
        } as CSSProperties}
        onPointerDown={(event) => {
          if (!isDisabled) {
            onAddStop(offsetFromClientX(event.clientX));
          }
        }}
      >
        {stops.map((stop, index) => (
          <GradientHandle
            key={`${stop.color}-${index}`}
            index={index}
            isActive={index === activeIndex}
            isDisabled={isDisabled}
            offset={stop.offset}
            stopColor={stop.color}
            onMove={(offset) => onStopOffsetChange(index, offset)}
            onSelect={onSelectStop}
            offsetFromClientX={offsetFromClientX}
            thumbClassName={slots.thumb()}
          />
        ))}
      </div>
    </div>
  );
}

function GradientHandle({
  index,
  isActive,
  isDisabled,
  offset,
  onMove,
  onSelect,
  offsetFromClientX,
  stopColor,
  thumbClassName,
}: {
  index: number;
  isActive: boolean;
  isDisabled: boolean;
  offset: number;
  onMove: (offset: number) => void;
  onSelect: (index: number) => void;
  offsetFromClientX: (clientX: number) => number;
  stopColor: string;
  thumbClassName: string;
}) {
  return (
    <button
      className={thumbClassName}
      data-disabled={isDisabled ? "true" : undefined}
      data-focus-visible={isActive ? "true" : undefined}
      disabled={isDisabled}
      style={{
        backgroundColor: stopColor,
        left: `${offset * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
      type="button"
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(index);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          onMove(offsetFromClientX(event.clientX));
        }
      }}
    />
  );
}
