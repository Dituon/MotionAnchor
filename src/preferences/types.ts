export type LanguagePreference = "system" | "en" | "zh";
export type ResolvedLanguage = "en" | "zh";
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export type AppPreferences = {
  languagePreference: LanguagePreference;
  resolvedLanguage: ResolvedLanguage;
  setLanguagePreference: (preference: LanguagePreference) => void;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (preference: ThemePreference) => void;
};
