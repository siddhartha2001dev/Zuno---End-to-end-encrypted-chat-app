import React, { useState, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import { api } from "../services/api";
import type { User } from "../types";
import { X, Search, Users, Check, Loader2, User as UserIcon } from "lucide-react";
import { AnimatedAvatar } from "./AnimatedAvatar";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { createDirectChat, createGroupChat, onlineUsers } = useChat();
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [query, setQuery] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Search users debounce & empty handling
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setUsers([]);
      setLoading(false);
      return;
    }

    let isCurrent = true;
    setLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.users.search(trimmed);
        if (isCurrent) {
          setUsers(res.users || []);
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Error searching users:", err);
          setUsers([]);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(delayDebounceFn);
    };
  }, [query, isOpen]);

  // Reset modal state on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setUsers([]);
      setLoading(false);
      setSelectedUserIds([]);
      setGroupName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDirect = async (userId: string) => {
    setCreating(true);
    try {
      await createDirectChat(userId);
      onClose();
    } catch (err) {
      console.error("Failed to create direct chat:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    setCreating(true);
    try {
      await createGroupChat(groupName.trim(), selectedUserIds);
      onClose();
    } catch (err) {
      console.error("Failed to create group chat:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-120"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md bg-theme-surface rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[85vh] border border-theme-border">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-theme-border flex items-center justify-between">
          <h2 id="modal-title" className="font-semibold text-sm text-theme-text">New conversation</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-theme-text-muted hover:text-theme-text p-1 rounded-md hover:bg-theme-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Segmented Control) */}
        <div className="px-5 pt-3 pb-2 border-b border-theme-border-subtle">
          <div className="grid grid-cols-2 p-0.5 rounded-lg bg-theme-bg border border-theme-border-subtle">
            <button
              onClick={() => setTab("direct")}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors text-center ${
                tab === "direct"
                  ? "bg-theme-surface text-theme-text shadow-subtle font-semibold"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              Direct chat
            </button>
            <button
              onClick={() => setTab("group")}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors text-center flex items-center justify-center gap-1.5 ${
                tab === "group"
                  ? "bg-theme-surface text-theme-text shadow-subtle font-semibold"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Group chat</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {tab === "group" && (
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Group Name
              </label>
              <input
                type="text"
                placeholder="e.g. Engineering Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-xs text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent/20 transition-theme"
              />
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex items-center bg-theme-bg border border-theme-border rounded-lg focus-within:border-theme-accent focus-within:ring-1 focus-within:ring-theme-accent/20 transition-theme shadow-subtle">
            <Search className="w-3.5 h-3.5 text-theme-text-muted ml-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by Chat ID, name, or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent px-2.5 py-2 text-xs text-theme-text placeholder-theme-text-muted focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mr-2.5 text-theme-text-muted hover:text-theme-text"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Contact List */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider mb-2">
              <span>{tab === "direct" ? "Select contact" : "Select members"}</span>
              {tab === "group" && (
                <span className="text-theme-accent normal-case font-medium">{selectedUserIds.length} selected</span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-theme-text-muted text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />
                <span>Searching contacts...</span>
              </div>
            ) : !query.trim() ? (
              null
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-theme-text-muted">
                <UserIcon className="w-6 h-6 mb-1 opacity-50" />
                <p className="text-xs">No users found</p>
              </div>
            ) : (
              users.map((u) => {
                const isOnline = onlineUsers.has(u.id);
                const isSelected = selectedUserIds.includes(u.id);

                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (tab === "direct") {
                        handleStartDirect(u.id);
                      } else {
                        handleToggleMember(u.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (tab === "direct") handleStartDirect(u.id);
                        else handleToggleMember(u.id);
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-theme ${
                      isSelected
                        ? "bg-theme-accent-subtle border border-theme-accent/30"
                        : "hover:bg-theme-elevated border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <AnimatedAvatar
                          src={u.avatar}
                          name={u.name}
                          id={u.id}
                          size="sm"
                          showOnline={true}
                          isOnline={isOnline}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-theme-text truncate">{u.name}</div>
                        <div className="text-[11px] text-theme-accent font-medium truncate">@{u.chatId}</div>
                      </div>
                    </div>

                    {tab === "group" ? (
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-theme ${
                          isSelected
                            ? "bg-theme-accent border-theme-accent text-white"
                            : "border-theme-border text-transparent"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <span className="text-[11px] text-theme-accent font-medium hover:underline">
                        Chat
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Group Footer */}
        {tab === "group" && (
          <div className="p-4 border-t border-theme-border flex justify-end gap-2 bg-theme-sidebar/30">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-theme-text-secondary hover:text-theme-text rounded-lg hover:bg-theme-elevated transition-theme"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={creating || !groupName.trim() || selectedUserIds.length === 0}
              onClick={handleCreateGroup}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-theme-accent hover:bg-theme-accent-hover rounded-lg transition-colors shadow-xs disabled:opacity-40 flex items-center gap-1.5 active:scale-95"
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Group ({selectedUserIds.length})
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
