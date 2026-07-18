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

### PluginSettingDefinition

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `defaultValue` | `unknown` | 默认值。 |
| `kind` | `string` | 配置项类型。 |
| `label` | `string` | 默认标签。 |
| `visibleWhen` | `{ key: string; equals: unknown \| unknown[] }` | 条件显示，仅当指定设置值匹配时才渲染。 |

### Lifecycle

`mount(root, api)` 会在插件启用时被调用。`root` 是分配给插件的 DOM 容器，`api` 用于读取当前插件信息、配置、全局输入和渲染工具。

```ts
type PluginApi = {
  env: () => PluginEnvironment;
  input: PluginInputApi;
  paint: PluginPaintApi;
  plugin: () => PluginManifest;
  render: PluginRenderApi;
  settings: () => Record<string, unknown>;
};

type PluginInputApi = {
  vector2: {
    get: (settingKey: string) => { x: number; y: number };
    on: (settingKey: string, handler: (value: { x: number; y: number }) => void) => () => void;
  };
};

type PluginRenderApi = {
  request: () => void;
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
  updatePlugin?: (plugin: PluginManifest) => void;
  frame?: (timeMs: number) => boolean | void;
  destroy?: () => void;
};
```

### Input

输入源由全局 input profile 定义，插件通过 `vector2Setting` 声明自己需要一个二维输入选择项。设置值是全局输入源 ID，例如 `look` 或 `move`。

```ts
import { vector2Setting } from "../../definePlugin";

settings: {
  input: vector2Setting({ label: "Input", defaultValue: "look" }),
}

mount(root, api) {
  const unlisten = api.input.vector2.on("input", ({ x, y }) => {
    // "input" 是插件 settings 的 key；用户可把它绑定到全局 look/move 等输入源。
    api.render.request();
  });

  return {
    frame(timeMs) {
      // 推进动画和绘制。返回 true 表示下一帧继续渲染。
      return false;
    },
    destroy() {
      unlisten();
    },
  };
}
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
