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
  Phone,
} from "lucide-react";
import { useCall } from "../context/CallContext";
import { VoiceRecorder } from "./VoiceRecorder";

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
  const { startCall } = useCall();

  const [inputContent, setInputContent] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<boolean>(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);

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
            messageType: "image" | "file" | "audio";
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

  const handleSendVoiceMessage = async (audioFile: File) => {
    if (!audioFile || audioFile.size === 0) {
      throw new Error("Voice recording is empty. Please try again.");
    }
    setSending(true);
    setSendError(null);
    try {
      setUploadProgress("Uploading voice message...");
      const uploadRes = await api.upload.media(audioFile);
      if (!uploadRes.success || !uploadRes.mediaUrl) {
        throw new Error("Failed to upload voice message.");
      }
      await sendMessage("", {
        mediaUrl: uploadRes.mediaUrl,
        fileName: uploadRes.fileName || audioFile.name,
        fileSize: uploadRes.fileSize || audioFile.size,
        messageType: "audio",
      });
    } catch (err: any) {
      console.error("Voice message send failed", err);
      setSendError(err?.message || "Failed to send voice message");
      throw err;
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
      <main className="hidden md:flex flex-1 h-full flex-col items-center justify-center bg-theme-bg p-8 text-center select-none">
        <div className="flex flex-col items-center max-w-sm">
          <div className="mb-4 w-12 h-12 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-center text-theme-accent">
            <ZunoLogo size="sm" showWordmark={false} />
          </div>

          <h2 className="text-base font-semibold tracking-tight text-theme-text mb-1">
            Your space is quiet
          </h2>
          <p className="text-xs text-theme-text-muted max-w-xs mb-5">
            Select a conversation to begin messaging.
          </p>

          {onOpenNewChat && (
            <button
              onClick={onOpenNewChat}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start a conversation</span>
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
      {/* Clean Chat Header */}
      <header
        className="px-4 py-2.5 sm:px-6 border-b border-theme-border bg-theme-surface flex items-center justify-between flex-shrink-0 z-20"
        style={{
          paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
          minHeight: 'calc(56px + env(safe-area-inset-top, 0px))',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={clearActiveConversation}
            className="p-1 -ml-1 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-bg md:hidden transition-colors flex-shrink-0 active:scale-95"
            aria-label="Back to conversations"
            title="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
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

          {/* Contact / Group Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-theme-text text-[13.5px] leading-tight truncate">
                {activeConversation.name}
              </h1>
              {!isGroup && otherMember?.user?.chatId && (
                <span className="text-[11px] text-theme-text-muted font-normal flex-shrink-0">
                  @{otherMember.user.chatId}
                </span>
              )}
            </div>
            <div className="text-[11px] text-theme-text-muted flex items-center gap-1.5 leading-none mt-0.5">
              {isTyping ? (
                <span className="text-theme-accent font-medium">
                  {typingUser.userName} is typing...
                </span>
              ) : isGroup ? (
                <span>{activeConversation.members.length} members</span>
              ) : isDirectOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active now
                </span>
              ) : (
                <span>Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1">
          {/* Audio Call Button for 1-to-1 Direct Chats */}
          {!isGroup && otherMember && (
            <button
              type="button"
              onClick={() => {
                startCall(activeConversation.id, {
                  id: otherMember.user.id,
                  name: otherMember.user.name,
                  avatar: otherMember.user.avatar,
                });
              }}
              title={`Call ${otherMember.user.name}`}
              aria-label={`Call ${otherMember.user.name}`}
              className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-accent hover:bg-theme-bg active:scale-95 transition-colors cursor-pointer"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-theme-text-muted bg-theme-bg px-2 py-0.5 rounded-md border border-theme-border-subtle">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted</span>
          </div>

          {/* Delete Conversation Button */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            title={isGroup ? "Leave & Delete Group" : "Delete Chat"}
            aria-label="Delete Chat"
            className="p-1.5 rounded-lg text-theme-text-muted hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Thread Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 md:px-8"
        style={{ overscrollBehavior: 'contain' }}
      >
        {loadingMessages ? (
          /* Polished Skeleton Message State */
          <div className="flex flex-col justify-end h-full px-2 py-4 space-y-3">
            <div className="flex items-start gap-2 max-w-[65%]">
              <div className="w-8 h-8 rounded-full bg-theme-surface animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-9 w-48 rounded-2xl bg-theme-surface border border-theme-border animate-pulse" />
                <div className="h-7 w-32 rounded-2xl bg-theme-surface border border-theme-border animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-end space-y-1.5 self-end max-w-[65%]">
              <div className="h-8 w-40 rounded-2xl bg-theme-accent/15 border border-theme-accent/20 animate-pulse" />
              <div className="h-10 w-56 rounded-2xl bg-theme-accent/15 border border-theme-accent/20 animate-pulse" />
            </div>
            <div className="flex items-start gap-2 max-w-[65%]">
              <div className="w-8 h-8 rounded-full bg-theme-surface animate-pulse" />
              <div className="h-8 w-36 rounded-2xl bg-theme-surface border border-theme-border animate-pulse" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-theme-text-muted space-y-2 py-12 max-w-xs mx-auto select-none">
            <div className="w-10 h-10 rounded-xl bg-theme-surface border border-theme-border flex items-center justify-center text-theme-accent">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-theme-text">
                {activeConversation.name}
              </p>
              <p className="text-[11px] text-theme-text-muted mt-0.5">
                No messages yet. Send a message to start the conversation.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];

            const showDateHeader =
              !prevMsg ||
              getMessageDateLabel(prevMsg.createdAt) !== getMessageDateLabel(msg.createdAt);

            const isSameSenderAsPrev =
              Boolean(prevMsg) &&
              prevMsg.senderId === msg.senderId &&
              !showDateHeader &&
              Math.abs(new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 4 * 60 * 1000;

            const nextHasDateHeader =
              Boolean(nextMsg) &&
              getMessageDateLabel(nextMsg.createdAt) !== getMessageDateLabel(msg.createdAt);

            const isSameSenderAsNext =
              Boolean(nextMsg) &&
              nextMsg.senderId === msg.senderId &&
              !nextHasDateHeader &&
              Math.abs(new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 4 * 60 * 1000;

            const isFirstInGroup = !isSameSenderAsPrev;
            const isLastInGroup = !isSameSenderAsNext;

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex items-center gap-3 my-4 px-2 select-none">
                    <div className="flex-1 h-px bg-theme-border/50" />
                    <span className="text-[10px] font-semibold text-theme-text-muted tracking-wider uppercase">
                      {getMessageDateLabel(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-theme-border/50" />
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isGroup={isGroup}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Typing Indicator Bubble */}
        {isTyping && (
          <div className="flex items-center gap-2 text-theme-text-muted text-xs py-1.5 px-1 mt-1">
            <div className="flex items-center gap-1.5 bg-theme-surface px-3 py-1.5 rounded-full border border-theme-border shadow-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse [animation-delay:0.4s]" />
              <span className="ml-1 text-[11px] text-theme-text-muted font-normal">
                {typingUser.userName} is typing
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Message Composer */}
      <footer
        className="px-3 pt-1.5 md:p-4 bg-transparent z-10 flex-shrink-0 composer-footer-lift"
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
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
              <span className="font-normal">{sendError}</span>
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
            <div className="mb-2 p-2 rounded-lg bg-theme-surface border border-theme-border flex items-center justify-between shadow-subtle animate-in fade-in duration-100">
              <div className="flex items-center gap-2.5 min-w-0">
                {filePreviewUrl ? (
                  <img
                    src={filePreviewUrl}
                    alt="Preview"
                    className="w-10 h-10 rounded-md object-cover border border-theme-border flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-theme-bg flex items-center justify-center text-theme-accent border border-theme-border flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-theme-text truncate max-w-[200px] sm:max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-theme-text-muted">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {uploadProgress && (
                    <span className="text-[10px] font-medium text-theme-accent flex items-center gap-1 mt-0.5">
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
                className="p-1 rounded text-theme-text-muted hover:text-red-500 hover:bg-theme-bg transition-colors disabled:opacity-50"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Writing surface */}
          <div className="flex items-end gap-1.5 bg-theme-surface border border-theme-border rounded-xl p-1.5 focus-within:border-theme-accent focus-within:ring-1 focus-within:ring-theme-accent/20 transition-theme shadow-xs">
            {!isRecordingAudio && (
              <>
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
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    selectedFile
                      ? "text-theme-accent bg-theme-accent-subtle"
                      : "text-theme-text-muted hover:text-theme-text hover:bg-theme-bg"
                  }`}
                  title="Attach file"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Quick Emoji Trigger */}
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isEmojiPickerOpen
                      ? "text-theme-accent bg-theme-accent-subtle"
                      : "text-theme-text-muted hover:text-theme-text hover:bg-theme-bg"
                  }`}
                  title="Add emoji"
                  aria-label="Add emoji"
                  aria-expanded={isEmojiPickerOpen}
                >
                  <Smile className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Voice Message Recorder */}
            <VoiceRecorder
              onSendVoiceMessage={handleSendVoiceMessage}
              isSending={sending}
              disabled={sending}
              onRecordingStateChange={setIsRecordingAudio}
            />

            {!isRecordingAudio && (
              <>
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
                  }}
                  placeholder={
                    selectedFile
                      ? "Add a caption..."
                      : `Write a message...`
                  }
                  className="flex-1 bg-transparent border-0 resize-none text-[15px] sm:text-[13px] text-theme-text placeholder-theme-text-muted px-2 py-1.5 focus:outline-none max-h-32 min-h-[26px] leading-relaxed"
                />

                {/* Send Button */}
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={handleSend}
                  aria-label="Send message"
                  title="Send"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                    canSend
                      ? "bg-theme-accent text-white hover:bg-theme-accent-hover shadow-xs active:scale-95"
                      : "text-theme-text-muted opacity-40 cursor-not-allowed"
                  }`}
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}
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
