import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Trash2, Send, Loader2 } from "lucide-react";
import { stopMediaStream } from "../utils/webrtc";

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioFile: File) => Promise<void>;
  isSending: boolean;
  disabled?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoiceMessage,
  isSending,
  disabled = false,
  onRecordingStateChange,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Stop everything safely
  const cleanupRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaStreamRef.current) {
      stopMediaStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // already stopped
      }
      mediaRecorderRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    onRecordingStateChange?.(false);
    setRecordingDuration(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // Start recording
  const startRecording = async () => {
    if (disabled || isSending || isRecording) return;
    setErrorMessage(null);

    // Check browser support
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErrorMessage("Voice recording is not supported in this browser.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      isCancelledRef.current = false;

      // Select supported audio mimeType
      let mimeType = "";
      let ext = "webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
        ext = "webm";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
        ext = "webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
        ext = "ogg";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
        ext = "mp4";
      }

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopMediaStream(mediaStreamRef.current);
        mediaStreamRef.current = null;

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        if (isCancelledRef.current) {
          audioChunksRef.current = [];
          setIsRecording(false);
          setRecordingDuration(0);
          return;
        }

        if (audioChunksRef.current.length === 0) {
          setIsRecording(false);
          setRecordingDuration(0);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingDuration(0);

        const audioFile = new File(
          [audioBlob],
          `voice_${Date.now()}.${ext}`,
          { type: audioBlob.type }
        );

        try {
          await onSendVoiceMessage(audioFile);
        } catch (err: any) {
          setErrorMessage(err.message || "Failed to send voice message");
          setTimeout(() => setErrorMessage(null), 3500);
        }
      };

      recorder.start(250); // collect 250ms chunks
      setIsRecording(true);
      onRecordingStateChange?.(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone recording error:", err);
      cleanupRecording();
      setErrorMessage(
        "Microphone access denied. Please grant microphone permission to record voice messages."
      );
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Cancel recording and discard audio
  const cancelRecording = () => {
    isCancelledRef.current = true;
    cleanupRecording();
  };

  // Stop recording and send audio
  const stopAndSendRecording = () => {
    isCancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // If in active recording mode: render sleek recording status bar
  if (isRecording) {
    return (
      <div className="flex-1 flex items-center justify-between gap-3 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in duration-150 select-none">
        {/* Pulsing Red Dot & Timer */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-mono font-bold text-red-500">
            {formatDuration(recordingDuration)}
          </span>
          <span className="text-xs text-theme-text-muted hidden sm:inline">
            Recording voice message...
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Cancel */}
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 rounded-xl text-theme-text-muted hover:text-red-500 hover:bg-theme-bg active:scale-95 transition-all cursor-pointer"
            title="Cancel recording"
            aria-label="Cancel recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Send */}
          <button
            type="button"
            onClick={stopAndSendRecording}
            disabled={isSending}
            className="p-1.5 px-3 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-medium text-xs flex items-center gap-1 shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Send voice message"
            aria-label="Send voice message"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Normal state: Mic button
  return (
    <div className="relative flex items-center">
      {errorMessage && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-medium shadow-lg z-30 animate-in fade-in zoom-in-95 duration-150">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={startRecording}
        disabled={disabled || isSending}
        className="p-2 rounded-xl text-theme-text-muted hover:text-emerald-500 hover:bg-theme-bg transition-theme flex-shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
        title="Record voice message"
        aria-label="Record voice message"
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
};
