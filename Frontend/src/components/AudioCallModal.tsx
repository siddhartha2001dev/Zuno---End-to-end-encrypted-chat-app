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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-3xl shadow-2xl p-6 sm:p-8 text-theme-text overflow-hidden relative flex flex-col items-center animate-in zoom-in-95 duration-150">
        
        {/* Glow ambient background effect */}
        <div
          className={`absolute -top-16 -left-16 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 ${
            callState === "connected"
              ? "bg-emerald-500"
              : callState === "failed" || callState === "rejected"
              ? "bg-red-500"
              : "bg-primary-500"
          }`}
        />

        {/* Peer Avatar with animated ringing pulse */}
        <div className="relative mt-2 mb-5">
          {(callState === "calling" || callState === "ringing" || callState === "connecting") && (
            <>
              <span className="absolute inset-0 rounded-full bg-primary-500/30 animate-ping duration-1000 pointer-events-none" />
              <span className="absolute -inset-2 rounded-full border-2 border-primary-500/40 animate-pulse pointer-events-none" />
            </>
          )}
          <AnimatedAvatar
            id={peer.id}
            src={peer.avatar}
            name={peer.name}
            size="2xl"
          />
        </div>

        {/* Peer Name */}
        <h3 className="text-xl font-bold text-theme-text text-center truncate max-w-full px-2">
          {peer.name}
        </h3>

        {/* Call State / Duration / Subtitle */}
        <div className="mt-1.5 mb-6 text-center">
          {callState === "calling" && (
            <p className="text-sm font-medium text-theme-text-secondary flex items-center justify-center gap-1.5 animate-pulse">
              <span>Calling...</span>
            </p>
          )}

          {callState === "ringing" && (
            <p className="text-sm font-medium text-primary-400 flex items-center justify-center gap-1.5 animate-bounce">
              <span>Incoming audio call...</span>
            </p>
          )}

          {callState === "connecting" && (
            <p className="text-sm font-medium text-theme-text-secondary flex items-center justify-center gap-1.5 animate-pulse">
              <span>Connecting...</span>
            </p>
          )}

          {callState === "connected" && (
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-0.5">
                Connected
              </span>
              <span className="text-lg font-mono font-bold text-theme-text">
                {formatDuration(callDuration)}
              </span>
            </div>
          )}

          {callState === "rejected" && (
            <p className="text-sm font-medium text-red-400 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage || "Call declined"}</span>
            </p>
          )}

          {callState === "ended" && (
            <p className="text-sm font-medium text-theme-text-muted">
              {errorMessage || "Call ended"}
            </p>
          )}

          {callState === "failed" && (
            <p className="text-sm font-medium text-red-400 text-center max-w-xs px-2 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage || "Connection failed"}</span>
            </p>
          )}
        </div>

        {/* Call Controls */}
        <div className="w-full flex items-center justify-center gap-6 mt-2">
          {/* Callee Incoming State: Accept / Reject */}
          {callState === "ringing" && !isCaller && (
            <div className="flex items-center justify-around w-full px-4">
              {/* Decline */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => rejectCall("declined")}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
                  title="Decline"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-xs text-theme-text-secondary font-medium">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={acceptCall}
                  className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 animate-pulse transition-all cursor-pointer"
                  title="Accept"
                >
                  <Phone className="w-6 h-6" />
                </button>
                <span className="text-xs text-theme-text-secondary font-medium">Accept</span>
              </div>
            </div>
          )}

          {/* Caller Calling or Connecting State: Cancel/End */}
          {(callState === "calling" || (callState === "connecting" && isCaller)) && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
                title="Cancel Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-xs text-theme-text-secondary font-medium">Cancel</span>
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
                  className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                    isMuted
                      ? "bg-red-500/15 border-red-500/40 text-red-500"
                      : "bg-theme-bg border-theme-border text-theme-text hover:bg-theme-border"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <span className="text-xs text-theme-text-secondary font-medium">
                  {isMuted ? "Unmute" : "Mute"}
                </span>
              </div>

              {/* End Call */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={endCall}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-xs text-theme-text-secondary font-medium">End</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
