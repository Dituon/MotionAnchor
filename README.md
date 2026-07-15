# MotionAnchor

MotionAnchor 是一个轻量化桌面屏幕叠加层工具。在屏幕上建立稳定、可响应操作的平面参考系，帮助缓解 3D 画面带来的眩晕与不适。

## Quick Start

```bash
npm install
npm run tauri dev
```

## Plugin

当前插件系统是前端内置插件系统，不是运行时从外部目录加载 JS 文件。新增插件需要在 `src/plugins/builtin/<plugin-id>/index.ts` 中定义模块，并在 `src/plugins/registry.ts` 中注册。

### Define

插件通过 `definePlugin` 声明：

```ts
import { definePlugin, numberSetting, paintSetting, pxSetting } from "../../definePlugin";
import { numberSetting as numberSettingValue } from "../../runtimeSettings";

export default definePlugin({
  id: "builtin.example-anchor",
  name: "Example Anchor",
  kind: "guide",
  enabledByDefault: true,
  order: 50,
  description: "A simple center anchor.",
  settings: {
    color: paintSetting(),
    size: pxSetting({ defaultValue: 32, label: "Size", min: 4, max: 160, step: 1 }),
    opacity: numberSetting({ defaultValue: 0.8, label: "Opacity", min: 0, max: 1, step: 0.01 }),
  },
  mount(root, api) {
    const node = document.createElement("div");

    node.style.position = "absolute";
    node.style.left = "50%";
    node.style.top = "50%";
    node.style.pointerEvents = "none";
    root.replaceChildren(node);

    const applySettings = () => {
      const settings = api.settings();
      const size = numberSettingValue(settings, "size", 32);
      const opacity = numberSettingValue(settings, "opacity", 0.8);

      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      api.paint.applyBackground(node, "color");
      node.style.opacity = String(opacity);
      node.style.transform = "translate(-50%, -50%)";
    };

    applySettings();

    return {
      updatePlugin: applySettings,
      destroy() {
        root.replaceChildren();
      },
    };
  },
});
```

### PluginRegistration

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 插件唯一 ID。建议使用 `builtin.xxx` 或其他命名空间前缀。 |
| `name` | `string` | 默认显示名称，可被 i18n 文案覆盖。 |
| `kind` | `string` | 插件分类，目前内置常用 `overlay` 和 `guide`。 |
| `enabledByDefault` | `boolean` | 无用户配置时是否默认启用。 |
| `order` | `number` | 插件排序和 DOM 挂载顺序，数值越小越靠前。 |
| `description` | `string` | 默认描述，可被 i18n 文案覆盖。 |
| `settings` | `Record<string, PluginSettingDefinition>` | 配置项定义，自动生成配置面板与 manifest。 |
| `mount` | `(root, api) => PluginInstance \| void` | 插件挂载函数。 |

### Lifecycle

`mount(root, api)` 会在插件启用时被调用。`root` 是分配给插件的 DOM 容器，`api` 用于读取当前插件信息、配置和鼠标运动数据。

```ts
type PluginApi = {
  env: () => PluginEnvironment;
  motion: () => MotionFrame;
  paint: PluginPaintApi;
  plugin: () => PluginManifest;
  settings: () => Record<string, unknown>;
};

type PaintRect = { x: number; y: number; width: number; height: number };
type PluginPaintOptions = { coordinateSpace?: "local" | "viewport"; fallback?: Paint };
type PluginCanvasPaintOptions = PluginPaintOptions & { rect?: PaintRect };

type PluginPaintApi = {
  applyBackground: (element: HTMLElement, key: string, options?: PluginPaintOptions) => void;
  canvasStyle: (ctx: CanvasRenderingContext2D, key: string, options?: PluginCanvasPaintOptions) => string | CanvasGradient;
  css: (key: string, options?: Pick<PluginPaintOptions, "fallback">) => string;
  setting: (key: string, fallback?: Paint) => Paint;
  viewportRect: () => PaintRect;
};

type PluginInstance = {
  usesRawMouse?: boolean | (() => boolean);
  updatePlugin?: (plugin: PluginManifest) => void;
  updateMotion?: (motion: MotionFrame) => void;
  frame?: (timeMs: number) => boolean | void;
  destroy?: () => void;
};
```

### RawMouse

Raw Mouse 当前只在 Windows 上可用。插件声明 `usesRawMouse: true` 后，可通过 `api.motion()` 获取聚合后的运动帧：

```ts
type MotionFrame = {
  deviceId: number;
  dx: number;
  dy: number; // 本帧累计的原始鼠标位移
  dtMs: number;
  speed: number;
  acceleration: number; // 速度变化率
  timestampMs: number;
  seq: number; // 运动帧序号
  lastAt: number; // 最近一次运动帧写入时的 performance.now()
};
```

### Register

```ts
import exampleAnchor from "./builtin/example-anchor";

export const registeredPlugins = [
  directionalPullRing,
  staticRing,
  fullscreenReferenceLines,
  fullscreenGrid,
  fullscreenBorder,
  exampleAnchor,
] satisfies PluginRegistration[];
```

### Shortcut Key

插件注册后可以被快捷键系统引用。插件动作 ID 格式为：

```text
plugin:<pluginId>:enable
plugin:<pluginId>:disable
plugin:<pluginId>:toggle
```
