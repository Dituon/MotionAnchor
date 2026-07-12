import React from "react";
import ReactDOM from "react-dom/client";

import "../App.css";
import "../i18n";
import { initializeDocumentPreferences } from "../preferences/useAppPreferences";
import { SiteApp } from "./SiteApp";

initializeDocumentPreferences();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SiteApp />
  </React.StrictMode>,
);
