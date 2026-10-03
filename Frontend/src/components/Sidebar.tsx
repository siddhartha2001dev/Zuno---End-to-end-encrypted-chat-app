import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Search,
  LogOut,
  X,
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

const useIsMobileDevice = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const isSmallScreen = window.innerWidth < 768;
    return Boolean(isMobileUA || isIPad || (hasCoarsePointer && isSmallScreen));
  });

  useEffect(() => {
    const checkIsMobile = () => {
      if (typeof window === "undefined" || typeof navigator === "undefined") return;
      const ua = navigator.userAgent || "";
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(Boolean(isMobileUA || isIPad || (hasCoarsePointer && isSmallScreen)));
    };

    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
};

interface SwipeableConversationItemProps {
  conv: Conversation;
  isSelected: boolean;
  online: boolean;
  isGroup: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
  formatTime: (dateStr: string) => string;
  isMobile: boolean;
}

const SwipeableConversationItem: React.FC<SwipeableConversationItemProps> = ({
  conv,
  isSelected,
  online,
  isGroup,
  onSelect,
  onDeleteRequest,
  formatTime,
  isMobile,
}) => {

  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const THRESHOLD = 75;
  const isPastThreshold = swipeOffset >= THRESHOLD;

  // Swipe delete is only supported on mobile touch devices
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isMobile || e.pointerType !== "touch" || e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isMobile || e.pointerType !== "touch" || !pointerStartRef.current) return;
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
    if (!isMobile || !pointerStartRef.current) return;
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
    if (!isMobile || !pointerStartRef.current) return;
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
    <div className="relative overflow-hidden rounded-xl select-none my-0.5">
      {/* Background revealed on swipe right (mobile touch devices only) */}
      {isMobile && (
        <div
          className="absolute inset-0 rounded-xl bg-red-600 flex items-center px-4 overflow-hidden z-0 transition-opacity duration-200"
          style={{
            opacity: swipeOffset > 4 ? 1 : 0,
          }}
        >
          <div
            className="flex items-center gap-2.5 transition-transform"
            style={{
              transform: `translateX(${Math.min(swipeOffset * 0.4, 28)}px)`,
            }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${
                isPastThreshold ? "bg-white text-red-600 scale-105" : "bg-white/20 text-white"
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-white">
              {isPastThreshold ? "Release to delete" : "Slide to delete"}
            </span>
          </div>
        </div>
      )}

      {/* Main Conversation Card */}
      <div
        onClick={() => {
          if (!isMobile || swipeOffset < 8) {
            onSelect();
          }
        }}
        onPointerDown={isMobile ? handlePointerDown : undefined}
        onPointerMove={isMobile ? handlePointerMove : undefined}
        onPointerUp={isMobile ? handlePointerEnd : undefined}
        onPointerCancel={isMobile ? handlePointerCancel : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onSelect();
          }
        }}
        style={
          isMobile
            ? {
                transform: `translateX(${swipeOffset}px)`,
                transition: isDragging
                  ? "none"
                  : "transform 0.24s cubic-bezier(0.2, 0, 0, 1)",
                touchAction: "pan-y",
              }
            : undefined
        }
        className={`chats-conversation-card group relative z-10 flex items-center gap-3 px-3 py-2 rounded-[18px] cursor-pointer select-none transition-all duration-150 ${
          isSelected
            ? "chats-conversation-card-selected text-theme-text font-medium"
            : isDragging && swipeOffset > 10
            ? "bg-theme-surface border border-red-500/30"
            : "text-theme-text-secondary"
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
          {/* Top row: Contact Name + Time */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span
              className={`text-[13px] truncate ${
                isSelected || conv.isUnread ? "font-semibold text-theme-text" : "font-medium text-theme-text"
              }`}
            >
              {conv.name}
            </span>
            <span className="text-[11px] text-theme-text-muted flex-shrink-0 ml-1.5 font-normal">
              {formatTime(conv.latestMessage?.createdAt || conv.updatedAt)}
            </span>
          </div>

          {/* Bottom row: Latest message preview + Unread indicator / Actions */}
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-[12px] truncate leading-normal ${
                conv.isUnread ? "text-theme-text font-medium" : "text-theme-text-muted"
              }`}
            >
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
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-theme-text-muted hover:text-red-500 hover:bg-red-500/10 transition-opacity cursor-pointer"
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
  const isMobile = useIsMobileDevice();
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
      className={`h-full flex flex-col min-w-0 box-border liquid-glass-sidebar border-r border-theme-border select-none transition-theme duration-200 ${
        activeConversation ? "hidden md:flex md:flex-[0_0_320px] md:w-[320px] md:min-w-[280px] md:max-w-[320px]" : "flex w-full md:flex-[0_0_320px] md:w-[320px] md:min-w-[280px] md:max-w-[320px]"
      }`}
    >
      {/* Chats Header & Search */}
      <div className="chats-header-glass w-auto max-w-full min-w-0 box-border mx-2 mt-2 sm:mx-3 sm:mt-3 p-3 sm:p-5 flex-shrink-0">
        <div
          className="flex items-center justify-between gap-3"
          style={{
            paddingTop: 'max(2px, env(safe-area-inset-top, 0px))',
            boxSizing: 'border-box'
          }}
        >
          <h1 className="chats-header-title text-theme-text">
            Chats
          </h1>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <ThemeToggle variant="header" />
            <span className="chats-header-divider" aria-hidden="true" />
            <button
              onClick={onOpenNewChat}
              aria-label="New chat"
              title="New chat"
              className="chats-new-chat-button inline-flex items-center justify-center rounded-2xl bg-theme-accent text-white"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="chats-search-glass relative flex items-center w-full max-w-full min-w-0 mt-4 sm:mt-5">
          <Search className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-theme-text-muted ml-3.5 sm:ml-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-w-0 box-border bg-transparent px-2.5 sm:px-3 py-2.5 text-sm text-theme-text placeholder-theme-text-muted focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mr-3 text-theme-text-muted hover:text-theme-text p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (Segmented control) */}
      <div className="px-3 pt-3 pb-2 border-b border-theme-border-subtle">
        <div className="chats-filter-tabs grid grid-cols-3 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-1 rounded-md text-[11px] font-medium transition-colors text-center ${
              activeTab === "all"
                ? "bg-theme-active-item text-theme-accent border border-theme-accent/20 shadow-subtle font-semibold"
                : "text-theme-text-muted hover:text-theme-text"
            }`}
          >
            All {conversations.length > 0 && `(${conversations.length})`}
          </button>
          <button
            onClick={() => setActiveTab("direct")}
            className={`py-1 rounded-md text-[11px] font-medium transition-colors text-center ${
              activeTab === "direct"
                ? "bg-theme-active-item text-theme-accent border border-theme-accent/20 shadow-subtle font-semibold"
                : "text-theme-text-muted hover:text-theme-text"
            }`}
          >
            Direct {directCount > 0 && `(${directCount})`}
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`py-1 rounded-md text-[11px] font-medium transition-colors text-center ${
              activeTab === "groups"
                ? "bg-theme-active-item text-theme-accent border border-theme-accent/20 shadow-subtle font-semibold"
                : "text-theme-text-muted hover:text-theme-text"
            }`}
          >
            Groups {groupCount > 0 && `(${groupCount})`}
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <p className="text-xs text-theme-text font-medium">No conversations found</p>
            <p className="text-[11px] text-theme-text-muted mt-1 max-w-[190px]">
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

            return (
              <SwipeableConversationItem
                key={conv.id}
                conv={conv}
                isSelected={isSelected}
                online={online}
                isGroup={isGroup}
                onSelect={() => selectConversation(conv)}
                onDeleteRequest={() => setConversationToDelete(conv)}
                formatTime={formatTime}
                isMobile={isMobile}
              />
            );
          })
        )}
      </div>

      {/* User Profile Footer */}
      {user && (
        <div
          className="chats-profile-card mx-2 mb-2 p-2.5 px-3 flex items-center justify-between flex-shrink-0"
          style={{
            paddingBottom: 'max(10px, calc(env(safe-area-inset-bottom, 0px) + 8px))'
          }}
        >
          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer p-1 -m-1 rounded-lg hover:bg-theme-bg/60 transition-colors"
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
                className={isUploadingAvatar ? "opacity-40" : ""}
              />
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 text-white transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-theme-text truncate leading-tight">
                {user.name}
              </div>
              <div className="text-[10px] text-theme-text-muted truncate leading-tight">
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
