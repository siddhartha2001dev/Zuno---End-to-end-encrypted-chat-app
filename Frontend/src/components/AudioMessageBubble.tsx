import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface AudioMessageBubbleProps {
  mediaUrl: string;
  isSender: boolean;
  fileName?: string | null;
}

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const AudioMessageBubble: React.FC<AudioMessageBubbleProps> = ({
  mediaUrl,
  isSender,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // Toggle play/pause
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn("Failed to play audio:", err);
      });
    }
  };

  // Toggle playback speed 1x -> 1.5x -> 2x -> 1x
  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  // Seek on click on progress bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Listeners on audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.pause();
    };
  }, [mediaUrl]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5 min-w-[210px] sm:min-w-[260px] py-1 select-none">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={mediaUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlayPause}
          disabled={isBuffering}
          aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 cursor-pointer shadow-md ${
            isSender
              ? "bg-white text-emerald-600 hover:bg-emerald-50"
              : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500"
          }`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Audio Waveform / Seeker */}
        <div className="flex-1 flex flex-col justify-center gap-1.5">
          {/* Clickable Progress track */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className={`relative h-2 rounded-full cursor-pointer overflow-hidden transition-all group/bar ${
              isSender ? "bg-white/30" : "bg-theme-border dark:bg-theme-border/60"
            }`}
          >
            {/* Progress filled bar */}
            <div
              className={`absolute top-0 left-0 bottom-0 rounded-full transition-all duration-75 ${
                isSender
                  ? "bg-white"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Time & Speed Controls */}
          <div
            className={`flex items-center justify-between text-[11px] font-mono leading-none ${
              isSender ? "text-white/90" : "text-theme-text-secondary"
            }`}
          >
            <span>
              {isPlaying || currentTime > 0
                ? formatAudioTime(currentTime)
                : formatAudioTime(duration)}
            </span>

            {/* Speed toggle */}
            <button
              type="button"
              onClick={cyclePlaybackRate}
              title="Playback speed"
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-colors cursor-pointer ${
                isSender
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-theme-bg hover:bg-theme-surface text-theme-text-muted hover:text-theme-text border border-theme-border"
              }`}
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
