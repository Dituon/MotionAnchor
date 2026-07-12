import "./animation";
import "./App.css";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { OverlayStage } from "./overlay/OverlayStage";
import { initializeDocumentPreferences, useAppPreferences } from "./preferences/useAppPreferences";
import { SettingsPage } from "./settings/SettingsPage";
import { tauriSettingsRuntime } from "./settings/settingsRuntime";

function getWindowType() {
  return new URLSearchParams(window.location.search).get("window");
}

initializeDocumentPreferences();

function App() {
  const preferences = useAppPreferences();
  const windowType = getWindowType();

  if (windowType === "config") {
    return (
      <SettingsPage
        preferences={preferences}
        runtime={tauriSettingsRuntime}
        windowControls={{
          onClose: () => getCurrentWindow().close().catch(console.error),
          onMinimize: () => getCurrentWindow().minimize().catch(console.error),
        }}
        openExternalUrl={async (url) => {
          try {
            await openUrl(url);
          } catch (error) {
            console.error("Failed to open external URL", error);
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }}
      />
    );
  }

  return <OverlayStage />;
}

export default App;
