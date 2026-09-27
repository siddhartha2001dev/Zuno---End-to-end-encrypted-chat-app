export type CallState =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "rejected"
  | "ended"
  | "failed";

export interface CallPeer {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface ActiveCall {
  callId: string;
  conversationId: string;
  peer: CallPeer;
  isCaller: boolean;
  startedAt?: Date;
}

export interface CallContextType {
  callState: CallState;
  activeCall: ActiveCall | null;
  callDuration: number;
  isMuted: boolean;
  errorMessage: string | null;
  startCall: (conversationId: string, recipient: CallPeer) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
}
