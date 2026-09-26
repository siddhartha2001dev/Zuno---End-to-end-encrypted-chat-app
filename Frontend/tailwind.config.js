/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        theme: {
          bg: "var(--bg-app)",
          sidebar: "var(--bg-sidebar)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          border: "var(--border-theme)",
          "border-subtle": "var(--border-subtle)",
          text: "var(--text-primary)",
          "text-secondary": "var(--text-secondary)",
          "text-muted": "var(--text-muted)",
          accent: "var(--accent)",
          "accent-hover": "var(--accent-hover)",
          "accent-subtle": "var(--accent-subtle)",
          "incoming-bg": "var(--msg-incoming-bg)",
          "incoming-border": "var(--msg-incoming-border)",
          "incoming-text": "var(--msg-incoming-text)",
          "outgoing-bg": "var(--msg-outgoing-bg)",
          "outgoing-text": "var(--msg-outgoing-text)",
          input: "var(--input-bg)",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        card: "0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)",
        elevated: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        popover: "0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)",
        glass: "0 8px 32px 0 rgba(16, 185, 129, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.35)",
        "glass-emerald": "0 6px 20px -3px rgba(16, 185, 129, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(52, 211, 153, 0.15)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
      },
    },
  },
  plugins: [],
}
