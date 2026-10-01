import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, AlertCircle, Loader2 } from "lucide-react";

interface AudioMessageBubbleProps {
  mediaUrl: string;
  isSender: boolean;
  fileName?: string | null;
}

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return "0:00";
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
  const [hasError, setHasError] = useState<boolean>(false);

  // Compute universally compatible MP3 fallback for Cloudinary-hosted webm/ogg files
  const mp3Url =
    mediaUrl && mediaUrl.includes("res.cloudinary.com") && /\.(webm|ogg)($|\?)/i.test(mediaUrl)
      ? mediaUrl.replace(/\.(webm|ogg)($|\?)/i, ".mp3$2")
      : null;

  // Toggle play/pause
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      setHasError(false);
      audio.play().catch((err) => {
        console.warn("Failed to play audio:", err);
        setIsPlaying(false);
        setIsBuffering(false);
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

    setHasError(false);
    setIsBuffering(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const updateDuration = () => {
      const d = audio.duration;
      if (typeof d === "number" && isFinite(d) && d > 0) {
        setDuration(d);
        return true;
      }
      return false;
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (!isFinite(duration) || duration === 0) {
        if (isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        } else if (audio.currentTime > duration) {
          setDuration(audio.currentTime);
        }
      }
    };

    const onLoadedMetadata = () => {
      if (!updateDuration()) {
        // Chromium WebM duration workaround
        const onTempTimeUpdate = () => {
          updateDuration();
          audio.currentTime = 0;
          audio.removeEventListener("timeupdate", onTempTimeUpdate);
        };
        audio.addEventListener("timeupdate", onTempTimeUpdate);
        audio.currentTime = 1e101;
      }
    };

    const onDurationChange = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (duration === 0 && audio.currentTime > 0) {
        setDuration(audio.currentTime);
      }
    };

    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => {
      setIsBuffering(false);
      updateDuration();
    };
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const onPause = () => {
      setIsPlaying(false);
    };

    const onError = () => {
      // If MP3 transcode failed on Cloudinary, fallback to original mediaUrl
      if (mp3Url && audio.src === mp3Url && mediaUrl && mediaUrl !== mp3Url) {
        audio.src = mediaUrl;
        audio.load();
        return;
      }
      setIsBuffering(false);
      setIsPlaying(false);
      setHasError(true);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    // Initial load: prefer mp3Url for universal browser support, otherwise mediaUrl
    audio.src = mp3Url || mediaUrl;
    audio.load();

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
  }, [mediaUrl, mp3Url]);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 min-w-[210px] sm:min-w-[260px] py-1 select-none">
      {/* Audio element managed via ref */}
      <audio ref={audioRef} preload="metadata" />

      {hasError ? (
        <div className={`flex items-center gap-2 text-xs py-1 ${isSender ? "text-white/80" : "text-red-500"}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Audio could not be loaded</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlayPause}
            aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 cursor-pointer shadow-subtle ${
              isSender
                ? "bg-white text-emerald-900 hover:bg-white/95"
                : "bg-theme-accent text-white hover:bg-theme-accent-hover"
            }`}
          >
            {isBuffering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
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
              className={`relative h-1.5 rounded-full cursor-pointer overflow-hidden transition-all ${
                isSender ? "bg-white/25" : "bg-theme-border"
              }`}
            >
              {/* Progress filled bar */}
              <div
                className={`absolute top-0 left-0 bottom-0 rounded-full transition-all duration-75 ${
                  isSender
                    ? "bg-white"
                    : "bg-theme-accent"
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
      )}
    </div>
  );
};
