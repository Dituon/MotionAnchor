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

async function getStoredLanguagePreference(): Promise<LanguagePreference> {
  const stored = await readStoredString(languagePreferenceStorageKey);

  return isLanguagePreference(stored) ? stored : "system";
}

async function getStoredThemePreference(): Promise<ThemePreference> {
  const stored = await readStoredString(themePreferenceStorageKey);

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

export async function initializeDocumentPreferences() {
  const [languagePreference, themePreference] = await Promise.all([
    getStoredLanguagePreference(),
    getStoredThemePreference(),
  ]);

  applyLanguage(resolveLanguage(languagePreference));
  applyTheme(resolveTheme(themePreference));
}

export function useAppPreferences(): AppPreferences {
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>("system");
  const [resolvedLanguage, setResolvedLanguage] = useState<ResolvedLanguage>(() => resolveLanguage("system"));
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme("system"));

  useEffect(() => {
    let cancelled = false;

    Promise.all([getStoredLanguagePreference(), getStoredThemePreference()])
      .then(([nextLanguagePreference, nextThemePreference]) => {
        if (cancelled) {
          return;
        }

        const nextLanguage = resolveLanguage(nextLanguagePreference);
        const nextTheme = resolveTheme(nextThemePreference);

        setLanguagePreferenceState(nextLanguagePreference);
        setResolvedLanguage(nextLanguage);
        applyLanguage(nextLanguage);
        setThemePreferenceState(nextThemePreference);
        setResolvedTheme(nextTheme);
        applyTheme(nextTheme);
        setPreferencesLoaded(true);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) {
      return;
    }

    const nextLanguage = resolveLanguage(languagePreference);

    writeStoredValue(languagePreferenceStorageKey, languagePreference).catch(console.error);
    setResolvedLanguage(nextLanguage);
    applyLanguage(nextLanguage);
  }, [languagePreference, preferencesLoaded]);

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
    if (!preferencesLoaded) {
      return;
    }

    const nextTheme = resolveTheme(themePreference);

    writeStoredValue(themePreferenceStorageKey, themePreference).catch(console.error);
    setResolvedTheme(nextTheme);
    applyTheme(nextTheme);
  }, [themePreference, preferencesLoaded]);

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
