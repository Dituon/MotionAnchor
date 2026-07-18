import type { PluginKind } from "../../plugins/types";

export type SettingsSection = "start" | "plugins" | "shortcuts" | "system";

export type PluginKindJump = {
  kind: PluginKind;
  version: number;
};
