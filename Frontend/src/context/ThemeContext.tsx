import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
export type AccentTheme = "violet" | "ocean" | "rose" | "slate";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accent: AccentTheme;
  setAccent: (accent: AccentTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        return stored;
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "dark";
    }
  });
  const [accent, setAccentState] = useState<AccentTheme>(() => {
    try {
      const stored = localStorage.getItem("accent-theme");
      return stored === "ocean" || stored === "rose" || stored === "slate" || stored === "violet"
        ? stored
        : "violet";
    } catch {
      return "violet";
    }
  });

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
    root.setAttribute("data-accent", accent);
  };

  const setAccent = (newAccent: AccentTheme) => {
    setAccentState(newAccent);
    document.documentElement.setAttribute("data-accent", newAccent);
    try {
      localStorage.setItem("accent-theme", newAccent);
    } catch (e) {
      console.warn("Could not save accent preference to localStorage", e);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch (e) {
      console.warn("Could not save theme preference to localStorage", e);
    }
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Sync on mount and listen to OS preference changes
  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("theme");
      if (!stored) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
