import "./animation";
import "./App.css";
import { OverlayStage } from "./overlay/OverlayStage";
import { initializeDocumentPreferences, useAppPreferences } from "./preferences/useAppPreferences";
import { SettingsPage } from "./settings/SettingsPage";

function getWindowType() {
  return new URLSearchParams(window.location.search).get("window");
}

initializeDocumentPreferences();

function App() {
  const preferences = useAppPreferences();
  const windowType = getWindowType();

  if (windowType === "config") {
    return <SettingsPage preferences={preferences} />;
  }

  return <OverlayStage />;
}

export default App;
