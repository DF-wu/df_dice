export const THEMES = [
  { key: "casino", label: "賭城夜" },
  { key: "fortune", label: "新春紅金" },
  { key: "neon", label: "霓虹" },
  { key: "daylight", label: "日光" },
  { key: "paper", label: "紙墨" },
];

export const DEFAULT_THEME = THEMES[0].key;

export function isTheme(key) {
  return THEMES.some((theme) => theme.key === key);
}
