import i18n from "@motion-anchor/app/i18n";

export const siteNamespace = "site";

export const siteResources = {
  en: {
    documentTitle: "MotionAnchor - Screen Overlay Tool for Reducing 3D Motion Sickness",
    download: {
      button: "Download",
      latest: "Download latest",
      menuLabel: "Other download options",
      releaseDescription: "Open the GitHub release page for alternate download options.",
      releaseLabel: "GitHub Releases",
    },
    footer: {
      releases: "Releases",
      source: "Source",
    },
    hero: {
      previewLabel: "MotionAnchor overlay preview",
      summary:
        "Build a stable, input-responsive 2D reference frame on screen to help reduce dizziness and discomfort in 3D scenes.",
      tryOnline: "Try online",
    },
    presets: {
      ariaLabel: "Plugin preset",
      balanced: "Balanced",
      "edge-alert": "Edge alert",
      "focus-ring": "Focus ring",
      "precision-grid": "Precision grid",
      "x-frame": "X frame",
    },
    trial: {
      loading: "Loading trial...",
      summary:
        "Tune overlay plugins and settings online, preview changes in real time, and click the preview to expand it fullscreen.",
      title: "Online trial",
    },
  },
  zh: {
    documentTitle: "MotionAnchor - 缓解 3D 眩晕的屏幕叠加层工具",
    download: {
      button: "下载",
      latest: "下载最新版",
      menuLabel: "其他下载方式",
      releaseDescription: "打开 GitHub 发布页查看更多下载方式。",
      releaseLabel: "GitHub 发布页",
    },
    footer: {
      releases: "发布页",
      source: "源码",
    },
    hero: {
      previewLabel: "MotionAnchor 叠加层预览",
      summary: "在屏幕上建立稳定、可响应操作的平面参考系，帮助缓解 3D 画面带来的眩晕与不适。",
      tryOnline: "在线试用",
    },
    presets: {
      ariaLabel: "插件预设",
      balanced: "均衡",
      "edge-alert": "边缘提醒",
      "focus-ring": "聚焦环",
      "precision-grid": "精密网格",
      "x-frame": "X",
    },
    trial: {
      loading: "正在加载试用界面...",
      summary: "在线调整叠加层插件与参数，并在预览中实时查看效果；点击预览可放大到全屏。",
      title: "在线试用",
    },
  },
} as const;

for (const [language, resources] of Object.entries(siteResources)) {
  if (!i18n.hasResourceBundle(language, siteNamespace)) {
    i18n.addResourceBundle(language, siteNamespace, resources);
  }
}
