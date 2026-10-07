import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "blind-guides-theme";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isThemeMode(stored) ? stored : "system";
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme(): {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
} {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemTheme());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return { theme, resolvedTheme, setTheme };
}
