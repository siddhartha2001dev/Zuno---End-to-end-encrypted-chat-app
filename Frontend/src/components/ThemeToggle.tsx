import React from "react";
import { useTheme } from "../context/ThemeContext";
import type { AccentTheme } from "../context/ThemeContext";
import { Sun, Moon, Palette } from "lucide-react";
import { useState } from "react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "header";
}

const ACCENTS: { id: AccentTheme; label: string; color: string }[] = [
  { id: "violet", label: "Violet", color: "#6956d8" },
  { id: "ocean", label: "Ocean", color: "#2878c8" },
  { id: "rose", label: "Rose", color: "#c04b78" },
  { id: "slate", label: "Slate", color: "#53657a" },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  showLabel = false,
  variant = "default",
}) => {
  const { theme, toggleTheme } = useTheme();
  const { accent, setAccent } = useTheme();
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const isDark = theme === "dark";

  const toggle = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={
        variant === "header"
          ? `relative inline-flex items-center w-[58px] h-7 rounded-full border border-theme-border bg-theme-bg p-0.5 text-theme-text-muted shadow-subtle hover:border-theme-accent/40 transition-all active:scale-95 ${className}`
          : `relative inline-flex items-center gap-2 p-1.5 rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface transition-theme ${className}`
      }
    >
      <div className={variant === "header" ? `relative z-10 w-6 h-6 rounded-full bg-theme-surface border border-theme-border-subtle text-theme-accent flex items-center justify-center shadow-xs transition-transform duration-200 ${isDark ? "translate-x-[29px]" : "translate-x-0"}` : "relative w-4 h-4 flex items-center justify-center"}>
        {isDark ? (
          <Moon className="w-3.5 h-3.5 transition-transform duration-300" />
        ) : (
          <Sun className="w-3.5 h-3.5 transition-transform duration-300" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );

  if (variant !== "header") return toggle;

  return (
    <div className="relative inline-flex items-center gap-1">
      {toggle}
      <button
        type="button"
        onClick={() => setShowAccentPicker((open) => !open)}
        aria-label="Choose accent color"
        title="Choose accent color"
        className="w-7 h-7 rounded-full border border-theme-border bg-theme-bg text-theme-accent flex items-center justify-center hover:bg-theme-surface hover:border-theme-accent/40 transition-all active:scale-95"
      >
        <Palette className="w-3.5 h-3.5" />
      </button>
      {showAccentPicker && (
        <div className="absolute right-0 top-full mt-2 z-50 w-36 rounded-xl border border-theme-border bg-theme-surface p-1.5 shadow-modal">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-theme-text-muted">Accent</p>
          {ACCENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setAccent(item.id); setShowAccentPicker(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-theme-text hover:bg-theme-bg"
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="flex-1 text-left">{item.label}</span>
              {accent === item.id && <span className="w-1.5 h-1.5 rounded-full bg-theme-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
