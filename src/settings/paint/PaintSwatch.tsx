import { paintToCss } from "./paintUtils";
import type { Paint } from "./types";

type PaintSwatchProps = {
  className?: string;
  paint: Paint;
};

export function PaintSwatch({ className = "h-10 w-10", paint }: PaintSwatchProps) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-content2 shadow-sm ring-1 ring-border ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "repeating-conic-gradient(rgb(212 212 216) 0% 25%, rgb(244 244 245) 0% 50%) 50% / 10px 10px",
        }}
      />
      <span aria-hidden="true" className="absolute inset-0" style={{ background: paintToCss(paint) }} />
      <span aria-hidden="true" className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/55" />
    </span>
  );
}
