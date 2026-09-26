import React, { useState } from "react";
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

interface MessageBubbleProps {
  message: Message;
  isGroup: boolean;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "😮"];

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isGroup }) => {
  const { user } = useAuth();
  const { addReaction } = useChat();
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  const isSender = message.senderId === user?.id;
  const isRead = message.reads && message.reads.length > 0;

  const isImage =
    message.messageType?.toLowerCase() === "image" ||
    (Boolean(message.mediaUrl) &&
      /\.(jpg|jpeg|png|webp|gif|svg|avif)($|\?)/i.test(message.mediaUrl || ""));

  const hasCaption = Boolean(
    message.content &&
      message.content !== "📷 Image" &&
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

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce<Record<string, { count: number; userReacted: boolean }>>(
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
  ) || {};

  const handleSelectReaction = async (emoji: string) => {
    setShowEmojiPicker(false);
    await addReaction(message.id, emoji);
  };

  return (
    <div
      className={`group relative flex flex-col mb-3 ${
        isSender ? "items-end" : "items-start"
      }`}
      onMouseLeave={() => setShowEmojiPicker(false)}
    >
      {/* Sender name for group chats */}
      {!isSender && isGroup && (
        <span className="text-[11px] font-semibold text-theme-accent ml-1.5 mb-1 tracking-wide">
          {message.sender?.name || "Member"}
        </span>
      )}

      {/* Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[68%] ${
          isSender ? "animate-bubble-outgoing" : "animate-bubble-incoming"
        }`}
      >
        {/* Quick Emoji Reaction Action on Hover */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center z-20 ${
            isSender ? "-left-8" : "-right-8"
          }`}
        >
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add reaction"
            aria-label="Add reaction"
            className="w-6 h-6 rounded-full bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text flex items-center justify-center shadow-subtle transition-theme hover:scale-105"
          >
            <SmilePlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Emoji Popover */}
        {showEmojiPicker && (
          <div
            className={`absolute -top-9 z-30 flex items-center gap-0.5 bg-theme-elevated border border-theme-border px-1.5 py-1 rounded-full shadow-popover animate-in fade-in zoom-in-95 duration-150 ${
              isSender ? "right-0" : "left-0"
            }`}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelectReaction(emoji)}
                className="hover:scale-120 transition-transform p-1 text-sm leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Message Surface */}
        <div
          className={`px-3.5 py-2.5 text-[14px] leading-relaxed break-words transition-all ${
            isSender
              ? "bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-2xl rounded-tr-xs shadow-[0_4px_16px_-2px_rgba(16,185,129,0.38),inset_0_1px_1px_rgba(255,255,255,0.35)] border border-emerald-400/30 backdrop-blur-md"
              : "bg-white/90 dark:bg-[#182320]/80 backdrop-blur-md text-theme-text border border-emerald-900/10 dark:border-emerald-500/20 rounded-2xl rounded-tl-xs shadow-[0_2px_12px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)]"
          }`}
        >
          {/* Media Attachment Rendering */}
          {message.mediaUrl && (
            <div className="mb-2">
              {isImage ? (
                <a
                  href={message.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-xl group/img relative"
                >
                  <img
                    src={message.mediaUrl}
                    alt={message.fileName || "Shared image"}
                    className="max-h-72 w-full object-cover rounded-xl hover:scale-[1.01] transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors rounded-xl flex items-end justify-end p-2 opacity-0 group-hover/img:opacity-100">
                    <span className="p-1.5 rounded-lg bg-black/60 text-white text-xs backdrop-blur-xs flex items-center gap-1">
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
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                    isSender
                      ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                      : "bg-theme-bg/80 hover:bg-theme-bg border-theme-border text-theme-text"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSender
                        ? "bg-white/20 text-white"
                        : "bg-theme-surface text-theme-accent border border-theme-border"
                    }`}
                  >
                    <FileText className="w-5 h-5" />
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
                    className={`p-1.5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSender
                        ? "hover:bg-white/20 text-white/90"
                        : "hover:bg-theme-surface text-theme-text-muted"
                    }`}
                  >
                    <Download className="w-4 h-4" />
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Text/Caption Content */}
          {hasCaption && <p className="whitespace-pre-wrap">{message.content}</p>}

          {/* Time & Delivery Checkmarks */}
          <div
            className={`flex items-center gap-1 mt-1 text-[10px] select-none ${
              isSender ? "justify-end text-white/80" : "justify-start text-theme-text-muted"
            }`}
          >
            <span>{formatTime(message.createdAt)}</span>

            {isSender && (
              <span title={isRead ? "Read" : "Delivered"} className="flex items-center ml-0.5">
                {isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white/70" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reactions Display Pill */}
      {Object.keys(groupedReactions).length > 0 && (
        <div
          className={`flex flex-wrap gap-1 mt-1 ${
            isSender ? "justify-end pr-1" : "justify-start pl-1"
          }`}
        >
          {Object.entries(groupedReactions).map(([emoji, { count, userReacted }]) => (
            <button
              key={emoji}
              onClick={() => handleSelectReaction(emoji)}
              aria-label={`Reaction ${emoji}, count ${count}`}
              className={`animate-reaction-pop flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-theme border ${
                userReacted
                  ? "bg-theme-accent/10 border-theme-accent/30 text-theme-accent font-medium"
                  : "bg-theme-surface border-theme-border text-theme-text-secondary hover:bg-theme-elevated"
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
