export type ShortcutAction = {
  id: string;
  scope: "app" | "plugin";
  operation: string;
  pluginId: string | null;
  shortcuts: string[];
};

export type ShortcutSettingsPayload = {
  actions: ShortcutAction[];
};

export type ShortcutBindingsPayload = {
  bindings: Record<string, string[]>;
};
