import React, { useState, useEffect, useRef } from "react";
import type { Message } from "../types";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import {
  Check,
  CheckCheck,
  SmilePlus,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import { AudioMessageBubble } from "./AudioMessageBubble";

interface MessageBubbleProps {
  message: Message;
  isGroup: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "😮"];

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isGroup,
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  const { user } = useAuth();
  const { toggleReaction } = useChat();
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isSender = message.senderId === user?.id;
  const isRead = message.reads && message.reads.length > 0;

  const isImage =
    message.messageType?.toLowerCase() === "image" ||
    (Boolean(message.mediaUrl) &&
      /\.(jpg|jpeg|png|webp|gif|svg|avif)($|\?)/i.test(message.mediaUrl || ""));

  const isAudio =
    message.messageType?.toLowerCase() === "audio" ||
    (Boolean(message.mediaUrl) &&
      (/\.(webm|ogg|mp3|wav|m4a|aac|opus)($|\?)/i.test(message.mediaUrl || "") ||
        /\.(webm|ogg|mp3|wav|m4a|aac|opus)$/i.test(message.fileName || "")));

  const hasCaption = Boolean(
    message.content &&
      message.content !== "📷 Image" &&
      message.content !== "🎤 Voice message" &&
      message.content !== "📎 Attachment" &&
      !message.content.startsWith("📎 ")
  );

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Group reactions by emoji safely
  const groupedReactions = (message.reactions || []).reduce<Record<string, { count: number; userReacted: boolean }>>(
    (acc, r) => {
      if (!acc[r.reaction]) {
        acc[r.reaction] = { count: 0, userReacted: false };
      }
      acc[r.reaction].count += 1;
      if (r.userId === user?.id) {
        acc[r.reaction].userReacted = true;
      }
      return acc;
    },
    {}
  );

  // Close emoji popover on click outside or Escape
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        (!triggerRef.current || !triggerRef.current.contains(target))
      ) {
        setShowEmojiPicker(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showEmojiPicker]);

  const handleSelectReaction = async (emoji: string) => {
    setShowEmojiPicker(false);
    await toggleReaction(message.id, emoji);
  };

  // Corner rounding for visual message grouping
  const borderRadiusClasses = isSender
    ? `rounded-2xl ${!isLastInGroup ? "rounded-br-xs" : ""} ${!isFirstInGroup ? "rounded-tr-xs" : ""}`
    : `rounded-2xl ${!isLastInGroup ? "rounded-bl-xs" : ""} ${!isFirstInGroup ? "rounded-tl-xs" : ""}`;

  return (
    <div
      className={`group relative flex flex-col ${
        isFirstInGroup ? "mt-2.5 sm:mt-3" : "mt-0.5"
      } ${isSender ? "items-end" : "items-start"}`}
    >
      {/* Sender name for group chats - shown only on the first message of consecutive run */}
      {!isSender && isGroup && isFirstInGroup && (
        <span className="text-[11px] font-semibold text-theme-accent ml-2 mb-1 tracking-wide">
          {message.sender?.name || "Member"}
        </span>
      )}

      {/* Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] ${
          isSender ? "animate-bubble-outgoing" : "animate-bubble-incoming"
        }`}
      >
        {/* Quick Emoji Reaction Action on Hover / Focus */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 transition-opacity flex items-center z-20 ${
            showEmojiPicker
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          } ${isSender ? "-left-8" : "-right-8"}`}
        >
          <button
            ref={triggerRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker((prev) => !prev);
            }}
            title="Add reaction"
            aria-label="Add reaction"
            className="w-6 h-6 rounded-full bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text flex items-center justify-center shadow-subtle transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <SmilePlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Emoji Popover */}
        {showEmojiPicker && (
          <div
            ref={pickerRef}
            className={`absolute -top-10 z-30 flex items-center gap-0.5 bg-theme-elevated border border-theme-border px-2 py-1 rounded-full shadow-popover animate-in fade-in zoom-in-95 duration-120 ${
              isSender ? "right-0" : "left-0"
            }`}
          >
            {QUICK_EMOJIS.map((emoji) => {
              const alreadyReacted = groupedReactions[emoji]?.userReacted;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectReaction(emoji)}
                  title={alreadyReacted ? `Remove ${emoji}` : `React ${emoji}`}
                  className={`hover:scale-120 transition-transform p-1 text-base leading-none rounded-full cursor-pointer ${
                    alreadyReacted
                      ? "bg-theme-accent/20 ring-1 ring-theme-accent"
                      : "hover:bg-theme-surface"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}

        {/* Message Surface */}
        <div
          className={`px-3.5 py-2 text-[13.5px] sm:text-[14px] leading-relaxed break-words transition-colors shadow-subtle ${borderRadiusClasses} ${
            isSender
              ? "bg-theme-outgoing-bg text-theme-outgoing-text"
              : "bg-theme-incoming-bg text-theme-incoming-text border border-theme-incoming-border"
          }`}
        >
          {/* Media Attachment Rendering */}
          {message.mediaUrl && (
            <div className={hasCaption ? "mb-2" : ""}>
              {isAudio ? (
                <AudioMessageBubble
                  mediaUrl={message.mediaUrl}
                  isSender={isSender}
                  fileName={message.fileName}
                />
              ) : isImage ? (
                <a
                  href={message.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-xl group/img relative"
                >
                  <img
                    src={message.mediaUrl}
                    alt={message.fileName || "Shared image"}
                    className="max-h-72 w-full object-cover rounded-xl"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors rounded-xl flex items-end justify-end p-2 opacity-0 group-hover/img:opacity-100">
                    <span className="p-1 rounded-md bg-black/70 text-white text-xs flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </a>
              ) : (
                <a
                  href={message.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={message.fileName || "download"}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
                    isSender
                      ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                      : "bg-theme-bg/60 hover:bg-theme-bg border-theme-border text-theme-text"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isSender
                        ? "bg-white/20 text-white"
                        : "bg-theme-surface text-theme-accent border border-theme-border"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate leading-tight">
                      {message.fileName || "Download file"}
                    </p>
                    {message.fileSize && (
                      <p
                        className={`text-[10px] mt-0.5 ${
                          isSender ? "text-white/70" : "text-theme-text-muted"
                        }`}
                      >
                        {formatFileSize(message.fileSize)}
                      </p>
                    )}
                  </div>
                  <div
                    className={`p-1 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isSender
                        ? "hover:bg-white/20 text-white/90"
                        : "hover:bg-theme-surface text-theme-text-muted"
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Audio message fallback if mediaUrl is missing */}
          {!message.mediaUrl && isAudio && !hasCaption && (
            <p className="text-xs italic opacity-75">Voice message unavailable</p>
          )}

          {/* Text/Caption Content */}
          {hasCaption && <p className="whitespace-pre-wrap">{message.content}</p>}

          {/* Time & Delivery Checkmarks */}
          <div
            className={`flex items-center gap-1 mt-1 text-[10px] select-none ${
              isSender ? "justify-end text-white/70" : "justify-start text-theme-text-muted"
            }`}
          >
            <span>{formatTime(message.createdAt)}</span>

            {isSender && (
              <span title={isRead ? "Read" : "Delivered"} className="flex items-center ml-0.5">
                {isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-white/90" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white/60" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>


      {/* Reactions Display Pill */}
      {Object.keys(groupedReactions).length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-1 mt-1 ${
            isSender ? "justify-end pr-1" : "justify-start pl-1"
          }`}
        >
          {Object.entries(groupedReactions).map(([emoji, { count, userReacted }]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelectReaction(emoji)}
              aria-label={`Reaction ${emoji}, count ${count}${userReacted ? " (Click to remove)" : ""}`}
              title={userReacted ? `Remove ${emoji}` : `React with ${emoji}`}
              className={`animate-reaction-pop flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs transition-all border cursor-pointer select-none ${
                userReacted
                  ? "bg-theme-accent/15 border-theme-accent/40 text-theme-accent font-semibold shadow-xs hover:bg-theme-accent/25"
                  : "bg-theme-surface border-theme-border text-theme-text-secondary hover:bg-theme-elevated hover:text-theme-text"
              }`}
            >
              <span className="text-xs leading-none">{emoji}</span>
              <span className="font-semibold text-[10px]">{count}</span>
            </button>
          ))}

        </div>
      )}
    </div>
  );
};
