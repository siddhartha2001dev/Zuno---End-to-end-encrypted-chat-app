/**
 * WebRTC configuration and Web Audio tone synthesizer utilities.
 */

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];

  const turnServer = import.meta.env.VITE_TURN_SERVER;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnServer) {
    servers.push({
      urls: turnServer.split(",").map((s: string) => s.trim()),
      ...(turnUsername ? { username: turnUsername } : {}),
      ...(turnCredential ? { credential: turnCredential } : {}),
    });
  }

  return servers;
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (err) {
        console.warn("Failed to stop track:", err);
      }
    });
  } catch (err) {
    console.warn("Failed to get tracks from stream:", err);
  }
}

/**
 * Clean Web Audio Tone Synthesizer for Ringtone, Ringback, and Call End
 */
class TonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private isPlaying = false;

  private getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playIncomingRingtone(): void {
    this.stop();
    this.isPlaying = true;

    const playChime = () => {
      if (!this.isPlaying) return;
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        // Two-tone melodic chime (chord 523Hz (C5) and 659Hz (E5))
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, now + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.35);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.8);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.8);
      } catch {
        // audio context might be blocked if no user gesture
      }
    };

    playChime();
    this.intervalId = setInterval(playChime, 2000);
  }

  playOutgoingRingback(): void {
    this.stop();
    this.isPlaying = true;

    const playTone = () => {
      if (!this.isPlaying) return;
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now); // standard 440Hz A4 tone

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.06, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.0);
      } catch {
        // audio context could be blocked
      }
    };

    playTone();
    this.intervalId = setInterval(playTone, 2500);
  }

  playCallEnded(): void {
    this.stop();
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.25);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // AudioContext could fail gracefully
    }
  }

  stop(): void {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const tonePlayer = new TonePlayer();
