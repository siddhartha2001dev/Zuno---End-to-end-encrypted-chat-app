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
          "active-item": "var(--active-item-bg)",
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
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
        "3xl": "18px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        elevated: "0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        popover: "0 8px 24px -4px rgba(0, 0, 0, 0.10), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
        modal: "0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      },
      transitionDuration: {
        fast: "120ms",
        normal: "180ms",
        smooth: "240ms",
      },
    },
  },
  plugins: [],
}

