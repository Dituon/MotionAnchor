import { useEffect, useState } from "react";

import i18n from "../i18n";
import { readStoredString, writeStoredValue } from "./storage";
import type { AppPreferences, LanguagePreference, ResolvedLanguage, ResolvedTheme, ThemePreference } from "./types";

const languagePreferenceStorageKey = "motionAnchor.languagePreference";
const themePreferenceStorageKey = "motionAnchor.themePreference";

function isLanguagePreference(value: string | null): value is LanguagePreference {
  return value === "system" || value === "en" || value === "zh";
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function getStoredLanguagePreference(): LanguagePreference {
  const stored = readStoredString(languagePreferenceStorageKey);

  return isLanguagePreference(stored) ? stored : "system";
}

function getStoredThemePreference(): ThemePreference {
  const stored = readStoredString(themePreferenceStorageKey);

  return isThemePreference(stored) ? stored : "system";
}

function getSystemLanguage(): ResolvedLanguage {
  const languages = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  const primaryLanguage = languages.find(Boolean)?.toLowerCase() ?? "en";

  return primaryLanguage.startsWith("zh") ? "zh" : "en";
}

function resolveLanguage(preference: LanguagePreference): ResolvedLanguage {
  return preference === "system" ? getSystemLanguage() : preference;
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyLanguage(language: ResolvedLanguage) {
  document.documentElement.lang = language;
  i18n.changeLanguage(language).catch(console.error);
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function initializeDocumentPreferences() {
  applyLanguage(resolveLanguage(getStoredLanguagePreference()));
  applyTheme(resolveTheme(getStoredThemePreference()));
}

export function useAppPreferences(): AppPreferences {
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>(getStoredLanguagePreference);
  const [resolvedLanguage, setResolvedLanguage] = useState<ResolvedLanguage>(() =>
    resolveLanguage(getStoredLanguagePreference()),
  );
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(getStoredThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredThemePreference()));

  useEffect(() => {
    const nextLanguage = resolveLanguage(languagePreference);

    writeStoredValue(languagePreferenceStorageKey, languagePreference);
    setResolvedLanguage(nextLanguage);
    applyLanguage(nextLanguage);
  }, [languagePreference]);

  useEffect(() => {
    const syncLanguage = () => {
      if (languagePreference === "system") {
        const nextLanguage = getSystemLanguage();

        setResolvedLanguage(nextLanguage);
        applyLanguage(nextLanguage);
      }
    };

    window.addEventListener("languagechange", syncLanguage);

    return () => window.removeEventListener("languagechange", syncLanguage);
  }, [languagePreference]);

  useEffect(() => {
    const nextTheme = resolveTheme(themePreference);

    writeStoredValue(themePreferenceStorageKey, themePreference);
    setResolvedTheme(nextTheme);
    applyTheme(nextTheme);
  }, [themePreference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      if (themePreference === "system") {
        const nextTheme = getSystemTheme();

        setResolvedTheme(nextTheme);
        applyTheme(nextTheme);
      }
    };

    mediaQuery.addEventListener("change", syncTheme);

    return () => mediaQuery.removeEventListener("change", syncTheme);
  }, [themePreference]);

  return {
    languagePreference,
    resolvedLanguage,
    setLanguagePreference: setLanguagePreferenceState,
    themePreference,
    resolvedTheme,
    setThemePreference: setThemePreferenceState,
  };
}
