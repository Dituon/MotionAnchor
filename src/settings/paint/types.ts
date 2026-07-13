export type Paint = SolidPaint | LinearGradientPaint | RadialGradientPaint | ConicGradientPaint;
export type HexColor = `#${string}`;

export interface SolidPaint {
  type: "solid";
  color: HexColor;
}

export interface GradientStop {
  color: HexColor;
  offset: number;
}

export interface LinearGradientPaint {
  type: "linear-gradient";
  angle: number;
  stops: GradientStop[];
}

export interface RadialGradientPaint {
  type: "radial-gradient";
  shape: "circle" | "ellipse";
  position: { x: number; y: number };
  stops: GradientStop[];
}

export interface ConicGradientPaint {
  type: "conic-gradient";
  angle: number;
  position: { x: number; y: number };
  stops: GradientStop[];
}

export type GradientPaint = LinearGradientPaint | RadialGradientPaint | ConicGradientPaint;
export type PaintType = Paint["type"];
