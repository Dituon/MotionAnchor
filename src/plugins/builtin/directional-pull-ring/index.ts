import { animeRuntime } from "../../../animation";
import { definePlugin, numberSetting, paintSetting as paintSettingDefinition, pxSetting } from "../../definePlugin";
import { clamp01, numberSetting as numberSettingValue } from "../../runtimeSettings";
import { PluginKind } from "../../types";

function lerpAngle(current: number, target: number, factor: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * factor;
}

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export default definePlugin({
  id: "builtin.directional-pull-ring",
  name: "Directional Pull Ring",
  kind: PluginKind.Crosshair,
  enabledByDefault: true,
  order: 10,
  description: "Canvas ring that stretches in the raw mouse direction.",
  settings: {
    color: paintSettingDefinition({ label: "Color" }),
    radius: pxSetting({ defaultValue: 36, label: "Radius", min: 8, max: 120, step: 1 }),
    stroke: pxSetting({ defaultValue: 8, label: "Stroke", min: 1, max: 40, step: 1 }),
    opacity: numberSetting({ defaultValue: 0.8, label: "Opacity", min: 0, max: 1, step: 0.01 }),
    sensitivity: numberSetting({ defaultValue: 1, label: "Sensitivity", min: 0.2, max: 3, step: 0.05 }),
    deformation: pxSetting({ defaultValue: 40, label: "Deformation", min: 0, max: 120, step: 1 }),
    smoothness: numberSetting({ defaultValue: 0.5, label: "Smoothness", min: 0, max: 1, step: 0.01 }),
  },
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
      lastFrameTime: 0,
      fps: 0,
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
      const radius = numberSettingValue(settings, "radius", 36);
      const stroke = numberSettingValue(settings, "stroke", 16);
      const deformation = numberSettingValue(settings, "deformation", 40) / 2;
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
      frame(timeMs) {
        if (!ctx) {
          return false;
        }

        const env = api.env();
        const settings = api.settings();
        const motion = api.motion();
        const dpr = state.canvasDpr;
        const width = state.canvasCssSize;
        const height = state.canvasCssSize;
        const radius = numberSettingValue(settings, "radius", 36);
        const stroke = numberSettingValue(settings, "stroke", 16);
        const rawSensitivity = numberSettingValue(settings, "sensitivity", 1);
        const sensitivity = rawSensitivity / 10;
        const deformation = numberSettingValue(settings, "deformation", 40) / 2;
        const smoothness = clamp01(numberSettingValue(settings, "smoothness", 0.5));
        const opacity = clamp01(numberSettingValue(settings, "opacity", 1));
        const paintStyle = api.paint.canvasStyle(ctx, "color");
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

        if (state.lastFrameTime > 0) {
          const instantFps = 1000 / Math.max(1, timeMs - state.lastFrameTime);
          state.fps = state.fps === 0 ? instantFps : lerp(state.fps, instantFps, 0.12);
        }
        state.lastFrameTime = timeMs;

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
        ctx.strokeStyle = paintStyle;
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

        if (env.debug) {
          const lines = [
            `debug: on`,
            `seq: ${motion.seq}`,
            `device: ${motion.deviceId}`,
            `dx/dy: ${motion.dx} / ${motion.dy}`,
            `speed: ${Math.round(motion.speed)}`,
            `fps: ${Math.round(state.fps)}`,
            `pull: ${state.currentPull.toFixed(2)}`,
          ];

          ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
          ctx.textBaseline = "top";
          const padding = 8;
          const lineHeight = 14;
          const panelWidth = Math.max(...lines.map((line) => ctx.measureText(line).width)) + padding * 2;
          const panelHeight = lines.length * lineHeight + padding * 2;

          ctx.globalAlpha = 0.72;
          ctx.fillStyle = "#05070a";
          ctx.fillRect(6, 6, panelWidth, panelHeight);
          ctx.globalAlpha = 0.96;
          ctx.fillStyle = paintStyle;
          lines.forEach((line, index) => {
            ctx.fillText(line, 6 + padding, 6 + padding + index * lineHeight);
          });
        }

        ctx.restore();

        return (
          env.debug ||
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
});
