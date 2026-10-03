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
          ? `relative inline-flex items-center w-[68px] h-9 rounded-full border border-theme-border bg-theme-bg p-1 text-theme-text-muted shadow-subtle hover:border-theme-accent/40 transition-all active:scale-95 ${className}`
          : `relative inline-flex items-center gap-2 p-1.5 rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface transition-theme ${className}`
      }
    >
      <span className={variant === "header" ? "absolute left-2.5 text-amber-500/80" : "hidden"} aria-hidden="true"><Sun className="w-3 h-3" /></span>
      <span className={variant === "header" ? "absolute right-2.5 text-indigo-500/80" : "hidden"} aria-hidden="true"><Moon className="w-3 h-3" /></span>
      <div className={variant === "header" ? `relative z-10 w-7 h-7 rounded-full bg-theme-surface border border-theme-border-subtle flex items-center justify-center shadow-xs transition-transform duration-200 ${isDark ? "translate-x-7" : "translate-x-0"}` : "relative w-4 h-4 flex items-center justify-center"}>
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
