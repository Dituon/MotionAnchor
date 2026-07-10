import { animeRuntime } from "../animation";
import type { PluginManifest, PluginModule } from "./types";

function numberSetting(settings: Record<string, unknown>, key: string, fallback: number) {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function lengthSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: number,
  fallbackUnit = "px",
  percentUnit: "vh" | "vw" = "vw",
) {
  const value = settings[key];

  if (typeof value === "object" && value !== null && "value" in value && "unit" in value) {
    const candidate = value as { value?: unknown; unit?: unknown };

    if (typeof candidate.value === "number" && Number.isFinite(candidate.value) && isLengthUnit(candidate.unit)) {
      if (candidate.unit === "%") {
        return `${candidate.value}${percentUnit}`;
      }

      return `${candidate.value}${candidate.unit}`;
    }
  }

  return `${fallback}${fallbackUnit}`;
}

function isLengthUnit(value: unknown) {
  return value === "%" || value === "px";
}

function stringSetting(settings: Record<string, unknown>, key: string, fallback: string) {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

function colorSetting(settings: Record<string, unknown>, key: string) {
  const value = stringSetting(settings, key, "").trim();

  return value || "var(--ma-overlay-color)";
}

function canvasColorSetting(settings: Record<string, unknown>, key: string) {
  const value = stringSetting(settings, key, "").trim();

  return (
    value ||
    getComputedStyle(document.documentElement).getPropertyValue("--ma-overlay-color").trim() ||
    "#4cd964"
  );
}

function lerpAngle(current: number, target: number, factor: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * factor;
}

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

const directionalPullRing: PluginModule = {
  mount(root, api) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const state = {
      currentPull: 0,
      targetPull: 0,
      angle: 0,
      targetAngle: 0,
      smoothedDx: 0,
      smoothedDy: 0,
      virtualX: 0,
      virtualY: 0,
      lastSeq: -1,
      canvasDpr: 1,
      canvasCssSize: 1,
    };

    canvas.style.position = "absolute";
    canvas.style.left = "50%";
    canvas.style.top = "50%";
    canvas.style.transform = "translate(-50%, -50%)";
    canvas.style.pointerEvents = "none";
    root.replaceChildren(canvas);

    const applyCanvasSize = () => {
      const settings = api.settings();
      const radius = numberSetting(settings, "radius", 36);
      const stroke = numberSetting(settings, "stroke", 16);
      const deformation = numberSetting(settings, "deformation", 40) / 2;
      const dpr = window.devicePixelRatio || 1;
      const cssSize = Math.ceil((radius + stroke + deformation + 32) * 2);
      const width = Math.max(1, Math.ceil(cssSize * dpr));
      const height = Math.max(1, Math.ceil(cssSize * dpr));

      state.canvasDpr = dpr;
      state.canvasCssSize = cssSize;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
    };

    const resize = () => applyCanvasSize();
    window.addEventListener("resize", resize);
    applyCanvasSize();

    return {
      usesRawMouse: true,
      frame() {
        if (!ctx) {
          return false;
        }

        const settings = api.settings();
        const motion = api.motion();
        const dpr = state.canvasDpr;
        const width = state.canvasCssSize;
        const height = state.canvasCssSize;
        const radius = numberSetting(settings, "radius", 36);
        const stroke = numberSetting(settings, "stroke", 16);
        const rawSensitivity = numberSetting(settings, "sensitivity", 1);
        const sensitivity = rawSensitivity / 10;
        const deformation = numberSetting(settings, "deformation", 40) / 2;
        const smoothness = clamp01(numberSetting(settings, "smoothness", 0.5));
        const opacity = clamp01(numberSetting(settings, "opacity", 1));
        const color = canvasColorSetting(settings, "color");
        const sensitivityScale = Math.max(0.2, sensitivity);
        const maxDeformation = deformation;
        const response = lerp(0.24, 0.065, smoothness);
        const angleResponse = lerp(0.36, 0.1, smoothness);
        const directionDeadzone = lerp(5.5, 1.5, clamp01((sensitivityScale - 0.2) / 2.8));
        const virtualScale = 1.25 * sensitivityScale;
        const virtualFriction = lerp(0.76, 0.9, smoothness);
        const virtualMaxDistance = 96;
        const fastSpeed = 2600 / sensitivityScale;
        const speedCurve = lerp(1.6, 1.15, clamp01((sensitivityScale - 0.2) / 2.8));
        const slowPull = deformation * 0.08 * sensitivityScale;
        const driftInfluence = 0.1 + sensitivityScale * 0.025;
        const decay = lerp(0.7, 0.9, smoothness);
        const vectorEase = animeRuntime.eases.outExpo(Math.min(1, Math.max(0.001, response)));
        const angleEase = animeRuntime.eases.outExpo(Math.min(1, Math.max(0.001, angleResponse)));
        const hasFreshMotion = motion.seq !== state.lastSeq;

        if (hasFreshMotion) {
          state.lastSeq = motion.seq;
          state.smoothedDx = animeRuntime.utils.lerp(state.smoothedDx, motion.dx, vectorEase);
          state.smoothedDy = animeRuntime.utils.lerp(state.smoothedDy, motion.dy, vectorEase);
          state.virtualX += state.smoothedDx * virtualScale;
          state.virtualY += state.smoothedDy * virtualScale;
        } else if (performance.now() - motion.lastAt > 35) {
          state.smoothedDx = animeRuntime.utils.lerp(state.smoothedDx, 0, vectorEase * 0.45);
          state.smoothedDy = animeRuntime.utils.lerp(state.smoothedDy, 0, vectorEase * 0.45);
        }

        state.virtualX *= virtualFriction;
        state.virtualY *= virtualFriction;

        const virtualDistance = Math.hypot(state.virtualX, state.virtualY);
        if (virtualDistance > virtualMaxDistance) {
          const limitScale = virtualMaxDistance / virtualDistance;
          state.virtualX *= limitScale;
          state.virtualY *= limitScale;
        }

        const limitedDistance = Math.min(Math.hypot(state.virtualX, state.virtualY), virtualMaxDistance);
        if (limitedDistance > directionDeadzone) {
          state.targetAngle = Math.atan2(state.virtualY, state.virtualX);
          const speed01 = clamp01(Math.max(0, motion.speed) / Math.max(1, fastSpeed));
          const speedStrength = Math.pow(speed01, Math.max(0.1, speedCurve));
          const drift01 = clamp01(
            (limitedDistance - directionDeadzone) / Math.max(1, virtualMaxDistance - directionDeadzone),
          );
          const gentlePull = slowPull * smoothstep(0.01, 0.18, speed01);
          const speedPull = maxDeformation * speedStrength;
          const driftPull = maxDeformation * Math.pow(drift01, 1.4) * driftInfluence;
          state.targetPull = Math.min(gentlePull + speedPull + driftPull, maxDeformation);
        } else {
          state.targetPull *= decay;
        }

        state.angle = lerpAngle(state.angle, state.targetAngle, angleEase * 0.35);
        state.currentPull += (state.targetPull - state.currentPull) * response;
        state.targetPull *= performance.now() - motion.lastAt > 35 ? decay : 0.9;

        const cx = width / 2;
        const cy = height / 2;
        const segments = 180;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = stroke;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();

        for (let i = 0; i <= segments; i += 1) {
          const angle = (i / segments) * Math.PI * 2;
          const delta = angle - state.angle;
          const front = Math.exp(4.2 * (Math.cos(delta) - 1));
          const back = Math.exp(1.4 * (Math.cos(delta + Math.PI) - 1));
          const pullEffect = state.currentPull * (front - back * 0.12);
          const r = Math.max(radius * 0.55, radius + pullEffect);
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        return (
          hasFreshMotion ||
          Math.abs(state.currentPull) > 0.08 ||
          Math.abs(state.targetPull) > 0.08 ||
          Math.hypot(state.virtualX, state.virtualY) > 0.08 ||
          Math.hypot(state.smoothedDx, state.smoothedDy) > 0.08
        );
      },
      updatePlugin() {
        applyCanvasSize();
      },
      destroy() {
        window.removeEventListener("resize", resize);
        root.replaceChildren();
      },
    };
  },
};

const staticRing: PluginModule = {
  mount(root, api) {
    const style = document.createElement("style");
    const ring = document.createElement("div");

    style.textContent = `
      .ma-static-ring {
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(var(--ma-static-ring-radius) * 2);
        height: calc(var(--ma-static-ring-radius) * 2);
        box-sizing: border-box;
        border: var(--ma-static-ring-stroke) solid var(--ma-static-ring-color);
        border-radius: 50%;
        opacity: var(--ma-static-ring-opacity);
        pointer-events: none;
        transform: translate(-50%, -50%);
      }
    `;

    ring.className = "ma-static-ring";
    root.replaceChildren(style, ring);

    const applySettings = () => {
      const settings = api.settings();
      ring.style.setProperty("--ma-static-ring-color", colorSetting(settings, "color"));
      ring.style.setProperty("--ma-static-ring-radius", `${numberSetting(settings, "radius", 36)}px`);
      ring.style.setProperty("--ma-static-ring-stroke", `${numberSetting(settings, "stroke", 8)}px`);
      ring.style.setProperty("--ma-static-ring-opacity", String(numberSetting(settings, "opacity", 1)));
    };

    applySettings();

    return {
      updatePlugin: applySettings,
      destroy() {
        root.replaceChildren();
      },
    };
  },
};

const fullscreenReferenceLines: PluginModule = {
  mount(root, api) {
    const style = document.createElement("style");
    const container = document.createElement("div");
    const top = document.createElement("div");
    const bottom = document.createElement("div");
    const left = document.createElement("div");
    const right = document.createElement("div");

    style.textContent = `
      .ma-reference-lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .ma-reference-lines__line {
        position: absolute;
        background: var(--ma-reference-color);
        opacity: var(--ma-reference-opacity);
      }
      .ma-reference-lines__line--vertical {
        left: 50%;
        width: var(--ma-reference-line-width);
        transform: translateX(-50%);
      }
      .ma-reference-lines__line--horizontal {
        top: 50%;
        height: var(--ma-reference-line-width);
        transform: translateY(-50%);
      }
      .ma-reference-lines__line--top {
        top: 0;
        bottom: calc(50% + var(--ma-reference-gap-y));
      }
      .ma-reference-lines__line--bottom {
        top: calc(50% + var(--ma-reference-gap-y));
        bottom: 0;
      }
      .ma-reference-lines__line--left {
        left: 0;
        right: calc(50% + var(--ma-reference-gap-x));
      }
      .ma-reference-lines__line--right {
        left: calc(50% + var(--ma-reference-gap-x));
        right: 0;
      }
    `;

    container.className = "ma-reference-lines";
    top.className = "ma-reference-lines__line ma-reference-lines__line--vertical ma-reference-lines__line--top";
    bottom.className = "ma-reference-lines__line ma-reference-lines__line--vertical ma-reference-lines__line--bottom";
    left.className = "ma-reference-lines__line ma-reference-lines__line--horizontal ma-reference-lines__line--left";
    right.className = "ma-reference-lines__line ma-reference-lines__line--horizontal ma-reference-lines__line--right";
    container.append(top, bottom, left, right);
    root.replaceChildren(style, container);

    const applySettings = () => {
      const settings = api.settings();
      container.style.setProperty("--ma-reference-color", colorSetting(settings, "color"));
      container.style.setProperty("--ma-reference-opacity", String(numberSetting(settings, "opacity", 0.35)));
      container.style.setProperty("--ma-reference-line-width", `${numberSetting(settings, "lineWidth", 8)}px`);
      container.style.setProperty("--ma-reference-gap-x", lengthSetting(settings, "gap", 84, "px", "vw"));
      container.style.setProperty("--ma-reference-gap-y", lengthSetting(settings, "gap", 84, "px", "vh"));
    };

    applySettings();

    return {
      updatePlugin: applySettings,
      destroy() {
        root.replaceChildren();
      },
    };
  },
};

const fullscreenGrid: PluginModule = {
  mount(root, api) {
    const style = document.createElement("style");
    const grid = document.createElement("div");

    style.textContent = `
      .ma-fullscreen-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: var(--ma-grid-opacity);
        background-image:
          linear-gradient(to right, var(--ma-grid-color) var(--ma-grid-line-width), transparent var(--ma-grid-line-width)),
          linear-gradient(to bottom, var(--ma-grid-color) var(--ma-grid-line-width), transparent var(--ma-grid-line-width));
        background-size: var(--ma-grid-spacing) var(--ma-grid-spacing);
        background-position:
          calc(50% - (var(--ma-grid-line-width) / 2)) 0,
          0 calc(50% - (var(--ma-grid-line-width) / 2));
      }
    `;

    grid.className = "ma-fullscreen-grid";
    root.replaceChildren(style, grid);

    const applySettings = () => {
      const settings = api.settings();
      grid.style.setProperty("--ma-grid-color", colorSetting(settings, "color"));
      grid.style.setProperty("--ma-grid-opacity", String(numberSetting(settings, "opacity", 0.16)));
      grid.style.setProperty("--ma-grid-spacing", lengthSetting(settings, "spacing", 80, "px", "vw"));
      grid.style.setProperty("--ma-grid-line-width", `${numberSetting(settings, "lineWidth", 1)}px`);
    };

    applySettings();

    return {
      updatePlugin: applySettings,
      destroy() {
        root.replaceChildren();
      },
    };
  },
};

const fullscreenBorder: PluginModule = {
  mount(root, api) {
    const style = document.createElement("style");
    const border = document.createElement("div");

    style.textContent = `
      .ma-fullscreen-border {
        position: absolute;
        inset: 0;
        box-sizing: border-box;
        border: var(--ma-border-width) solid var(--ma-border-color);
        opacity: var(--ma-border-opacity);
        pointer-events: none;
      }
    `;

    border.className = "ma-fullscreen-border";
    root.replaceChildren(style, border);

    const applySettings = () => {
      const settings = api.settings();
      border.style.setProperty("--ma-border-color", colorSetting(settings, "color"));
      border.style.setProperty("--ma-border-width", `${numberSetting(settings, "width", 16)}px`);
      border.style.setProperty("--ma-border-opacity", String(numberSetting(settings, "opacity", 1)));
    };

    applySettings();

    return {
      updatePlugin: applySettings,
      destroy() {
        root.replaceChildren();
      },
    };
  },
};

export const pluginModules: Record<string, PluginModule> = {
  "builtin.directionalPullRing": directionalPullRing,
  "builtin.staticRing": staticRing,
  "builtin.fullscreenReferenceLines": fullscreenReferenceLines,
  "builtin.fullscreenGrid": fullscreenGrid,
  "builtin.fullscreenBorder": fullscreenBorder,
};

export function missingPluginModule(plugin: PluginManifest): PluginModule {
  return {
    mount(root) {
      root.replaceChildren();
      console.warn(`MotionAnchor plugin renderer is not registered: ${plugin.renderer}`);
    },
  };
}
