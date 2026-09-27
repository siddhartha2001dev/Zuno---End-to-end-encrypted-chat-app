import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { socketService } from "../services/socket";
import type {
  CallState,
  CallPeer,
  ActiveCall,
  CallContextType,
} from "../types/call.types";
import { getIceServers, stopMediaStream, tonePlayer } from "../utils/webrtc";

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [callState, setCallState] = useState<CallState>("idle");
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // WebRTC references
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // Keep ref of activeCall and callState for socket callbacks without stale closures
  const activeCallRef = useRef<ActiveCall | null>(null);
  activeCallRef.current = activeCall;

  const callStateRef = useRef<CallState>("idle");
  callStateRef.current = callState;

  // Initialize hidden remote audio element
  useEffect(() => {
    const audio = new Audio();
    audio.autoplay = true;
    remoteAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.srcObject = null;
    };
  }, []);

  // Cleanup all WebRTC, audio, timer resources
  const cleanupCall = useCallback(() => {
    tonePlayer.stop();

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingIceCandidatesRef.current = [];
    pendingOfferRef.current = null;
    setIsMuted(false);
  }, []);

  // Helper to transition back to idle with delay
  const transitionToIdle = useCallback(
    (nextState: CallState, error?: string, delay = 2000) => {
      cleanupCall();
      setCallState(nextState);
      if (error) setErrorMessage(error);

      setTimeout(() => {
        setCallState("idle");
        setActiveCall(null);
        setCallDuration(0);
        setErrorMessage(null);
      }, delay);
    },
    [cleanupCall]
  );

  // Setup RTCPeerConnection instance
  const createPeerConnection = useCallback(
    (targetUserId: string, callId: string): RTCPeerConnection => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection({
        iceServers: getIceServers(),
      });
      peerConnectionRef.current = pc;

      // Send local ICE candidates to peer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = socketService.getSocket();
          socket?.emit("call:ice-candidate", {
            callId,
            targetUserId,
            candidate: event.candidate,
          });
        }
      };

      // Handle receiving remote audio track
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch((err) => {
            console.warn("Autoplay remote audio blocked, awaiting user gesture:", err);
          });
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("WebRTC connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          tonePlayer.stop();
          setCallState("connected");
          // Start timer if not already running
          if (!timerIntervalRef.current) {
            setCallDuration(0);
            timerIntervalRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          }
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          tonePlayer.playCallEnded();
          transitionToIdle("failed", "Call connection lost");
        }
      };

      return pc;
    },
    [transitionToIdle]
  );

  // 1. Caller starts call
  const startCall = useCallback(
    async (conversationId: string, recipient: CallPeer) => {
      if (callStateRef.current !== "idle") return;
      if (!user) return;

      try {
        setErrorMessage(null);
        setCallState("calling");

        // Request local audio stream
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
          localStreamRef.current = stream;
        } catch (err: any) {
          console.error("Microphone permission denied:", err);
          setErrorMessage(
            "Microphone access was denied. Please allow microphone permissions to make calls."
          );
          setCallState("failed");
          setTimeout(() => {
            setCallState("idle");
            setErrorMessage(null);
          }, 3500);
          return;
        }

        const socket = socketService.getSocket();
        if (!socket || !socket.connected) {
          stopMediaStream(stream);
          setErrorMessage("Realtime connection unavailable. Please try again.");
          setCallState("failed");
          setTimeout(() => {
            setCallState("idle");
            setErrorMessage(null);
          }, 2500);
          return;
        }

        // Emit call:initiate
        socket.emit(
          "call:initiate",
          { conversationId, recipientId: recipient.id },
          async (res: { success: boolean; callId?: string; error?: string }) => {
            if (!res?.success || !res.callId) {
              stopMediaStream(stream);
              tonePlayer.playCallEnded();
              setErrorMessage(res?.error || "Failed to initiate call");
              setCallState("failed");
              setTimeout(() => {
                setCallState("idle");
                setErrorMessage(null);
              }, 2500);
              return;
            }

            const currentActiveCall: ActiveCall = {
              callId: res.callId,
              conversationId,
              peer: recipient,
              isCaller: true,
            };
            setActiveCall(currentActiveCall);

            // Play ringback tone while waiting for recipient
            tonePlayer.playOutgoingRingback();

            // Create peer connection and add audio tracks
            const pc = createPeerConnection(recipient.id, res.callId);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          }
        );
      } catch (err: any) {
        cleanupCall();
        setErrorMessage(err.message || "Failed to start call");
        setCallState("failed");
        setTimeout(() => {
          setCallState("idle");
          setErrorMessage(null);
        }, 2500);
      }
    },
    [user, createPeerConnection, cleanupCall]
  );

  // 2. Callee accepts incoming call
  const acceptCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || callStateRef.current !== "ringing") return;

    tonePlayer.stop();
    setCallState("connecting");

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        localStreamRef.current = stream;
      } catch (err) {
        console.error("Microphone permission denied:", err);
        socketService.getSocket()?.emit("call:reject", {
          callId: current.callId,
          callerId: current.peer.id,
          reason: "permission_denied",
        });
        transitionToIdle("failed", "Microphone access was denied.");
        return;
      }

      // Notify caller that call was accepted
      socketService.getSocket()?.emit("call:accept", {
        callId: current.callId,
        callerId: current.peer.id,
      });

      // Create peer connection & attach tracks
      const pc = createPeerConnection(current.peer.id, current.callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // If offer already arrived before acceptance, process it now
      if (pendingOfferRef.current) {
        const offer = pendingOfferRef.current;
        pendingOfferRef.current = null;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Drain any queued ICE candidates
        for (const candidate of pendingIceCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        pendingIceCandidatesRef.current = [];

        // Create answer and emit
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketService.getSocket()?.emit("call:answer", {
          callId: current.callId,
          callerId: current.peer.id,
          sdp: answer,
        });
      }
    } catch (err: any) {
      console.error("Error accepting call:", err);
      transitionToIdle("failed", "Failed to connect call");
    }
  }, [createPeerConnection, transitionToIdle]);

  // 3. Callee rejects call
  const rejectCall = useCallback(
    (reason = "declined") => {
      const current = activeCallRef.current;
      tonePlayer.stop();

      if (current) {
        socketService.getSocket()?.emit("call:reject", {
          callId: current.callId,
          callerId: current.peer.id,
          reason,
        });
      }

      transitionToIdle("rejected", "Call declined", 500);
    },
    [transitionToIdle]
  );

  // 4. Either party ends active call
  const endCall = useCallback(() => {
    const current = activeCallRef.current;
    tonePlayer.playCallEnded();

    if (current) {
      socketService.getSocket()?.emit("call:end", {
        callId: current.callId,
        targetUserId: current.peer.id,
        reason: "ended_by_user",
      });
    }

    transitionToIdle("ended", "Call ended", 800);
  }, [transitionToIdle]);

  // 5. Toggle microphone mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const newEnabled = !audioTracks[0].enabled;
      audioTracks.forEach((t) => (t.enabled = newEnabled));
      setIsMuted(!newEnabled);
    }
  }, []);

  // Listen to incoming socket call signaling events
  useEffect(() => {
    const handleIncomingCall = (data: {
      callId: string;
      conversationId: string;
      caller: CallPeer;
    }) => {
      // If busy in another call, reject automatically
      if (callStateRef.current !== "idle") {
        socketService.getSocket()?.emit("call:reject", {
          callId: data.callId,
          callerId: data.caller.id,
          reason: "busy",
        });
        return;
      }

      setActiveCall({
        callId: data.callId,
        conversationId: data.conversationId,
        peer: data.caller,
        isCaller: false,
      });
      setCallState("ringing");
      tonePlayer.playIncomingRingtone();
    };

    const handleCallAccepted = async (data: { callId: string; recipientId: string }) => {
      tonePlayer.stop();
      setCallState("connecting");

      const pc = peerConnectionRef.current;
      const current = activeCallRef.current;
      if (!pc || !current) return;

      try {
        // Create WebRTC offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);

        socketService.getSocket()?.emit("call:offer", {
          callId: data.callId,
          recipientId: data.recipientId,
          sdp: offer,
        });
      } catch (err) {
        console.error("Error creating WebRTC offer:", err);
        transitionToIdle("failed", "Failed to establish media connection");
      }
    };

    const handleCallOffer = async (data: {
      callId: string;
      callerId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const pc = peerConnectionRef.current;
      if (!pc) {
        // Offer arrived before callee accepted getUserMedia; stash it
        pendingOfferRef.current = data.sdp;
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // Drain queued ICE candidates
        for (const candidate of pendingIceCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        pendingIceCandidatesRef.current = [];

        // Create answer and emit back to caller
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketService.getSocket()?.emit("call:answer", {
          callId: data.callId,
          callerId: data.callerId,
          sdp: answer,
        });
      } catch (err) {
        console.error("Error handling call offer:", err);
        transitionToIdle("failed", "Call connection error");
      }
    };

    const handleCallAnswer = async (data: {
      callId: string;
      recipientId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // Drain queued ICE candidates
        for (const candidate of pendingIceCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        pendingIceCandidatesRef.current = [];
      } catch (err) {
        console.error("Error handling call answer:", err);
        transitionToIdle("failed", "Connection setup failed");
      }
    };

    const handleIceCandidate = async (data: {
      callId: string;
      senderId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn("Failed to add ICE candidate:", err);
        }
      } else {
        pendingIceCandidatesRef.current.push(data.candidate);
      }
    };

    const handleCallRejected = (data: { callId: string; reason?: string }) => {
      tonePlayer.playCallEnded();
      const message =
        data.reason === "busy"
          ? "User is currently busy on another call"
          : "Call declined";
      transitionToIdle("rejected", message, 1500);
    };

    const handleCallEnded = (_data: { callId: string; reason?: string }) => {
      tonePlayer.playCallEnded();
      transitionToIdle("ended", "Call ended", 800);
    };

    socketService.on("call:incoming", handleIncomingCall);
    socketService.on("call:accepted", handleCallAccepted);
    socketService.on("call:offer", handleCallOffer);
    socketService.on("call:answer", handleCallAnswer);
    socketService.on("call:ice-candidate", handleIceCandidate);
    socketService.on("call:rejected", handleCallRejected);
    socketService.on("call:ended", handleCallEnded);

    return () => {
      socketService.off("call:incoming", handleIncomingCall);
      socketService.off("call:accepted", handleCallAccepted);
      socketService.off("call:offer", handleCallOffer);
      socketService.off("call:answer", handleCallAnswer);
      socketService.off("call:ice-candidate", handleIceCandidate);
      socketService.off("call:rejected", handleCallRejected);
      socketService.off("call:ended", handleCallEnded);
    };
  }, [transitionToIdle]);

  // Clean up on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeCallRef.current) {
        socketService.getSocket()?.emit("call:end", {
          callId: activeCallRef.current.callId,
          targetUserId: activeCallRef.current.peer.id,
          reason: "tab_closed",
        });
      }
      cleanupCall();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanupCall();
    };
  }, [cleanupCall]);

  return (
    <CallContext.Provider
      value={{
        callState,
        activeCall,
        callDuration,
        isMuted,
        errorMessage,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = (): CallContextType => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};
