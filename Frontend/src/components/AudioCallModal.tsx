import React from "react";
import { Phone, PhoneOff, Mic, MicOff, AlertCircle } from "lucide-react";
import { useCall } from "../context/CallContext";
import { AnimatedAvatar } from "./AnimatedAvatar";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const AudioCallModal: React.FC = () => {
  const {
    callState,
    activeCall,
    callDuration,
    isMuted,
    errorMessage,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useCall();

  if (callState === "idle" || !activeCall) {
    return null;
  }

  const { peer, isCaller } = activeCall;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-2xl shadow-modal p-6 sm:p-8 text-theme-text overflow-hidden relative flex flex-col items-center">
        
        {/* Peer Avatar */}
        <div className="relative mt-2 mb-4">
          <div className={`rounded-full ${
            callState === "calling" || callState === "ringing" || callState === "connecting"
              ? "ring-2 ring-theme-accent/40"
              : ""
          }`}>
            <AnimatedAvatar
              id={peer.id}
              src={peer.avatar}
              name={peer.name}
              size="2xl"
            />
          </div>
        </div>

        {/* Peer Name */}
        <h3 className="text-lg font-semibold text-theme-text text-center truncate max-w-full px-2">
          {peer.name}
        </h3>

        {/* Call State / Duration / Subtitle */}
        <div className="mt-1 mb-6 text-center">
          {callState === "calling" && (
            <p className="text-xs font-medium text-theme-text-muted">
              Calling...
            </p>
          )}

          {callState === "ringing" && (
            <p className="text-xs font-medium text-theme-accent">
              Incoming audio call...
            </p>
          )}

          {callState === "connecting" && (
            <p className="text-xs font-medium text-theme-text-muted">
              Connecting...
            </p>
          )}

          {callState === "connected" && (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-accent mb-0.5">
                Connected
              </span>
              <span className="text-base font-mono font-semibold text-theme-text">
                {formatDuration(callDuration)}
              </span>
            </div>
          )}

          {callState === "rejected" && (
            <p className="text-xs font-medium text-red-500 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMessage || "Call declined"}</span>
            </p>
          )}

          {callState === "ended" && (
            <p className="text-xs font-medium text-theme-text-muted">
              {errorMessage || "Call ended"}
            </p>
          )}

          {callState === "failed" && (
            <p className="text-xs font-medium text-red-500 text-center max-w-xs px-2 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage || "Connection failed"}</span>
            </p>
          )}
        </div>

        {/* Call Controls */}
        <div className="w-full flex items-center justify-center gap-6">
          {/* Callee Incoming State: Accept / Reject */}
          {callState === "ringing" && !isCaller && (
            <div className="flex items-center justify-around w-full px-4">
              {/* Decline */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => rejectCall("declined")}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-subtle active:scale-95 transition-all cursor-pointer"
                  title="Decline"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
                <span className="text-[11px] text-theme-text-muted font-medium">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={acceptCall}
                  className="w-12 h-12 rounded-full bg-theme-accent hover:opacity-90 text-white flex items-center justify-center shadow-subtle active:scale-95 transition-all cursor-pointer"
                  title="Accept"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <span className="text-[11px] text-theme-text-muted font-medium">Accept</span>
              </div>
            </div>
          )}

          {/* Caller Calling or Connecting State: Cancel/End */}
          {(callState === "calling" || (callState === "connecting" && isCaller)) && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={endCall}
                className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-subtle active:scale-95 transition-all cursor-pointer"
                title="Cancel Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
              <span className="text-[11px] text-theme-text-muted font-medium">Cancel</span>
            </div>
          )}

          {/* Connected State: Mute / End */}
          {callState === "connected" && (
            <div className="flex items-center justify-center gap-6">
              {/* Mute Toggle */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                    isMuted
                      ? "bg-red-500/10 border-red-500/30 text-red-500"
                      : "bg-theme-bg border-theme-border text-theme-text hover:bg-theme-border"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <span className="text-[11px] text-theme-text-muted font-medium">
                  {isMuted ? "Unmute" : "Mute"}
                </span>
              </div>

              {/* End Call */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={endCall}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-subtle active:scale-95 transition-all cursor-pointer"
                  title="End Call"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
                <span className="text-[11px] text-theme-text-muted font-medium">End</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
