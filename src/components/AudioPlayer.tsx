import { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Volume1, X } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

export function AudioPlayer() {
  const {
    isPlaying,
    isBlocked,
    hasError,
    volume,
    currentTrack,
    popoverOpen,
    togglePlay,
    setVolume,
    setPopoverOpen,
  } = useAudio();

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close popover on click outside or Escape key
  useEffect(() => {
    if (!popoverOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [popoverOpen, setPopoverOpen]);

  const buttonAriaLabel = hasError
    ? 'Audio file could not be played'
    : isBlocked
    ? 'Tap to resume background nasheed'
    : isPlaying
    ? 'Stop background nasheed'
    : 'Play background nasheed';

  const buttonTitle = hasError
    ? 'Audio file could not be played'
    : isBlocked
    ? 'Tap to resume'
    : isPlaying
    ? 'Stop background nasheed'
    : 'Play background nasheed';

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* Speaker toggle button styled like ThemeToggle */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={buttonAriaLabel}
        aria-pressed={isPlaying}
        title={buttonTitle}
        className={`relative flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-xl border p-2 transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d79] ${
          hasError
            ? 'border-white/60 bg-white/80 text-slate-700 hover:border-rose-400 hover:text-rose-500 dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-rose-400'
            : isBlocked
            ? 'border-amber-400 bg-amber-500/10 text-amber-500 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300'
            : isPlaying
            ? 'border-[#ff4d79]/50 bg-[#ff4d79]/10 text-[#ff4d79] shadow-sm shadow-[#ff4d79]/20 dark:border-[#ff9040]/40 dark:bg-[#ff9040]/10 dark:text-[#ff9040]'
            : 'border-white/60 bg-white/80 text-slate-700 hover:text-[#ff4d79] dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-[#ff9040]'
        }`}
      >
        {isBlocked ? (
          <>
            <Volume1 className="h-4 w-4" aria-hidden="true" />
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse"
              aria-hidden="true"
            />
          </>
        ) : isPlaying ? (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {/* When audio is active, show small volume percentage pill that opens popover */}
      {isPlaying && (
        <button
          type="button"
          onClick={() => setPopoverOpen(!popoverOpen)}
          aria-label="Adjust background nasheed volume"
          title="Adjust volume"
          className="ml-1 cursor-pointer rounded-lg border border-white/40 bg-white/60 px-1.5 py-1 text-[11px] font-semibold text-slate-700 transition-all hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d79] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {Math.round(volume * 100)}%
        </button>
      )}

      {/* Tooltip badge when audio file failed to load */}
      {hasError && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-rose-400/40 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800 shadow-md backdrop-blur-sm dark:border-rose-400/20 dark:bg-[#1a0808] dark:text-rose-200"
        >
          Audio file could not be played
        </div>
      )}

      {/* Tooltip badge when autoplay is blocked */}
      {!hasError && isBlocked && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-amber-400/40 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-md backdrop-blur-sm dark:border-amber-400/20 dark:bg-[#1a1408] dark:text-amber-200"
        >
          Tap to resume
        </div>
      )}

      {/* Volume & Track Popover */}
      {popoverOpen && (
        <div
          role="dialog"
          aria-label="Background audio controls"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/60 bg-white/95 p-3.5 shadow-xl backdrop-blur-xl sm:w-72 dark:border-white/15 dark:bg-[#100e28]/95 dark:shadow-black/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-[#ff4d79] dark:text-[#ff9040]" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Background Nasheed
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              aria-label="Close background audio controls"
              className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d79] dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Current track title */}
          <div className="mt-2.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Now playing
            </span>
            <p
              className="mt-0.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-100"
              title={currentTrack?.title}
            >
              {currentTrack?.title || 'Relaxing recitation'}
            </p>
          </div>

          {/* Volume slider (default 20%, range 0 to 100%) */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Volume</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label="Background audio volume"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#ff4d79] dark:bg-slate-700 dark:accent-[#ff9040]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
