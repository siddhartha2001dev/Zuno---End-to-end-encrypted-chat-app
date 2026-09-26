import React from "react";

interface ZunoLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showWordmark?: boolean;
}

export const ZunoLogo: React.FC<ZunoLogoProps> = ({
  size = "md",
  className = "",
  showWordmark = false,
}) => {
  const sizeMap = {
    sm: { box: 28, text: "text-sm", gap: "gap-2" },
    md: { box: 34, text: "text-base", gap: "gap-2.5" },
    lg: { box: 42, text: "text-xl", gap: "gap-3" },
    xl: { box: 52, text: "text-2xl", gap: "gap-3.5" },
  };

  const { box, text, gap } = sizeMap[size];

  return (
    <div className={`inline-flex items-center ${gap} select-none ${className}`}>
      {/* Brand Icon using zuno-favicon.ico */}
      <img
        src="/zuno-favicon.ico"
        alt="Zuno"
        width={box}
        height={box}
        className="rounded-xl flex-shrink-0 transition-transform hover:scale-105 duration-200 object-contain"
        style={{
          width: box,
          height: box,
        }}
      />

      {/* Wordmark */}
      {showWordmark && (
        <span className={`font-extrabold tracking-tight text-theme-text font-sans leading-none ${text}`}>
          Zuno
        </span>
      )}
    </div>
  );
};
