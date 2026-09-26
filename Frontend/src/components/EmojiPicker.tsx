import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Clock,
  Smile,
  Heart,
  ThumbsUp,
  PawPrint,
  Utensils,
  Lightbulb,
  X,
} from "lucide-react";

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  emojis: string[];
}

const DEFAULT_RECENTS = ["😂", "❤️", "🔥", "👍", "😍", "😊", "🎉", "🥺", "🙌", "💯", "👏", "✨", "🤔", "🤣", "😭", "🚀"];

const KEYWORD_MAP: { keywords: string[]; emojis: string[] }[] = [
  { keywords: ["smile", "happy", "joy", "grin", "glad", "yay", "cheerful"], emojis: ["😀", "😃", "😄", "😁", "😊", "🙂", "🥰", "🥳", "✨", "😇"] },
  { keywords: ["laugh", "lol", "rofl", "funny", "haha", "lmao"], emojis: ["😂", "🤣", "😆", "😹"] },
  { keywords: ["love", "heart", "romance", "crush", "kiss", "cute"], emojis: ["❤️", "💖", "💕", "😍", "😘", "🥰", "💗", "💓", "💘", "💌", "❣️", "💞"] },
  { keywords: ["cry", "sad", "tear", "sobbing", "unhappy", "depressed"], emojis: ["😭", "😢", "🥺", "😥", "😓", "😔", "💔", "😞"] },
  { keywords: ["fire", "hot", "lit", "burn", "flame"], emojis: ["🔥", "💥", "✨", "⚡"] },
  { keywords: ["thumbs", "up", "like", "agree", "yes", "ok", "cool"], emojis: ["👍", "👌", "🙌", "👏", "🤝", "✅", "💯"] },
  { keywords: ["sunglasses", "shades", "swag", "nerd"], emojis: ["😎", "🕶️", "🤙", "🤓", "🧐"] },
  { keywords: ["party", "celebrate", "birthday", "congrats", "cheers"], emojis: ["🎉", "🎊", "🥳", "🍾", "🥂", "🎂", "🎈"] },
  { keywords: ["angry", "mad", "rage", "furious"], emojis: ["😡", "😠", "🤬", "😤", "👿"] },
  { keywords: ["dog", "puppy", "bark", "pet"], emojis: ["🐶", "🐕", "🦮", "🐩"] },
  { keywords: ["cat", "kitty", "kitten", "meow"], emojis: ["🐱", "🐈", "😻", "😹"] },
  { keywords: ["food", "eat", "hungry", "pizza", "burger", "tasty", "yummy"], emojis: ["🍕", "🍔", "🍟", "🥪", "🌮", "🥗", "🍣", "🍜", "🍩", "🍰", "🥓", "🥩"] },
  { keywords: ["coffee", "tea", "drink", "beer", "wine"], emojis: ["☕", "🍵", "🧋", "🥤", "🍺", "🍻", "🍷", "🍸"] },
  { keywords: ["star", "sparkle", "shine", "magic"], emojis: ["⭐", "🌟", "✨", "💫", "🔮"] },
  { keywords: ["money", "cash", "rich", "dollar"], emojis: ["💵", "💰", "💸", "🤑", "💎"] },
  { keywords: ["music", "rock", "song", "guitar", "dance"], emojis: ["🎸", "🎧", "🎤", "🎹", "🕺", "💃", "🎵", "🎶"] },
  { keywords: ["car", "drive", "travel", "plane", "rocket"], emojis: ["🚗", "🏎️", "✈️", "🚀", "🛸", "🛵"] },
  { keywords: ["sleep", "tired", "bed", "rest", "night"], emojis: ["😴", "🥱", "💤", "😪"] },
  { keywords: ["kiss", "smooch"], emojis: ["😘", "😗", "😚", "💋"] },
  { keywords: ["eye", "look", "see", "watch"], emojis: ["👀", "👁️", "🧐"] },
  { keywords: ["thinking", "think", "hmm", "ponder", "wonder"], emojis: ["🤔", "🧐", "🤨"] },
  { keywords: ["clap", "applause", "bravo"], emojis: ["👏", "🙌", "🥳"] },
  { keywords: ["skull", "dead", "ghost", "halloween"], emojis: ["💀", "☠️", "👻", "🎃"] },
];

const EMOJI_CATEGORIES: Category[] = [
  {
    id: "smileys",
    name: "Smileys & Emotion",
    icon: <Smile className="w-4 h-4" />,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
      "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐",
      "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
      "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮",
      "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓",
      "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻",
      "👽", "👾", "🤖"
    ],
  },
  {
    id: "gestures",
    name: "People & Gestures",
    icon: <ThumbsUp className="w-4 h-4" />,
    emojis: [
      "👍", "👎", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵",
      "🦶", "👂", "🦻", "👃", "👀", "👁️", "👅", "👄", "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳",
      "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
      "🫵", "✊", "👊", "🤛", "🤜", "🫡", "🫂", "🧑", "👧", "🧒", "👦", "👩", "🧑‍🦱", "👨", "🧓", "👵"
    ],
  },
  {
    id: "hearts",
    name: "Hearts & Sparkles",
    icon: <Heart className="w-4 h-4" />,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "🔥", "✨", "💥", "💫", "🌟", "⭐", "🎉", "🎊", "💯", "💢", "♨️", "💤", "👑"
    ],
  },
  {
    id: "animals",
    name: "Animals & Nature",
    icon: <PawPrint className="w-4 h-4" />,
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵",
      "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄",
      "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🐢", "🐍", "🐙", "🦑", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅",
      "🐆", "🦓", "🦍", "🐘", "🦛", "🦏", "🐪", "🦒", "🦘", "🌸", "🌺", "🌻", "🌹", "🌷", "🌱", "🌲",
      "🌴", "🍀", "🍁", "🍄", "🌈", "☀️", "🌤️", "⛅", "🌧️", "❄️", "⚡", "🌊"
    ],
  },
  {
    id: "food",
    name: "Food & Drinks",
    icon: <Utensils className="w-4 h-4" />,
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝",
      "🍅", "🥑", "🥦", "🌽", "🌶️", "🥔", "🥐", "🍞", "🧀", "🥚", "🍳", "🥞", "🧇", "🥓", "🥩", "🍗",
      "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥗", "🥘", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟",
      "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🍫", "🍬", "🍭", "🍿", "☕", "🧋", "🍵", "🧃",
      "🥤", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾"
    ],
  },
  {
    id: "objects",
    name: "Activity & Objects",
    icon: <Lightbulb className="w-4 h-4" />,
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥊", "🎯", "🎮", "🕹️", "🎲", "♟️",
      "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎸", "🏆", "🥇", "🥈", "🥉", "🎫", "🚗", "🚕", "🚙",
      "🏎️", "🚓", "🚑", "🚒", "🚀", "🛸", "✈️", "⛵", "🚤", "🚢", "⚓", "💻", "🖥️", "📱", "📲", "⌚",
      "💡", "🔦", "💸", "💵", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "💣", "🛡️", "🔮", "💊", "🎁",
      "📦", "✉️", "📫", "📌", "📍", "🔒", "🔓", "🔑", "🔔", "🚀"
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  triggerRef,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("recents");
  const [search, setSearch] = useState<string>("");
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("zuno_recent_emojis");
      return saved ? JSON.parse(saved) : DEFAULT_RECENTS;
    } catch {
      return DEFAULT_RECENTS;
    }
  });

  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        (!triggerRef?.current || !triggerRef.current.contains(target))
      ) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);

    // Update recents
    setRecents((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, 24);
      try {
        localStorage.setItem("zuno_recent_emojis", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Filter emojis across all categories when search is active
  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    const allUnique = Array.from(new Set(EMOJI_CATEGORIES.flatMap((c) => c.emojis)));

    // 1. Check keyword map matches
    const keywordMatches = KEYWORD_MAP.filter((item) =>
      item.keywords.some((k) => k.includes(q) || q.includes(k))
    ).flatMap((item) => item.emojis);

    // 2. Check category name matches
    const matchedCategories = EMOJI_CATEGORIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    ).flatMap((c) => c.emojis);

    // 3. Check direct character inclusion
    const directMatches = allUnique.filter((emoji) => emoji.includes(q));

    const combined = Array.from(new Set([...keywordMatches, ...matchedCategories, ...directMatches]));
    return combined;
  }, [search]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-16 left-2 sm:left-4 z-50 w-80 sm:w-92 max-w-[calc(100vw-24px)] rounded-2xl liquid-glass-elevated border border-theme-border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-150 select-none"
      style={{ height: "360px" }}
    >
      {/* Header Search */}
      <div className="p-3 border-b border-theme-border/60 bg-theme-surface/70 flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-theme-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="w-full h-8 pl-8 pr-7 text-xs rounded-xl bg-theme-bg/80 border border-theme-border text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 text-theme-text-muted hover:text-theme-text p-0.5 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors"
          title="Close emoji picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs */}
      {!search.trim() && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-theme-border/40 bg-theme-surface/40 overflow-x-auto no-scrollbar gap-1">
          <button
            type="button"
            onClick={() => setActiveCategory("recents")}
            className={`p-2 rounded-xl transition-all ${
              activeCategory === "recents"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 scale-105"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-bg"
            }`}
            title="Recent Emojis"
          >
            <Clock className="w-4 h-4" />
          </button>
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`p-2 rounded-xl transition-all ${
                activeCategory === cat.id
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 scale-105"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-bg"
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid Area */}
      <div className="flex-1 p-2.5 overflow-y-auto overflow-x-hidden space-y-3">
        {filteredEmojis ? (
          <div>
            <h4 className="text-[11px] font-bold text-theme-text-muted mb-2 px-1">
              Search Results ({filteredEmojis.length})
            </h4>
            {filteredEmojis.length === 0 ? (
              <p className="text-xs text-theme-text-muted text-center py-8">
                No emojis found for "{search}"
              </p>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {filteredEmojis.map((emoji, idx) => (
                  <button
                    key={`${emoji}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-emerald-500/15 active:scale-90 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* If recents selected */}
            {activeCategory === "recents" && (
              <div>
                <h4 className="text-[11px] font-bold text-theme-text-muted mb-2 px-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  <span>Frequently Used</span>
                </h4>
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                  {recents.map((emoji, idx) => (
                    <button
                      key={`recent-${emoji}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-emerald-500/15 active:scale-90 transition-all cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Emojis */}
            {EMOJI_CATEGORIES.filter(
              (c) => activeCategory === "all" || activeCategory === c.id
            ).map((cat) => (
              <div key={cat.id}>
                <h4 className="text-[11px] font-bold text-theme-text-muted mb-2 px-1 flex items-center gap-1.5">
                  <span className="text-emerald-500">{cat.icon}</span>
                  <span>{cat.name}</span>
                </h4>
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${cat.id}-${emoji}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-emerald-500/15 active:scale-90 transition-all cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 border-t border-theme-border/40 bg-theme-surface/50 text-[10px] text-theme-text-muted flex items-center justify-between">
        <span>Click to insert emoji</span>
        <span className="font-mono">ESC to close</span>
      </div>
    </div>
  );
};
