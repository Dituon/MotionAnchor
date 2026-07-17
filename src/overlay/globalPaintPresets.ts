import type { HexColor, LinearGradientPaint } from "../settings/paint/types";
import type { GlobalPaint } from "./appearance";

type GradientStopInput = HexColor | [color: HexColor, offset: number];

type LinearGradientInput = {
  angle?: number;
  stops: GradientStopInput[];
};

const globalPaintPresetInputs = [
  { angle: 0, stops: ["#9be15d", "#00e3ae"] },
  { stops: ["#ef9393", "#e17dc2", "#998ee0", "#43add0", "#8bdeda"] },
  { stops: ["#0083fe", "#00fff0"] },
  { angle: 0, stops: ["#e6b980", "#eacda3"] },
  { stops: ["#93291e", "#ed213a"] },
  { stops: ["#2ebf91", "#8360c3"] },
  { stops: ["#e29587", "#d66d75"] },
  { stops: ["#b06ab3", "#4568dc"] },
  { stops: ["#2a0845", "#6441a5"] },
  { stops: ["#e65245", "#e43a15"] },
  {
    angle: 135,
    stops: [
      ["#22e1ff", 0],
      ["#1d8fe1", 0.48],
      ["#625eb1", 1],
    ],
  },
  {
    angle: 0,
    stops: [
      ["#1e3c72", 0],
      ["#1e3c72", 0.01],
      ["#2a5298", 1],
    ],
  },
  { stops: ["#7b920a", "#add100"] },
  {
    angle: 0,
    stops: [
      ["#3f51b1", 0],
      ["#5a55ae", 0.13],
      ["#7b5fac", 0.25],
      ["#8f6aae", 0.38],
      ["#a86aa4", 0.5],
      ["#cc6b8e", 0.62],
      ["#f18271", 0.75],
      ["#f3a469", 0.87],
      ["#f7c978", 1],
    ],
  },
  { stops: ["#516395", "#614385"] },
  { stops: ["#faaca8", "#ddd6f3"] },
  { stops: ["#eea849", "#f46b45"] },
  { angle: 0, stops: ["#0ba360", "#3cba92"] },
  {
    angle: 135,
    stops: [
      ["#ac32e4", 0],
      ["#7918f2", 0.48],
      ["#4801ff", 1],
    ],
  },
  {
    stops: [
      ["#c1c161", 0],
      ["#c1c161", 0],
      ["#d4d4b1", 1],
    ],
  },
  { angle: 45, stops: ["#874da2", "#c43a30"] },
  { angle: 135, stops: ["#f5f7fa", "#c3cfe2"] },
] satisfies LinearGradientInput[];

export const defaultGlobalPaints = globalPaintPresetInputs.map((preset, index): GlobalPaint => ({
  id: String(index + 1),
  paint: linearGradient(preset),
}));

function linearGradient({ angle = 90, stops }: LinearGradientInput): LinearGradientPaint {
  return {
    type: "linear-gradient",
    angle,
    stops: gradientStops(stops),
  };
}

function gradientStops(stops: GradientStopInput[]): LinearGradientPaint["stops"] {
  return stops.map((stop, index) => {
    if (Array.isArray(stop)) {
      return { color: stop[0], offset: stop[1] };
    }

    return {
      color: stop,
      offset: stops.length <= 1 ? 0 : index / (stops.length - 1),
    };
  });
}
