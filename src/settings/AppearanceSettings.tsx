import { Card, Description, Label, ListBox, Select } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { AppPreferences, LanguagePreference, ThemePreference } from "../preferences/types";

function PreferenceSelect<T extends string>({
  description,
  label,
  onChange,
  options,
  value,
}: {
  description: string;
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <Select
      fullWidth
      value={value}
      variant="secondary"
      onChange={(nextValue) => {
        if (typeof nextValue === "string") {
          onChange(nextValue as T);
        }
      }}
    >
      <Label>{label}</Label>
      <Description>{description}</Description>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function AppearanceSettings({ preferences }: { preferences: AppPreferences }) {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("settings.appearanceTitle")}</Card.Title>
          <Card.Description>{t("settings.appearanceDescription")}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content>
        <PreferenceSelect<LanguagePreference>
          description={t("settings.languageDescription")}
          label={t("common.language")}
          value={preferences.languagePreference}
          onChange={preferences.setLanguagePreference}
          options={[
            { label: t("common.auto"), value: "system" },
            { label: "English", value: "en" },
            { label: "中文", value: "zh" },
          ]}
        />
        <PreferenceSelect<ThemePreference>
          description={t("settings.themeDescription")}
          label={t("common.theme")}
          value={preferences.themePreference}
          onChange={preferences.setThemePreference}
          options={[
            { label: t("common.auto"), value: "system" },
            { label: t("common.light"), value: "light" },
            { label: t("common.dark"), value: "dark" },
          ]}
        />
      </Card.Content>
    </Card>
  );
}
