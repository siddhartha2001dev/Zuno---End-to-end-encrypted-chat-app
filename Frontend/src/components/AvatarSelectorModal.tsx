import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  AnimatedAvatar,
  AVATAR_ARCHETYPES,
  AVATAR_PALETTES,
} from "./AnimatedAvatar";
import {
  X,
  Sparkles,
  Camera,
  Check,
  RotateCcw,
  Loader2,
  Smile,
  Palette,
} from "lucide-react";

interface AvatarSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCropPicker: () => void;
}

type TabType = "characters" | "emblems" | "gallery";

const EMBLEMS = [
  { emoji: "🔥", name: "Fire Blaze" },
  { emoji: "⚡", name: "Lightning Bolt" },
  { emoji: "🚀", name: "Rocket" },
  { emoji: "👑", name: "Royal Crown" },
  { emoji: "💎", name: "Diamond" },
  { emoji: "🌸", name: "Cherry Blossom" },
  { emoji: "🎮", name: "Game Pad" },
  { emoji: "🛡️", name: "Guardian Shield" },
  { emoji: "🦊", name: "Spirit Fox" },
  { emoji: "🐱", name: "Star Kitty" },
  { emoji: "🦁", name: "Solar Lion" },
  { emoji: "🐼", name: "Boba Panda" },
  { emoji: "🦄", name: "Magic Unicorn" },
  { emoji: "🍀", name: "Lucky Clover" },
  { emoji: "🪐", name: "Cosmic Planet" },
  { emoji: "🌙", name: "Crescent Moon" },
  { emoji: "☀️", name: "Golden Sun" },
  { emoji: "👾", name: "Retro Alien" },
  { emoji: "🎯", name: "Bullseye" },
  { emoji: "🎧", name: "Studio Beat" },
  { emoji: "🏆", name: "Champion Trophy" },
  { emoji: "💫", name: "Dizzy Star" },
  { emoji: "💖", name: "Sparkling Heart" },
  { emoji: "❄️", name: "Ice Crystal" },
];

export const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  isOpen,
  onClose,
  onOpenCropPicker,
}) => {
  const { user, setAvatarPreset, removeAvatar } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("characters");
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>("bot");
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>("emerald");
  const [selectedEmblem, setSelectedEmblem] = useState<string>("🔥");
  const [selectedGalleryAvatar, setSelectedGalleryAvatar] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize preview state based on current user avatar
  useEffect(() => {
    if (!isOpen || !user) return;
    setErrorMessage(null);
    setSaveSuccess(false);

    if (user.avatar) {
      if (user.avatar.startsWith("animated:")) {
        const parts = user.avatar.split(":");
        if (parts[1]) setSelectedArchetypeId(parts[1]);
        if (parts[2]) setSelectedPaletteId(parts[2]);
        setActiveTab("characters");
      } else if (user.avatar.startsWith("emblem:")) {
        const parts = user.avatar.split(":");
        if (parts[1]) setSelectedEmblem(parts[1]);
        if (parts[2]) setSelectedPaletteId(parts[2]);
        setActiveTab("emblems");
      } else {
        setSelectedGalleryAvatar(user.avatar);
      }
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  // Determine current preview avatar string
  let previewAvatarSrc: string | null = null;
  let previewTitle = "Custom Avatar";

  if (activeTab === "characters") {
    previewAvatarSrc = `animated:${selectedArchetypeId}:${selectedPaletteId}`;
    const arch = AVATAR_ARCHETYPES.find((a) => a.id === selectedArchetypeId);
    const pal = AVATAR_PALETTES.find((p) => p.id === selectedPaletteId);
    previewTitle = `${arch?.name || "Character"} • ${pal?.name || "Theme"}`;
  } else if (activeTab === "emblems") {
    previewAvatarSrc = `emblem:${selectedEmblem}:${selectedPaletteId}`;
    const emb = EMBLEMS.find((e) => e.emoji === selectedEmblem);
    const pal = AVATAR_PALETTES.find((p) => p.id === selectedPaletteId);
    previewTitle = `${emb?.name || selectedEmblem} • ${pal?.name || "Theme"}`;
  } else if (activeTab === "gallery") {
    previewAvatarSrc = selectedGalleryAvatar || user.avatar;
    previewTitle = "Gallery Avatar";
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      if (!previewAvatarSrc) {
        throw new Error("No avatar selected");
      }

      await setAvatarPreset(previewAvatarSrc);
      setSaveSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save avatar");
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      await removeAvatar();
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset avatar");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg bg-theme-surface border border-theme-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-theme-text leading-tight">Choose Your Avatar</h2>
              <p className="text-[11px] text-theme-text-muted">Customize your persona & color aura</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Banner */}
        <div className="p-4 bg-gradient-to-b from-theme-bg/90 to-theme-surface border-b border-theme-border/60 flex items-center justify-center gap-4">
          <div className="relative">
            <div className="rounded-full ring-4 ring-emerald-500/25 shadow-lg">
              <AnimatedAvatar
                src={previewAvatarSrc}
                name={user.name}
                id={user.id}
                size="xl"
                showOnline={true}
                isOnline={true}
              />
            </div>
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Live Preview
            </span>
            <h3 className="text-sm font-bold text-theme-text leading-tight">
              {previewTitle}
            </h3>
            <p className="text-xs text-theme-text-muted mt-0.5">
              @{user.chatId}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 pt-3 border-b border-theme-border/40 gap-1 bg-theme-surface">
          <button
            type="button"
            onClick={() => setActiveTab("characters")}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-xl border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "characters"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Characters (8)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("emblems")}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-xl border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "emblems"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emblems (24)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCropPicker();
            }}
            className="flex-1 py-2 text-xs font-semibold rounded-t-xl border-b-2 border-transparent text-theme-text-muted hover:text-emerald-500 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Upload custom photo"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: CHARACTERS */}
          {activeTab === "characters" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-theme-text mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Choose Character Archetype</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {AVATAR_ARCHETYPES.map((arch) => {
                    const isSelected = selectedArchetypeId === arch.id;
                    const demoSrc = `animated:${arch.id}:${selectedPaletteId}`;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => setSelectedArchetypeId(arch.id)}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 relative cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 scale-[1.02]"
                            : "border-theme-border bg-theme-bg/60 hover:border-emerald-500/40 hover:bg-theme-bg"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <AnimatedAvatar
                          src={demoSrc}
                          name={arch.name}
                          size="lg"
                        />
                        <span className="text-xs font-bold text-theme-text mt-0.5">
                          {arch.name}
                        </span>
                        <span className="text-[10px] text-theme-text-muted leading-tight line-clamp-1">
                          {arch.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Glowing Aura Color Theme */}
              <div>
                <h4 className="text-xs font-bold text-theme-text mb-2.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Select Glowing Color Theme</span>
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {AVATAR_PALETTES.map((pal) => {
                    const isSelected = selectedPaletteId === pal.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setSelectedPaletteId(pal.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 scale-105"
                            : "border-theme-border bg-theme-bg hover:border-emerald-500/30"
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full shadow-xs border border-white/20"
                          style={{ backgroundColor: pal.color }}
                        />
                        <span className="text-[10px] font-semibold text-theme-text truncate w-full text-center">
                          {pal.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMBLEMS */}
          {activeTab === "emblems" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-theme-text mb-2.5 flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pick an Emblem Icon</span>
                </h4>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {EMBLEMS.map((emb) => {
                    const isSelected = selectedEmblem === emb.emoji;
                    return (
                      <button
                        key={emb.emoji}
                        type="button"
                        onClick={() => setSelectedEmblem(emb.emoji)}
                        className={`h-11 flex items-center justify-center text-2xl rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/25 scale-110"
                            : "border-theme-border bg-theme-bg hover:bg-theme-surface hover:scale-105"
                        }`}
                        title={emb.name}
                      >
                        {emb.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Glowing Aura Color Theme for Emblem */}
              <div>
                <h4 className="text-xs font-bold text-theme-text mb-2.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Emblem Aura Color</span>
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {AVATAR_PALETTES.map((pal) => {
                    const isSelected = selectedPaletteId === pal.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setSelectedPaletteId(pal.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 scale-105"
                            : "border-theme-border bg-theme-bg hover:border-emerald-500/30"
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full shadow-xs border border-white/20"
                          style={{ backgroundColor: pal.color }}
                        />
                        <span className="text-[10px] font-semibold text-theme-text truncate w-full text-center">
                          {pal.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-theme-border bg-theme-surface flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors disabled:opacity-50 cursor-pointer"
            title="Reset to algorithmic seed avatar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-theme-border text-xs font-semibold text-theme-text hover:bg-theme-bg transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md hover:shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Avatar</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
