import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  startTime?: number;
  endTime?: number;
  label?: string;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

export default function AudioPlayer({
  src,
  startTime,
  endTime,
  label,
  onTimeUpdate,
  className = '',
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if (typeof startTime === 'number') {
        audio.currentTime = startTime;
        setCurrentTime(startTime);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime);
      }

      // If segment end is reached, stop
      if (typeof endTime === 'number' && audio.currentTime >= endTime) {
        audio.pause();
        setIsPlaying(false);
        if (typeof startTime === 'number') {
          audio.currentTime = startTime;
          setCurrentTime(startTime);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (typeof startTime === 'number') {
        audio.currentTime = startTime;
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src, startTime, endTime, onTimeUpdate]);

  // When startTime changes, seek
  useEffect(() => {
    if (audioRef.current && typeof startTime === 'number') {
      audioRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  }, [startTime]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (typeof startTime === 'number' && (audio.currentTime < startTime || (endTime && audio.currentTime >= endTime))) {
        audio.currentTime = startTime;
      }
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = typeof startTime === 'number' ? startTime : 0;
      setCurrentTime(audioRef.current.currentTime);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) setIsMuted(true);
      else setIsMuted(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-transform active:scale-95"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Reset */}
      <button
        type="button"
        onClick={handleReset}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        title="Restart audio"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Progress slider and info */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        {label && (
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
            {label}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={typeof startTime === 'number' ? startTime : 0}
            max={typeof endTime === 'number' ? endTime : duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-12">
            {formatTime(typeof endTime === 'number' ? endTime : duration)}
          </span>
        </div>
      </div>

      {/* Volume control */}
      <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={toggleMute}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>
    </div>
  );
}
