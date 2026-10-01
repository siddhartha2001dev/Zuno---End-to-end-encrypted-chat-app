import React, { useState } from "react";
import { Trash2, Loader2, X } from "lucide-react";

interface DeleteChatModalProps {
  isOpen: boolean;
  conversationName?: string | null;
  isGroup?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteChatModal: React.FC<DeleteChatModalProps> = ({
  isOpen,
  conversationName,
  isGroup = false,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      console.error("Delete conversation error:", err);
      setError(err.message || "Failed to delete conversation");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-2xl shadow-modal p-6 text-theme-text overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex justify-center mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Trash2 className="w-5 h-5" />
          </div>
        </div>

        {/* Title & Warning message */}
        <div className="text-center mb-5">
          <h3 className="text-sm font-semibold text-theme-text">
            {isGroup ? "Delete & Leave Group?" : "Delete Chat?"}
          </h3>
          <p className="text-xs text-theme-text-secondary mt-1.5 leading-relaxed">
            Are you sure you want to delete your conversation with{" "}
            <strong className="text-theme-text font-medium break-all">"{conversationName || "Chat"}"</strong>?
          </p>
          <p className="text-[11px] text-red-500/90 font-medium mt-1">
            This action cannot be undone and will delete all messages.
          </p>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2 px-3 rounded-lg bg-theme-surface hover:bg-theme-bg text-theme-text text-xs font-medium border border-theme-border transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Chat</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
