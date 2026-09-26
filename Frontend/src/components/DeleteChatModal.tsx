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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-3xl shadow-2xl p-6 text-theme-text overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.2)] ring-4 ring-red-500/10 animate-in zoom-in-75 duration-200">
            <Trash2 className="w-7 h-7 animate-pulse" />
          </div>
        </div>

        {/* Title & Warning message */}
        <div className="text-center mb-5">
          <h3 className="text-lg font-bold text-theme-text">
            {isGroup ? "Delete & Leave Group?" : "Delete Chat?"}
          </h3>
          <p className="text-xs text-theme-text-secondary mt-1.5 leading-relaxed">
            Are you sure you want to delete your conversation with{" "}
            <strong className="text-theme-text font-semibold break-all">"{conversationName || "Chat"}"</strong>?
          </p>
          <p className="text-[11px] text-red-500/90 font-medium mt-1">
            This action cannot be undone and will delete all messages.
          </p>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-theme-bg hover:bg-theme-border text-theme-text text-xs font-semibold border border-theme-border transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_2px_10px_rgba(239,68,68,0.35)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
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
