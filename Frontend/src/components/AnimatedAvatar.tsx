import React, { useState } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface AnimatedAvatarProps {
  src?: string | null;
  name?: string;
  id?: string;
  size?: AvatarSize;
  className?: string;
  showOnline?: boolean;
  isOnline?: boolean;
  isGroup?: boolean;
  onClick?: () => void;
  title?: string;
}

const sizeMap: Record<AvatarSize, { container: string; px: number; text: string; onlineBadge: string }> = {
  xs: { container: "w-6 h-6", px: 24, text: "text-[9px]", onlineBadge: "w-1.5 h-1.5 bottom-0 right-0" },
  sm: { container: "w-8 h-8", px: 32, text: "text-[11px]", onlineBadge: "w-2 h-2 bottom-0 right-0" },
  md: { container: "w-10 h-10", px: 40, text: "text-xs", onlineBadge: "w-2.5 h-2.5 bottom-0.5 right-0.5" },
  lg: { container: "w-12 h-12", px: 48, text: "text-sm", onlineBadge: "w-3 h-3 bottom-0.5 right-0.5" },
  xl: { container: "w-16 h-16", px: 64, text: "text-lg", onlineBadge: "w-3.5 h-3.5 bottom-1 right-1" },
  "2xl": { container: "w-24 h-24", px: 96, text: "text-2xl", onlineBadge: "w-5 h-5 bottom-1.5 right-1.5" },
};

// Deterministic hash from string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// 6 Refined Palettes: Restrained emerald, slate teal, subtle indigo, warm amber, muted rose, forest jade
export const AVATAR_PALETTES = [
  { id: "emerald", index: 0, name: "Emerald", color: "#0f766e", bg: "from-teal-700 to-emerald-800", ring: "border-teal-600/30", accent: "#2dd4bf" },
  { id: "cyan", index: 1, name: "Slate Teal", color: "#0284c7", bg: "from-slate-700 to-teal-800", ring: "border-cyan-600/30", accent: "#38bdf8" },
  { id: "violet", index: 2, name: "Indigo", color: "#6366f1", bg: "from-indigo-800 to-slate-800", ring: "border-indigo-600/30", accent: "#a5b4fc" },
  { id: "amber", index: 3, name: "Amber", color: "#d97706", bg: "from-amber-700 to-stone-800", ring: "border-amber-600/30", accent: "#fcd34d" },
  { id: "pink", index: 4, name: "Rose", color: "#be185d", bg: "from-rose-800 to-slate-800", ring: "border-rose-600/30", accent: "#fda4af" },
  { id: "mint", index: 5, name: "Jade Forest", color: "#065f46", bg: "from-emerald-800 to-teal-900", ring: "border-emerald-600/30", accent: "#6ee7b7" },
];

export const AVATAR_ARCHETYPES = [
  { id: "bot", index: 0, name: "Cyber Bot", icon: "🤖", desc: "Futuristic android with antenna & screen" },
  { id: "kitty", index: 1, name: "Cosmo Kitty", icon: "🐱", desc: "Playful stellar cat with pink blush" },
  { id: "astronaut", index: 2, name: "Astronaut", icon: "🚀", desc: "Cosmic voyager with tinted visor" },
  { id: "panda", index: 3, name: "Boba Panda", icon: "🐼", desc: "Sweet panda with gentle dark patches" },
  { id: "star", index: 4, name: "Spark Star", icon: "✨", desc: "Joyful smiling star with pink cheeks" },
  { id: "fox", index: 5, name: "Cosmic Fox", icon: "🦊", desc: "Clever spirit fox with pointed ears" },
  { id: "gamer", index: 6, name: "Pixel Gamer", icon: "🎮", desc: "Retro arcade pilot with neon goggles" },
  { id: "lion", index: 7, name: "Solar Lion", icon: "🦁", desc: "Regal guardian with golden mane" },
];

const PALETTES = AVATAR_PALETTES;

export const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  src,
  name = "User",
  id = "",
  size = "md",
  className = "",
  showOnline = false,
  isOnline = false,
  isGroup = false,
  onClick,
  title,
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = sizeMap[size] || sizeMap.md;
  const seed = id || name;
  const hash = hashString(seed);

  let archetype = hash % 8;
  let palette = PALETTES[hash % PALETTES.length];
  let isEmblem = false;
  let emblemEmoji = "✨";

  if (src) {
    if (src.startsWith("animated:")) {
      const parts = src.split(":");
      const aKey = parts[1];
      const pKey = parts[2];
      const archFound = AVATAR_ARCHETYPES.find((a) => a.id === aKey || String(a.index) === aKey);
      if (archFound) archetype = archFound.index;
      const palFound = AVATAR_PALETTES.find((p) => p.id === pKey || String(p.index) === pKey);
      if (palFound) palette = palFound;
    } else if (src.startsWith("emblem:")) {
      isEmblem = true;
      const parts = src.split(":");
      emblemEmoji = parts[1] || "✨";
      const pKey = parts[2];
      const palFound = AVATAR_PALETTES.find((p) => p.id === pKey || String(p.index) === pKey);
      if (palFound) palette = palFound;
    }
  }

  const hasValidCustomImage = Boolean(
    src &&
    !imageError &&
    !src.startsWith("animated:") &&
    !src.startsWith("emblem:") &&
    !src.includes("dicebear")
  );

  return (
    <div
      onClick={onClick}
      title={title || name}
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none rounded-full ${sizeConfig.container} ${
        onClick ? "cursor-pointer active:scale-95" : ""
      } ${className}`}
    >
      {/* If custom image is uploaded, render image inside rounded frame */}
      {hasValidCustomImage ? (
        <img
          src={src!}
          alt={name}
          onError={() => setImageError(true)}
          className="w-full h-full rounded-full object-cover border border-theme-border shadow-xs"
        />
      ) : isGroup ? (
        /* Group Icon */
        <div className="w-full h-full rounded-full bg-theme-elevated border border-theme-border shadow-xs overflow-hidden relative flex items-center justify-center">
          <svg viewBox="0 0 36 36" fill="none" className="w-3/5 h-3/5 text-theme-accent">
            <path
              d="M18 15a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM10.5 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM25.5 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
              fill="currentColor"
              className="opacity-90"
            />
            <path
              d="M18 18c-4.4 0-9 2.2-9 5.5V26h18v-2.5c0-3.3-4.6-5.5-9-5.5z"
              fill="currentColor"
            />
            <path
              d="M6 21.5c-2.2 1-3 2.5-3 4.5V28h6v-2.5c0-1.8.8-3.1 2.2-4zM30 21.5c2.2 1 3 2.5 3 4.5V28h-6v-2.5c0-1.8-.8-3.1-2.2-4z"
              fill="currentColor"
              className="opacity-60"
            />
          </svg>
        </div>
      ) : isEmblem ? (
        /* Emblem Avatar */
        <div className="w-full h-full rounded-full border border-theme-border shadow-xs overflow-hidden relative flex items-center justify-center">
          <div className={`relative w-full h-full rounded-full bg-gradient-to-br ${palette.bg} flex items-center justify-center overflow-hidden`}>
            <span className={`${size === "2xl" ? "text-4xl" : size === "xl" ? "text-3xl" : size === "lg" ? "text-2xl" : "text-base"} select-none`}>
              {emblemEmoji}
            </span>
          </div>
        </div>
      ) : (
        /* Algorithmic Avatar with Clean Vector Art */
        <div className="w-full h-full rounded-full border border-theme-border/60 shadow-xs overflow-hidden relative flex items-center justify-center">
          {/* Avatar Base Surface */}
          <div
            className={`relative w-full h-full rounded-full bg-gradient-to-br ${palette.bg} flex items-center justify-center overflow-hidden`}
          >
            {/* Vector Character Body */}
            <div className="w-full h-full flex items-center justify-center">

              {archetype === 0 && (
                /* Cute Cyber Bot */
                <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" fill="none">
                  {/* Antenna */}
                  <rect x="19" y="4" width="2" height="5" rx="1" fill="#ffffff" opacity="0.8" />
                  <circle cx="20" cy="3.5" r="2.5" fill="#34d399" className="animate-avatar-pulse-glow" />
                  {/* Head */}
                  <rect x="8" y="9" width="24" height="22" rx="7" fill="#ffffff" fillOpacity="0.95" />
                  {/* Ears */}
                  <rect x="5.5" y="15" width="2.5" height="10" rx="1.2" fill="#ffffff" opacity="0.8" />
                  <rect x="32" y="15" width="2.5" height="10" rx="1.2" fill="#ffffff" opacity="0.8" />
                  {/* Visor Screen */}
                  <rect x="11" y="13" width="18" height="11" rx="4" fill="#0d1b15" />
                  {/* Blinking Eyes */}
                  <g className="animate-avatar-blink">
                    <circle cx="15.5" cy="18.5" r="2" fill="#34d399" />
                    <circle cx="24.5" cy="18.5" r="2" fill="#34d399" />
                  </g>
                  {/* Mouth Line */}
                  <path d="M16 26.5q4 2 8 0" stroke="#0d1b15" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}

              {archetype === 1 && (
                /* Cosmo Kitty */
                <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" fill="none">
                  {/* Cat Ears */}
                  <polygon points="10,13 13,5 18,12" fill="#ffffff" fillOpacity="0.95" />
                  <polygon points="12,12 14,7 17,11" fill="#f472b6" opacity="0.7" />
                  <polygon points="30,13 27,5 22,12" fill="#ffffff" fillOpacity="0.95" />
                  <polygon points="28,12 26,7 23,11" fill="#f472b6" opacity="0.7" />
                  {/* Head */}
                  <circle cx="20" cy="21" r="12" fill="#ffffff" fillOpacity="0.95" />
                  {/* Blinking Eyes */}
                  <g className="animate-avatar-blink">
                    <circle cx="15.5" cy="19.5" r="2" fill="#0f172a" />
                    <circle cx="16" cy="19" r="0.7" fill="#ffffff" />
                    <circle cx="24.5" cy="19.5" r="2" fill="#0f172a" />
                    <circle cx="25" cy="19" r="0.7" fill="#ffffff" />
                  </g>
                  {/* Nose & Mouth */}
                  <polygon points="19,22.5 21,22.5 20,24" fill="#f472b6" />
                  <path d="M18 25q2 1.5 4 0" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Cheeks */}
                  <circle cx="13" cy="22.5" r="1.5" fill="#f472b6" opacity="0.5" />
                  <circle cx="27" cy="22.5" r="1.5" fill="#f472b6" opacity="0.5" />
                </svg>
              )}

              {archetype === 2 && (
                /* Astronaut Explorer */
                <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" fill="none">
                  {/* Helmet Outer */}
                  <circle cx="20" cy="20" r="13" fill="#ffffff" fillOpacity="0.95" />
                  {/* Glass Visor */}
                  <ellipse cx="20" cy="19" rx="9" ry="7.5" fill="#0f172a" />
                  {/* Visor Reflection */}
                  <path
                    d="M13.5 16.5Q17 14 24 15.5"
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  {/* Starry Blinking Eyes inside Visor */}
                  <g className="animate-avatar-blink">
                    <circle cx="16.5" cy="19" r="1.6" fill="#38bdf8" />
                    <circle cx="23.5" cy="19" r="1.6" fill="#38bdf8" />
                  </g>
                  {/* Microphone */}
                  <circle cx="26" cy="25" r="1.5" fill="#38bdf8" />
                </svg>
              )}

              {archetype === 3 && (
                /* Boba Panda */
                <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" fill="none">
                  {/* Panda Ears */}
                  <circle cx="11" cy="11" r="4" fill="#0f172a" />
                  <circle cx="29" cy="11" r="4" fill="#0f172a" />
                  {/* Head */}
                  <circle cx="20" cy="21" r="12" fill="#ffffff" fillOpacity="0.95" />
                  {/* Eye Patches */}
                  <ellipse cx="15" cy="20" rx="3.5" ry="3" fill="#0f172a" />
                  <ellipse cx="25" cy="20" rx="3.5" ry="3" fill="#0f172a" />
                  {/* Blinking Eyes */}
                  <g className="animate-avatar-blink">
                    <circle cx="15.5" cy="19.5" r="1.6" fill="#ffffff" />
                    <circle cx="24.5" cy="19.5" r="1.6" fill="#ffffff" />
                  </g>
                  {/* Nose */}
                  <ellipse cx="20" cy="23.5" rx="2" ry="1.4" fill="#0f172a" />
                  <path d="M18.5 26q1.5 1 3 0" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )}

              {archetype === 4 && (
                /* Spark Star */
                <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" fill="none">
                  {/* Round Face */}
                  <circle cx="20" cy="20" r="13" fill="#ffffff" fillOpacity="0.95" />
                  {/* Cute Eyebrows */}
                  <path d="M13 14.5q2.5 -1.5 5 0" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M22 14.5q2.5 -1.5 5 0" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Blinking Eyes */}
                  <g className="animate-avatar-blink">
                    <circle cx="15.5" cy="18.5" r="2.2" fill="#0f172a" />
                    <circle cx="16.2" cy="17.8" r="0.8" fill="#ffffff" />
                    <circle cx="24.5" cy="18.5" r="2.2" fill="#0f172a" />
                    <circle cx="25.2" cy="17.8" r="0.8" fill="#ffffff" />
                  </g>
                  {/* Happy Smile */}
                  <path d="M15 23q5 4 10 0" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />
                  {/* Blushing Cheeks */}
                  <circle cx="12" cy="22" r="2" fill="#fb7185" opacity="0.6" />
                  <circle cx="28" cy="22" r="2" fill="#fb7185" opacity="0.6" />
                </svg>
              )}

              {archetype === 5 && (
                /* Cosmic Fox */
                <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" fill="none">
                  {/* Pointed Fox Ears */}
                  <polygon points="9,14 13,4 19,13" fill="#ea580c" />
                  <polygon points="12,13 14,7 18,12" fill="#ffffff" opacity="0.9" />
                  <polygon points="31,14 27,4 21,13" fill="#ea580c" />
                  <polygon points="28,13 26,7 22,12" fill="#ffffff" opacity="0.9" />
                  {/* Head */}
                  <circle cx="20" cy="21" r="12" fill="#f97316" />
                  {/* White Muzzle cheeks */}
                  <path d="M10 24 C13 21, 16 23, 20 25 C24 23, 27 21, 30 24 C28 29, 24 33, 20 33 C16 33, 12 29, 10 24 Z" fill="#ffffff" />
                  {/* Blinking Eyes */}
                  <g className="animate-avatar-blink">
                    <circle cx="15.5" cy="19" r="1.8" fill="#0f172a" />
                    <circle cx="16" cy="18.5" r="0.6" fill="#ffffff" />
                    <circle cx="24.5" cy="19" r="1.8" fill="#0f172a" />
                    <circle cx="25" cy="18.5" r="0.6" fill="#ffffff" />
                  </g>
                  {/* Nose */}
                  <polygon points="19,25.5 21,25.5 20,27" fill="#0f172a" />
                  <circle cx="13" cy="22" r="1.2" fill="#fb923c" opacity="0.6" />
                  <circle cx="27" cy="22" r="1.2" fill="#fb923c" opacity="0.6" />
                </svg>
              )}

              {archetype === 6 && (
                /* Pixel Gamer */
                <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" fill="none">
                  {/* Headset arc */}
                  <path d="M9 19 A11 11 0 0 1 31 19" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Headphone ear pads */}
                  <rect x="7" y="17" width="3" height="8" rx="1.5" fill="#38bdf8" />
                  <rect x="30" y="17" width="3" height="8" rx="1.5" fill="#38bdf8" />
                  {/* Face Base */}
                  <circle cx="20" cy="21" r="11" fill="#ffffff" fillOpacity="0.95" />
                  {/* Futuristic Neon Visor Glasses */}
                  <rect x="12" y="17" width="16" height="6.5" rx="3" fill="#0f172a" />
                  <rect x="13.5" y="18.5" width="13" height="3.5" rx="1.5" fill="#38bdf8" opacity="0.85" className="animate-avatar-pulse-glow" />
                  {/* Smile */}
                  <path d="M16 26.5q4 2 8 0" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}

              {archetype === 7 && (
                /* Solar Lion */
                <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" fill="none">
                  {/* Radiant Sun Mane */}
                  <circle cx="20" cy="20" r="14" fill="#fbbf24" opacity="0.9" />
                  {/* Round Ears */}
                  <circle cx="11" cy="12" r="3.5" fill="#f59e0b" />
                  <circle cx="29" cy="12" r="3.5" fill="#f59e0b" />
                  {/* Face */}
                  <circle cx="20" cy="21" r="10.5" fill="#ffffff" fillOpacity="0.95" />
                  {/* Blinking Eyes */}
                  <g className="animate-avatar-blink">
                    <circle cx="16" cy="19.5" r="1.8" fill="#78350f" />
                    <circle cx="16.5" cy="19" r="0.6" fill="#ffffff" />
                    <circle cx="24" cy="19.5" r="1.8" fill="#78350f" />
                    <circle cx="24.5" cy="19" r="0.6" fill="#ffffff" />
                  </g>
                  {/* Golden Nose & Whiskers */}
                  <polygon points="19,23.5 21,23.5 20,25" fill="#d97706" />
                  <path d="M18 26q2 1.5 4 0" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Cheeks */}
                  <circle cx="13.5" cy="22.5" r="1.5" fill="#fbbf24" opacity="0.6" />
                  <circle cx="26.5" cy="22.5" r="1.5" fill="#fbbf24" opacity="0.6" />
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Online Status Indicator */}
      {showOnline && (
        <span
          className={`absolute rounded-full ${sizeConfig.onlineBadge} ${
            isOnline
              ? "bg-emerald-500 ring-2 ring-theme-bg"
              : "bg-slate-400 dark:bg-slate-600 ring-2 ring-theme-bg"
          }`}
        />
      )}
    </div>
  );
};
