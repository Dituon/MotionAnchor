import React from "react";
import ReactDOM from "react-dom/client";

import "@motion-anchor/app/i18n";
import { initializeDocumentPreferences } from "@motion-anchor/app/preferences/useAppPreferences";
import { SiteApp } from "./SiteApp";
import "./site.css";

initializeDocumentPreferences();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SiteApp />
  </React.StrictMode>,
);
