import React, { useState, useRef } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Search,
  LogOut,
  X,
  MessageCircle,
  Camera,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Conversation } from "../types";
import { ThemeToggle } from "./ThemeToggle";
import { AnimatedAvatar } from "./AnimatedAvatar";
import { ImageCropModal } from "./ImageCropModal";
import { ProfileSettingsModal } from "./ProfileSettingsModal";
import { DeleteChatModal } from "./DeleteChatModal";

interface SwipeableConversationItemProps {
  conv: Conversation;
  isSelected: boolean;
  online: boolean;
  isGroup: boolean;
  otherMember: any;
  onSelect: () => void;
  onDeleteRequest: () => void;
  formatTime: (dateStr: string) => string;
}

const SwipeableConversationItem: React.FC<SwipeableConversationItemProps> = ({
  conv,
  isSelected,
  online,
  isGroup,
  otherMember,
  onSelect,
  onDeleteRequest,
  formatTime,
}) => {
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const THRESHOLD = 75;
  const isPastThreshold = swipeOffset >= THRESHOLD;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const diffX = e.clientX - pointerStartRef.current.x;
    const diffY = e.clientY - pointerStartRef.current.y;

    // Detect direction within the first 6px of motion
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        if (diffX > 0 && Math.abs(diffX) > Math.abs(diffY)) {
          isHorizontalSwipeRef.current = true;
          setIsDragging(true);
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        } else {
          isHorizontalSwipeRef.current = false;
        }
      }
    }

    if (isHorizontalSwipeRef.current) {
      if (diffX > 0) {
        // Elastic resistance past threshold
        let offset = diffX;
        if (diffX > THRESHOLD) {
          offset = THRESHOLD + Math.pow(diffX - THRESHOLD, 0.72);
        }
        setSwipeOffset(Math.min(offset, 130));
      } else {
        setSwipeOffset(0);
      }
    }
  };

  const handlePointerEnd = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const currentOffset = swipeOffset;
    const wasHorizontal = isHorizontalSwipeRef.current === true;

    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    pointerStartRef.current = null;
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);

    if (wasHorizontal && currentOffset >= THRESHOLD) {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
      setSwipeOffset(0);
      onDeleteRequest();
    } else {
      setSwipeOffset(0);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    pointerStartRef.current = null;
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl select-none my-0.5">
      {/* Background revealed on swipe right */}
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 flex items-center px-4 overflow-hidden z-0 transition-opacity duration-200"
        style={{
          opacity: swipeOffset > 4 ? 1 : 0,
        }}
      >
        <div
          className="flex items-center gap-3 transition-transform"
          style={{
            transform: `translateX(${Math.min(swipeOffset * 0.4, 28)}px)`,
          }}
        >
          {/* Animated circular badge */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
              isPastThreshold
                ? "bg-white text-red-600 scale-110 shadow-lg ring-4 ring-white/30"
                : "bg-white/20 text-white scale-95"
            }`}
          >
            <Trash2
              className={`w-4 h-4 transition-transform duration-200 ${
                isPastThreshold ? "scale-110 rotate-12" : ""
              }`}
            />
          </div>

          {/* Dynamic label with animation */}
          <div className="flex flex-col text-left transition-all duration-150">
            <span
              className={`text-xs font-bold tracking-wide transition-all ${
                isPastThreshold ? "text-white scale-105" : "text-white/90"
              }`}
            >
              {isPastThreshold ? "Release to Delete!" : "Slide to Delete"}
            </span>
            <span className="text-[10px] text-white/75 font-medium leading-none mt-0.5">
              {isPastThreshold ? "Quick confirmation" : "Swipe right"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Conversation Card */}
      <div
        onClick={() => {
          if (swipeOffset < 8) {
            onSelect();
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onSelect();
          }
        }}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.25)",
          touchAction: "pan-y",
        }}
        className={`group relative z-10 flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer select-none transition-colors duration-200 ${
          isSelected
            ? "bg-emerald-500/10 dark:bg-[#16231e] border border-emerald-500/35 text-theme-text shadow-[0_2px_10px_rgba(16,185,129,0.08)] backdrop-blur-xs"
            : isDragging && swipeOffset > 10
            ? "bg-white dark:bg-[#1a2320] border border-red-500/30 shadow-lg"
            : "bg-white/95 dark:bg-[#151d1b] hover:bg-theme-bg/80 border border-theme-border/40 text-theme-text-secondary shadow-xs"
        }`}
      >
        {/* Avatar with Status */}
        <div className="relative flex-shrink-0 pointer-events-none">
          <AnimatedAvatar
            src={conv.avatar}
            name={conv.name || "Chat"}
            id={conv.id}
            size="md"
            isGroup={isGroup}
            showOnline={!isGroup}
            isOnline={online}
          />
        </div>

        {/* Info & Last message */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`text-xs truncate ${
                  isSelected ? "font-bold text-theme-text" : "font-semibold text-theme-text"
                }`}
              >
                {conv.name}
              </span>
              {!isGroup && otherMember?.user?.chatId && (
                <span className="text-[10px] text-theme-accent font-medium truncate flex-shrink-0">
                  @{otherMember.user.chatId}
                </span>
              )}
            </div>
            <span className="text-[10px] text-theme-text-muted flex-shrink-0 ml-1">
              {formatTime(conv.latestMessage?.createdAt || conv.updatedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-theme-text-muted truncate pr-2 leading-relaxed">
              {conv.latestMessage
                ? `${
                    isGroup
                      ? `${(conv.latestMessage.senderName || "").split(" ")[0] || "User"}: `
                      : ""
                  }${conv.latestMessage.content}`
                : "No messages yet"}
            </p>

            <div className="flex items-center gap-1.5 flex-shrink-0 pointer-events-auto">
              {conv.isUnread && (
                <span className="w-2 h-2 rounded-full bg-theme-accent flex-shrink-0" />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest();
                }}
                title={isGroup ? "Leave & Delete Group" : "Delete Chat"}
                aria-label="Delete Chat"
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-theme-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SidebarProps {
  onOpenNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewChat }) => {
  const { user, logout, uploadAvatar } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    onlineUsers,
    deleteConversation,
  } = useChat();
  const [search, setSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "groups">("all");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPEG, PNG, WebP, etc.)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert("Image size should be less than 15MB");
      return;
    }

    // Automatically close Profile & Settings window so it doesn't overlap behind the crop window
    setIsSettingsOpen(false);

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleCroppedAvatarSave = async (croppedFile: File) => {
    try {
      setIsUploadingAvatar(true);
      await uploadAvatar(croppedFile);
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      alert(err.message || "Failed to upload avatar. Check Cloudinary settings.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    // 1. Text search filter
    const title = c.name || "Chat";
    const q = search.toLowerCase().trim();
    const matchesTitle = title.toLowerCase().includes(q);
    const matchesChatId = c.members?.some((m) =>
      m.user?.chatId ? m.user.chatId.toLowerCase().includes(q.replace(/^@/, "")) : false
    );
    const matchesSearch = !q || matchesTitle || matchesChatId;
    if (!matchesSearch) return false;

    // 2. Tab filter
    const isGroup = c.type?.toUpperCase() === "GROUP";
    if (activeTab === "direct") return !isGroup;
    if (activeTab === "groups") return isGroup;
    return true;
  });

  const directCount = conversations.filter((c) => c.type?.toUpperCase() !== "GROUP").length;
  const groupCount = conversations.filter((c) => c.type?.toUpperCase() === "GROUP").length;

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const isOtherUserOnline = (conv: Conversation): boolean => {
    if (conv.type?.toUpperCase() === "GROUP") return false;
    const otherMember = conv.members?.find((m: any) => {
      const mId = (typeof m === "string" ? m : null) || m.userId || m.user?.id || m.user?._id || m.id || m._id;
      return mId && mId.toString() !== user?.id.toString();
    });
    if (!otherMember) return false;
    const peerId = (typeof otherMember === "string" ? otherMember : null) || otherMember.userId || otherMember.user?.id || otherMember.id || (otherMember as any)._id;
    return peerId ? onlineUsers.has(peerId.toString()) : false;
  };

  return (
    <aside
      className={`h-full flex flex-col liquid-glass-sidebar border-r border-theme-border select-none transition-theme duration-200 ${
        activeConversation ? "hidden md:flex md:w-80 lg:w-92" : "flex w-full md:w-80 lg:w-92"
      }`}
    >
      {/* Top Header */}
      <div
        className="px-4 border-b border-theme-border flex items-center justify-between flex-shrink-0"
        style={{
          paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
          minHeight: 'calc(58px + env(safe-area-inset-top, 0px))',
          boxSizing: 'border-box'
        }}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-theme-text">
            Chats
          </h1>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onOpenNewChat}
          aria-label="New Conversation"
          title="New Conversation"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-[0_2px_10px_-2px_rgba(16,185,129,0.35)] transition-all active:scale-97"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative flex items-center bg-theme-bg border border-theme-border rounded-xl focus-within:border-theme-accent focus-within:ring-2 focus-within:ring-theme-accent/15 transition-theme shadow-subtle">
          <Search className="w-3.5 h-3.5 text-theme-text-muted ml-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-2.5 py-2 text-base sm:text-xs text-theme-text placeholder-theme-text-muted focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mr-2 text-theme-text-muted hover:text-theme-text p-0.5 rounded-md hover:bg-theme-surface"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (All / Direct / Groups) */}
      <div className="px-3 pb-2 flex items-center gap-1.5 border-b border-theme-border-subtle">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-theme flex items-center gap-1 ${
            activeTab === "all"
              ? "bg-theme-accent/10 text-theme-accent font-semibold"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface"
          }`}
        >
          <span>All</span>
          <span className="text-[10px] opacity-75">({conversations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("direct")}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-theme flex items-center gap-1 ${
            activeTab === "direct"
              ? "bg-theme-accent/10 text-theme-accent font-semibold"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface"
          }`}
        >
          <span>Direct</span>
          <span className="text-[10px] opacity-75">({directCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("groups")}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-theme flex items-center gap-1 ${
            activeTab === "groups"
              ? "bg-theme-accent/10 text-theme-accent font-semibold"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface"
          }`}
        >
          <span>Groups</span>
          <span className="text-[10px] opacity-75">({groupCount})</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <div className="w-10 h-10 rounded-2xl bg-theme-bg border border-theme-border flex items-center justify-center text-theme-text-muted mb-2 shadow-subtle">
              <MessageCircle className="w-5 h-5 text-theme-accent/60" />
            </div>
            <p className="text-xs text-theme-text font-semibold">No chats found</p>
            <p className="text-[11px] text-theme-text-muted mt-0.5 max-w-[190px]">
              {search ? "No conversations match your search." : "Start a direct conversation or group."}
            </p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 text-xs text-theme-accent hover:underline font-semibold"
            >
              Start new chat
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = activeConversation?.id === conv.id;
            const online = isOtherUserOnline(conv);
            const isGroup = conv.type?.toUpperCase() === "GROUP";
            const otherMember = !isGroup
              ? conv.members?.find((m) => {
                  const mId =
                    (typeof m === "string" ? m : null) ||
                    m.userId ||
                    m.user?.id ||
                    (m as any).id;
                  return mId && mId.toString() !== user?.id.toString();
                })
              : null;

            return (
              <SwipeableConversationItem
                key={conv.id}
                conv={conv}
                isSelected={isSelected}
                online={online}
                isGroup={isGroup}
                otherMember={otherMember}
                onSelect={() => selectConversation(conv)}
                onDeleteRequest={() => setConversationToDelete(conv)}
                formatTime={formatTime}
              />
            );
          })
        )}
      </div>

      {/* User Profile Footer */}
      {user && (
        <div className="p-3 border-t border-theme-border liquid-glass flex items-center justify-between flex-shrink-0">
          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            onClick={() => setIsSettingsOpen(true)}
            title="Open Profile & Settings"
          >
            <div className="relative flex-shrink-0">
              <AnimatedAvatar
                src={user.avatar}
                name={user.name}
                id={user.id}
                size="sm"
                showOnline={true}
                isOnline={true}
                className={isUploadingAvatar ? "opacity-40" : "group-hover:scale-105 transition-transform"}
              />
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 text-white transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-theme-text truncate leading-tight group-hover:text-emerald-500 transition-colors">
                {user.name}
              </div>
              <div className="text-[10px] text-theme-accent font-medium truncate leading-tight">
                @{user.chatId}
              </div>
            </div>
          </div>

          {/* Hidden File Picker for Custom Image Cropping */}
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarFileSelected}
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
          />

          <div className="flex items-center gap-1">
            <ThemeToggle />

            <button
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-lg text-theme-text-muted hover:text-red-500 hover:bg-theme-bg transition-theme"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setIsCropModalOpen(false);
          setCropImageSrc(null);
        }}
        onCropComplete={handleCroppedAvatarSave}
      />

      {/* Profile & Settings Modal (with Account Deactivate option) */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenCropPicker={() => avatarInputRef.current?.click()}
      />

      {/* Delete Chat Confirmation Modal */}
      <DeleteChatModal
        isOpen={Boolean(conversationToDelete)}
        conversationName={conversationToDelete?.name || "Chat"}
        isGroup={conversationToDelete?.type === "GROUP"}
        onClose={() => setConversationToDelete(null)}
        onConfirm={async () => {
          if (conversationToDelete) {
            await deleteConversation(conversationToDelete.id);
            setConversationToDelete(null);
          }
        }}
      />
    </aside>
  );
};
