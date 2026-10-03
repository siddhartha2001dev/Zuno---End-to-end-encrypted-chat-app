import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { AnimatedAvatar } from "./AnimatedAvatar";
import { AvatarSelectorModal } from "./AvatarSelectorModal";
import {
  X,
  Camera,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  UserX,
  Loader2,
  ShieldCheck,
  Mail,
  User,
  AtSign,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCropPicker: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenCropPicker,
}) => {
  const { user, removeAvatar, deactivateAccount, updateName } = useAuth();
  const { deleteAllConversations } = useChat();

  const [copiedChatId, setCopiedChatId] = useState<boolean>(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState<boolean>(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);

  // Deactivate & Delete All Modals
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [deleteAllSuccess, setDeleteAllSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Name Editing State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  // Sync nameInput when user changes or modal opens
  React.useEffect(() => {
    if (user?.name) {
      setNameInput(user.name);
    }
  }, [user?.name, isOpen]);

  if (!isOpen || !user) return null;

  const handleStartEditName = () => {
    setNameInput(user.name);
    setIsEditingName(true);
    setNameError(null);
    setNameSuccess(null);
  };

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }
    if (trimmed.length < 2) {
      setNameError("Name must be at least 2 characters long");
      return;
    }
    if (trimmed.length > 50) {
      setNameError("Name cannot exceed 50 characters");
      return;
    }
    if (trimmed === user.name) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsSavingName(true);
      setNameError(null);
      await updateName(trimmed);
      setNameSuccess("Name updated successfully!");
      setIsEditingName(false);
      setTimeout(() => setNameSuccess(null), 3000);
    } catch (err: any) {
      setNameError(err.message || "Failed to update name");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCopyChatId = () => {
    if (!user.chatId) return;
    navigator.clipboard.writeText(`@${user.chatId}`);
    setCopiedChatId(true);
    setTimeout(() => setCopiedChatId(false), 2000);
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsRemovingAvatar(true);
      await removeAvatar();
    } catch (err: any) {
      alert(err.message || "Failed to reset avatar");
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setIsDeactivating(true);
      setActionError(null);
      await deactivateAccount();
      setShowDeactivateModal(false);
      onClose();
    } catch (err: any) {
      setActionError(err.message || "Failed to deactivate account");
      setIsDeactivating(false);
    }
  };

  const handleDeleteAllChats = async () => {
    try {
      setIsDeletingAll(true);
      setActionError(null);
      await deleteAllConversations();
      setDeleteAllSuccess("All chats deleted successfully");
      setShowDeleteAllModal(false);
      setTimeout(() => setDeleteAllSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to delete all chats");
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="profile-settings-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-120 select-none">
      <div className="profile-settings-panel w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="profile-settings-header px-4 sm:px-7 py-3.5 sm:py-5 border-b border-theme-border flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-2xl font-semibold text-theme-text tracking-tight">Profile & Settings</h2>
          <button
            onClick={() => {
              setShowDeactivateModal(false);
              setShowDeleteAllModal(false);
              onClose();
            }}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl border border-theme-border flex-shrink-0 flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="profile-settings-body p-4 sm:p-7 overflow-y-auto">
          
          {/* Avatar & Photo Actions */}
          <div className="profile-settings-hero flex flex-col items-center text-center">
            <div className="profile-settings-avatar relative mb-4 inline-flex items-center justify-center group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
              <div className="rounded-full border border-theme-border">
                <AnimatedAvatar
                  src={user.avatar}
                  name={user.name}
                  id={user.id}
                  size="2xl"
                  showOnline={true}
                  isOnline={true}
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAvatarModalOpen(true);
                }}
                title="Customize Avatar"
                className="profile-settings-avatar-edit absolute bottom-0 right-0 p-2.5 rounded-full bg-theme-accent hover:bg-theme-accent-hover text-white shadow-xs border-2 border-theme-surface active:scale-95 transition-all z-10 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Display Name with inline edit */}
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="mt-1 w-full max-w-xs flex flex-col items-center gap-1.5 animate-in fade-in duration-100">
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      setNameError(null);
                    }}
                    maxLength={50}
                    autoFocus
                    placeholder="Enter your name"
                    disabled={isSavingName}
                    className="flex-1 h-8 px-2.5 text-xs font-semibold bg-theme-bg border border-theme-accent rounded-lg text-theme-text focus:outline-none ring-1 ring-theme-accent/20"
                  />
                  <button
                    type="submit"
                    disabled={isSavingName || !nameInput.trim()}
                    className="h-8 px-2.5 rounded-lg bg-theme-accent hover:bg-theme-accent-hover text-white font-semibold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Save Name"
                  >
                    {isSavingName ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setNameInput(user.name);
                      setNameError(null);
                    }}
                    disabled={isSavingName}
                    className="h-8 w-8 rounded-lg bg-theme-bg hover:bg-theme-border/50 border border-theme-border text-theme-text-muted hover:text-theme-text flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {nameError && (
                  <p className="text-[11px] text-red-500 font-medium">{nameError}</p>
                )}
              </form>
            ) : (
              <div className="flex items-center justify-center gap-1.5 group">
                <h3 className="profile-settings-name text-[26px] font-semibold text-theme-text leading-tight">{user.name}</h3>
                <button
                  type="button"
                  onClick={handleStartEditName}
                  className="p-1 rounded-md text-theme-accent hover:text-theme-accent hover:bg-theme-accent/10 transition-colors cursor-pointer"
                  title="Edit Account Name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}


            {nameSuccess && (
              <p className="text-[11px] text-theme-accent font-medium flex items-center justify-center gap-1 mt-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{nameSuccess}</span>
              </p>
            )}

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="profile-settings-chat-id text-base font-medium text-theme-text-muted">
                @{user.chatId}
              </span>
              <button
                type="button"
                onClick={handleCopyChatId}
                className="p-1 rounded text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent/10 transition-colors"
                title="Copy Chat ID"
              >
                {copiedChatId ? (
                  <Check className="w-3.5 h-3.5 text-theme-accent" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Avatar Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="profile-settings-action-button inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-accent hover:opacity-90 text-white text-xs font-medium shadow-subtle transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Choose Avatar</span>
              </button>

              <button
                type="button"
                onClick={onOpenCropPicker}
                className="profile-settings-action-button inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-accent/10 hover:bg-theme-accent/15 text-theme-accent text-xs font-medium border border-theme-accent/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>

              {user.avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isRemovingAvatar}
                  className="profile-settings-action-button inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-surface hover:bg-theme-bg text-theme-text-secondary text-xs font-medium border border-theme-border transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  title="Switch to default algorithmic character avatar"
                >
                  {isRemovingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 text-theme-text-muted" />
                  )}
                  <span>Reset Default</span>
                </button>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="profile-info-card p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-theme-text-muted">
                <User className="w-3.5 h-3.5" />
                <span>Display Name</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-theme-text">{user.name}</span>
                {!isEditingName && (
                    <button
                    type="button"
                    onClick={handleStartEditName}
                      className="inline-flex items-center gap-1 text-[11px] text-theme-accent hover:underline font-medium cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-theme-text-muted">
                <AtSign className="w-3.5 h-3.5" />
                <span>Chat ID</span>
              </span>
              <span className="font-mono font-medium text-theme-text">@{user.chatId}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-theme-text-muted">
                <Mail className="w-3.5 h-3.5" />
                <span>Email Address</span>
              </span>
              <span className="font-medium text-theme-text truncate max-w-[200px]">{user.email}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-theme-border/60">
              <span className="flex items-center gap-2 text-theme-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-theme-accent" />
                <span>Account Status</span>
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-theme-accent">
                <CheckCircle2 className="w-3 h-3 text-theme-accent" />
                <span>Verified</span>
              </span>
            </div>
          </div>

          {/* Account Actions & Danger Zone */}
          <div className="profile-management space-y-3 pt-2 border-t border-theme-border/60">
            <h4 className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider px-0.5">
              Account Management
            </h4>

            {deleteAllSuccess && (
              <div className="p-3 rounded-xl bg-theme-accent/10 border border-theme-accent/20 text-xs text-theme-accent font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{deleteAllSuccess}</span>
              </div>
            )}

            {/* Delete All Chats Row */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-theme-bg/60 border border-theme-border gap-3">
              <div className="min-w-0">
                <h5 className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <span>Delete All Chats</span>
                </h5>
                <p className="text-[11px] text-theme-text-muted mt-0.5 leading-relaxed">
                  Permanently clear all conversation and message history
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setShowDeleteAllModal(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors flex-shrink-0 cursor-pointer"
              >
                Delete all chats
              </button>
            </div>

            {/* Deactivate Account Row */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setShowDeactivateModal(true);
                }}
                className="w-full sm:w-auto px-5 py-2 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate my account</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Modal: Deactivate Account */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-modal flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
              <UserX className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-theme-text mb-1.5">
              Deactivate your account?
            </h3>
            <p className="text-xs text-theme-text-muted leading-relaxed mb-5">
              You will be signed out and your profile will be hidden from searches. You can sign in anytime to reactivate your account.
            </p>
            {actionError && (
              <p className="text-xs text-red-500 mb-3 font-medium">{actionError}</p>
            )}
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setActionError(null);
                }}
                disabled={isDeactivating}
                className="flex-1 py-2 rounded-lg border border-theme-border text-xs font-medium text-theme-text hover:bg-theme-bg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeactivating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deactivating...</span>
                  </>
                ) : (
                  <span>Deactivate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete All Chats */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-modal flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-theme-text mb-1.5">
              Delete all chats?
            </h3>
            <p className="text-xs text-theme-text-muted leading-relaxed mb-5">
              This will permanently delete all your 1-on-1 and group conversations along with all messages and media history. This action cannot be undone.
            </p>
            {actionError && (
              <p className="text-xs text-red-500 mb-3 font-medium">{actionError}</p>
            )}
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAllModal(false);
                  setActionError(null);
                }}
                disabled={isDeletingAll}
                className="flex-1 py-2 rounded-lg border border-theme-border text-xs font-medium text-theme-text hover:bg-theme-bg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllChats}
                disabled={isDeletingAll}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete All</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Customization Modal */}
      <AvatarSelectorModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onOpenCropPicker={onOpenCropPicker}
      />
    </div>
  );
};
