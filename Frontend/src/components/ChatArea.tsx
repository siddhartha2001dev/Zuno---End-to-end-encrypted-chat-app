import React, { useState, useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { MessageBubble } from "./MessageBubble";
import { ZunoLogo } from "./ZunoLogo";
import { AnimatedAvatar } from "./AnimatedAvatar";
import { DeleteChatModal } from "./DeleteChatModal";
import { EmojiPicker } from "./EmojiPicker";
import { api } from "../services/api";
import {
  Send,
  Smile,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Plus,
  MessageCircle,
  Paperclip,
  FileText,
  X,
  Trash2,
} from "lucide-react";

interface ChatAreaProps {
  onOpenNewChat?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenNewChat }) => {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    loadingMessages,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    typingUser,
    onlineUsers,
    clearActiveConversation,
    deleteConversation,
  } = useChat();

  const [inputContent, setInputContent] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<boolean>(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom on new messages or active conversation change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typingUser]);

  const containerRef = useRef<HTMLElement>(null);

  // Fix mobile keyboard pushing header off-screen.
  // We listen to visualViewport and update the container height to match
  // the actual visible area (excludes the software keyboard).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Prevent browser window from scrolling away from (0,0)
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.body.scrollTop !== 0) {
        document.body.scrollTop = 0;
      }

      // Height of visible viewport (shrinks when keyboard opens)
      if (containerRef.current) {
        containerRef.current.style.height = `${vv.height}px`;
      }

      const isKeyboard = vv.height < window.innerHeight - 80;
      setIsKeyboardOpen(isKeyboard);

      if (isKeyboard) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 80);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 280);
      }
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
    };
  }, []);

  // Focus textarea when conversation changes
  useEffect(() => {
    if (activeConversation && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeConversation?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setSendError("Attachment size must be under 25MB.");
      return;
    }

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreviewUrl(URL.createObjectURL(file));
    }
    setSendError(null);
  };

  const removeSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart ?? inputContent.length;
      const end = textarea.selectionEnd ?? inputContent.length;
      const before = inputContent.substring(0, start);
      const after = inputContent.substring(end);
      const nextContent = before + emoji + after;
      setInputContent(nextContent);

      setTimeout(() => {
        textarea.focus();
        const nextCursor = start + emoji.length;
        textarea.setSelectionRange(nextCursor, nextCursor);
      }, 0);
    } else {
      setInputContent((prev) => prev + emoji);
    }
  };

  // Typing debounce handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);
    if (sendError) setSendError(null);

    // Notify typing start
    sendTypingStart();

    // Reset stop typing debounce timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const hasText = inputContent.trim().length > 0;
    if ((!hasText && !selectedFile) || sending) return;

    const content = inputContent.trim();
    const fileToUpload = selectedFile;

    setInputContent("");
    removeSelectedFile();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStop();

    setSending(true);
    setSendError(null);

    try {
      let mediaOptions:
        | {
            mediaUrl: string;
            fileName: string;
            fileSize: number;
            messageType: "image" | "file";
          }
        | undefined = undefined;

      if (fileToUpload) {
        setUploadProgress("Uploading attachment...");
        const uploadRes = await api.upload.media(fileToUpload);
        if (!uploadRes.success || !uploadRes.mediaUrl) {
          throw new Error("Failed to upload file to media storage.");
        }
        mediaOptions = {
          mediaUrl: uploadRes.mediaUrl,
          fileName: uploadRes.fileName || fileToUpload.name,
          fileSize: uploadRes.fileSize || fileToUpload.size,
          messageType:
            uploadRes.messageType ||
            (fileToUpload.type.startsWith("image/") ? "image" : "file"),
        };
      }

      setUploadProgress(null);
      await sendMessage(content, mediaOptions);
    } catch (err: any) {
      console.error("Message send failed", err);
      setInputContent(content); // Restore content on send failure
      setSendError(err?.message || "Failed to send message");
    } finally {
      setSending(false);
      setUploadProgress(null);
    }
  };

  // Helper to format date headers
  const getMessageDateLabel = (dateStr?: string) => {
    if (!dateStr) return "Today";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Today";
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
  };

  // Empty State when no conversation is selected (hidden on mobile, visible on desktop)
  if (!activeConversation) {
    return (
      <main className="hidden md:flex flex-1 h-full flex-col items-center justify-center bg-theme-bg p-8 text-center select-none relative overflow-hidden">
        {/* Ambient Liquid Glass Orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full liquid-orb-emerald" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full liquid-orb-mint" />

        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <div className="mb-5 p-4 rounded-3xl liquid-glass shadow-card flex items-center justify-center">
            <ZunoLogo size="xl" showWordmark={false} />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-theme-text mb-1.5">
            Zuno Chat
          </h2>
          <p className="text-xs text-theme-text-secondary max-w-xs mb-6 leading-relaxed">
            Select a conversation from the sidebar or start a new chat to begin messaging.
          </p>

          {onOpenNewChat && (
            <button
              onClick={onOpenNewChat}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all shadow-[0_4px_14px_-2px_rgba(16,185,129,0.35)] active:scale-97"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Conversation</span>
            </button>
          )}
        </div>
      </main>
    );
  }

  // Determine presence for direct chat
  const otherMember = activeConversation.members.find((m) => m.userId !== user?.id);
  const isDirectOnline = otherMember ? onlineUsers.has(otherMember.userId) : false;
  const isGroup = activeConversation.type?.toUpperCase() === "GROUP";
  const isTyping = typingUser && typingUser.conversationId === activeConversation.id;
  const hasText = inputContent.trim().length > 0;
  const canSend = (hasText || Boolean(selectedFile)) && !sending;



  return (
    <main
      ref={containerRef}
      className="flex-1 flex flex-col bg-theme-bg overflow-hidden relative"
      style={{
        position: 'relative',
        height: '100%',
        maxHeight: '100dvh'
      }}
    >
      {/* Ambient Liquid Orbs for Chat Area */}
      <div className="absolute top-1/6 right-1/4 w-72 h-72 rounded-full liquid-orb-emerald" />
      <div className="absolute bottom-1/4 left-1/5 w-80 h-80 rounded-full liquid-orb-mint" />

      {/* Compact Genie-Style Chat Header */}
      <header
        className="px-3.5 sm:px-6 border-b border-theme-border bg-theme-surface/95 backdrop-blur-xl flex items-center justify-between flex-shrink-0 z-20 transition-theme shadow-xs"
        style={{
          paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
          minHeight: 'calc(58px + env(safe-area-inset-top, 0px))',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Back Button: Standard mobile navigation, NO hamburger menu */}
          <button
            onClick={clearActiveConversation}
            className="p-1.5 -ml-1 rounded-xl text-theme-text-muted hover:text-theme-text hover:bg-theme-bg md:hidden transition-theme flex-shrink-0 active:scale-95"
            aria-label="Back to conversations"
            title="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact / Group Avatar with Live Ring */}
          <div className="relative flex-shrink-0">
            <AnimatedAvatar
              src={activeConversation.avatar}
              name={activeConversation.name || "Chat"}
              id={activeConversation.id}
              size="md"
              isGroup={isGroup}
              showOnline={!isGroup}
              isOnline={isDirectOnline}
            />
          </div>

          {/* Contact / Group Information */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-theme-text text-sm leading-tight truncate">
                {activeConversation.name}
              </h1>
              {!isGroup && otherMember?.user?.chatId && (
                <span className="text-[11px] text-theme-accent font-medium flex-shrink-0">
                  @{otherMember.user.chatId}
                </span>
              )}
            </div>
            <div className="text-[11px] text-theme-text-muted flex items-center gap-1.5 leading-none mt-0.5">
              {isTyping ? (
                <span className="text-theme-accent font-semibold animate-pulse">
                  {typingUser.userName} is typing...
                </span>
              ) : isGroup ? (
                <span>{activeConversation.members.length} members</span>
              ) : isDirectOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active now
                </span>
              ) : (
                <span>Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-theme-text-muted bg-theme-bg px-2.5 py-1 rounded-full border border-theme-border">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted</span>
          </div>

          {/* Delete Conversation Button */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            title={isGroup ? "Leave & Delete Group" : "Delete Chat"}
            aria-label="Delete Chat"
            className="p-2 rounded-xl text-theme-text-muted hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Thread Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 md:px-8 space-y-1"
        style={{ overscrollBehavior: 'contain' }}
      >
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-theme-text-muted text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-theme-accent" />
            <span>Loading conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-theme-text-muted space-y-2.5 py-12 max-w-sm mx-auto select-none animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-center text-theme-accent shadow-card">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-theme-text mb-0.5">
                {activeConversation.name}
              </p>
              <p className="text-xs text-theme-text-secondary leading-relaxed">
                No messages yet. Send a message to start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const showDateHeader =
              !prevMsg ||
              getMessageDateLabel(prevMsg.createdAt) !== getMessageDateLabel(msg.createdAt);

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] font-semibold text-theme-text-muted bg-theme-surface/90 border border-theme-border px-3 py-0.5 rounded-full shadow-subtle select-none">
                      {getMessageDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isGroup={isGroup}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Typing Indicator Bubble */}
        {isTyping && (
          <div className="flex items-center gap-2 text-theme-text-muted text-xs py-1 px-1">
            <div className="flex items-center gap-1.5 bg-theme-surface px-3 py-1.5 rounded-full border border-theme-border shadow-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-[11px] text-theme-text-secondary font-medium">
                {typingUser.userName} is typing
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Floating Modern Message Composer */}
      <footer
        className="px-3 pt-1.5 md:p-4 bg-transparent z-10 flex-shrink-0 transition-all duration-150 composer-footer-lift"
        style={isKeyboardOpen ? { paddingBottom: "8px" } : undefined}
      >
        <div className="max-w-3xl mx-auto relative">
          {/* Interactive Emoji Picker Popup */}
          <EmojiPicker
            isOpen={isEmojiPickerOpen}
            onClose={() => setIsEmojiPickerOpen(false)}
            onSelectEmoji={handleSelectEmoji}
            triggerRef={emojiButtonRef}
          />

          {sendError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
              <span className="font-medium">{sendError}</span>
              <button
                type="button"
                onClick={() => setSendError(null)}
                className="text-red-500 hover:text-red-700 ml-2 font-bold px-1"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
          {/* Attachment Preview Card */}
          {selectedFile && (
            <div className="mb-2 p-2.5 rounded-xl bg-theme-surface/95 backdrop-blur-md border border-theme-border flex items-center justify-between shadow-subtle animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-3 min-w-0">
                {filePreviewUrl ? (
                  <img
                    src={filePreviewUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-theme-border flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-theme-bg flex items-center justify-center text-theme-accent border border-theme-border flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-theme-text truncate max-w-[200px] sm:max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-theme-text-muted">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
                    {selectedFile.type.startsWith("image/") ? "Image" : "Document"}
                  </p>
                  {uploadProgress && (
                    <span className="text-[10px] font-semibold text-theme-accent flex items-center gap-1 mt-0.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {uploadProgress}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={removeSelectedFile}
                disabled={sending}
                className="p-1.5 rounded-lg text-theme-text-muted hover:text-red-500 hover:bg-theme-bg transition-colors disabled:opacity-50"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 liquid-glass rounded-2xl p-2 shadow-card focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-theme">
            {/* Quick Emoji Trigger */}
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
              className={`p-2 rounded-xl transition-theme flex-shrink-0 ${
                isEmojiPickerOpen
                  ? "text-emerald-500 bg-emerald-500/15"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-bg"
              }`}
              title="Add emoji"
              aria-label="Add emoji"
              aria-expanded={isEmojiPickerOpen}
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Media Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className={`p-2 rounded-xl transition-theme flex-shrink-0 ${
                selectedFile
                  ? "text-emerald-500 bg-emerald-500/10"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-bg"
              } disabled:opacity-50`}
              title="Attach photo or document (max 25MB)"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputContent}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (window.scrollY !== 0 || window.scrollX !== 0) {
                  window.scrollTo(0, 0);
                }
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                }, 120);
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                }, 320);
              }}
              placeholder={
                selectedFile
                  ? "Add a caption (optional)..."
                  : `Message ${activeConversation.name || "..."}`
              }
              className="flex-1 bg-transparent border-0 resize-none text-[16px] sm:text-[14px] text-theme-text placeholder-theme-text-muted px-2 py-1.5 focus:outline-none max-h-32 min-h-[28px] leading-relaxed"
            />

            {/* Dynamic Send Button */}
            <button
              type="button"
              disabled={!canSend}
              onClick={handleSend}
              aria-label="Send message"
              title="Send (Enter)"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-theme flex-shrink-0 ${
                canSend
                  ? "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-[0_4px_14px_-2px_rgba(16,185,129,0.45)] hover:scale-105 active:scale-95"
                  : "bg-theme-bg text-theme-text-muted border border-theme-border opacity-50 cursor-not-allowed"
              }`}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center justify-between mt-1.5 px-2 text-[10px] text-theme-text-muted">
            <span>Press <kbd className="px-1 py-0.2 bg-theme-surface border border-theme-border rounded font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.2 bg-theme-surface border border-theme-border rounded font-mono">Shift+Enter</kbd> for new line</span>
          </div>
        </div>
      </footer>

      {/* Delete Chat Confirmation Modal */}
      <DeleteChatModal
        isOpen={isDeleteModalOpen}
        conversationName={activeConversation.name}
        isGroup={isGroup}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          await deleteConversation(activeConversation.id);
        }}
      />
    </main>
  );
};
