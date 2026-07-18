import { Card } from "@heroui/react";

import type { AppPreferences } from "../../preferences/types";
import { WindowTitleBar, type WindowTitleBarControls } from "../WindowTitleBar";
import type { SettingsRuntime } from "../settingsRuntime";
import type { SettingsModel } from "../model/useSettingsModel";
import { OverlayVisibilityChip } from "./OverlayVisibilityChip";
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsWorkspace } from "./SettingsWorkspace";
import { useContainerBreakpoints } from "./useContainerBreakpoints";

export function SettingsLayout({
  model,
  openExternalUrl,
  preferences,
  runtime,
  windowControls,
}: {
  model: SettingsModel;
  openExternalUrl?: (url: string) => void | Promise<void>;
  preferences: AppPreferences;
  runtime: SettingsRuntime;
  windowControls?: WindowTitleBarControls;
}) {
  const layout = useContainerBreakpoints();

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <WindowTitleBar
        controls={windowControls}
        leadingContent={
          <OverlayVisibilityChip
            isBusy={model.overlayBusy}
            isVisible={model.overlayVisible}
            onToggle={model.toggleOverlay}
          />
        }
      />

      {model.error && (
        <Card className="mx-3 shrink-0">
          <Card.Content>{model.error}</Card.Content>
        </Card>
      )}

      <div
        ref={layout.ref}
        className={cx("flex min-h-0 flex-1 flex-col overflow-hidden", layout.isMd && "flex-row")}
      >
        <SettingsSidebar
          activePluginKind={model.activePluginKind}
          activeSection={model.activeSection}
          isExpandedTopLayout={layout.isSm}
          isSidebarLayout={layout.isMd}
          onSelectPluginKind={model.selectPluginKind}
          onSelectSection={model.selectSection}
        />
        <SettingsWorkspace
          model={model}
          preferences={preferences}
          runtime={runtime}
          openExternalUrl={openExternalUrl}
        />
      </div>
    </main>
  );
}

function cx(...classNames: Array<string | false>) {
  return classNames.filter(Boolean).join(" ");
}
