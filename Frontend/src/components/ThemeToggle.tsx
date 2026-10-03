import React from "react";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "header";
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  showLabel = false,
  variant = "default",
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={
        variant === "header"
          ? `relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-theme-border bg-theme-bg/80 text-theme-text-muted shadow-subtle hover:text-theme-text hover:border-theme-accent/40 hover:bg-theme-surface transition-all active:scale-95 ${className}`
          : `relative inline-flex items-center gap-2 p-1.5 rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface transition-theme ${className}`
      }
    >
      <div className={variant === "header" ? "relative w-6 h-6 rounded-lg bg-theme-surface border border-theme-border-subtle flex items-center justify-center" : "relative w-4 h-4 flex items-center justify-center"}>
        {isDark ? (
          <Sun className={variant === "header" ? "w-3.5 h-3.5 text-amber-400 transition-transform duration-300 rotate-0 scale-100" : "w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100"} />
        ) : (
          <Moon className={variant === "header" ? "w-3.5 h-3.5 text-slate-600 transition-transform duration-300 rotate-0 scale-100" : "w-4 h-4 text-slate-600 transition-transform duration-200 rotate-0 scale-100"} />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );
};
