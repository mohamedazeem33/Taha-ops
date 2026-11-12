import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AUDIO_TRACKS, PLACEHOLDER_TRACK, type AudioTrack } from '@/lib/audioTracks';

const STORAGE_KEY_ENABLED = 'teamboard_audio_enabled';
const STORAGE_KEY_VOLUME = 'teamboard_audio_volume';
const DEFAULT_VOLUME = 0.2; // 20%
const FADE_DURATION_MS = 1000;
const FADE_INTERVAL_MS = 50;

function getSavedEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
  } catch {
    return false;
  }
}

function setSavedEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
  } catch {}
}

function getSavedVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (raw !== null) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val >= 0 && val <= 1) {
        return val;
      }
    }
  } catch {}
  return DEFAULT_VOLUME;
}

function setSavedVolume(volume: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
  } catch {}
}

function shuffleIndices(count: number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface AudioContextValue {
  isPlaying: boolean;
  isBlocked: boolean;
  hasError: boolean;
  volume: number;
  currentTrack: AudioTrack;
  popoverOpen: boolean;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
  setPopoverOpen: (open: boolean) => void;
  nextTrack: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();

  const tracks = AUDIO_TRACKS.length > 0 ? AUDIO_TRACKS : [PLACEHOLDER_TRACK];

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [volume, setVolumeState] = useState<number>(getSavedVolume);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Shuffled playlist tracking
  const shuffleOrderRef = useRef<number[]>(shuffleIndices(tracks.length));
  const playlistIndexRef = useRef<number>(0);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(
    tracks[shuffleOrderRef.current[0]] ?? PLACEHOLDER_TRACK
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const volumeRef = useRef<number>(volume);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isBlockedRef = useRef<boolean>(isBlocked);
  const failedTrackPathsRef = useRef<Set<string>>(new Set());

  // Keep refs in sync
  volumeRef.current = volume;
  isPlayingRef.current = isPlaying;
  isBlockedRef.current = isBlocked;

  const clearFadeTimer = () => {
    if (fadeTimerRef.current !== null) {
      window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  };

  const fadeIn = (audio: HTMLAudioElement, targetVolume: number) => {
    clearFadeTimer();
    audio.volume = 0;
    const steps = FADE_DURATION_MS / FADE_INTERVAL_MS;
    const stepIncrement = targetVolume / steps;

    fadeTimerRef.current = window.setInterval(() => {
      if (!audio) {
        clearFadeTimer();
        return;
      }
      const next = audio.volume + stepIncrement;
      if (next >= targetVolume) {
        audio.volume = targetVolume;
        clearFadeTimer();
      } else {
        audio.volume = next;
      }
    }, FADE_INTERVAL_MS);
  };

  const fadeOut = (audio: HTMLAudioElement, onComplete: () => void) => {
    clearFadeTimer();
    const startVol = audio.volume;
    if (startVol <= 0.01) {
      audio.pause();
      clearFadeTimer();
      onComplete();
      return;
    }
    const steps = FADE_DURATION_MS / FADE_INTERVAL_MS;
    const stepDecrement = startVol / steps;

    fadeTimerRef.current = window.setInterval(() => {
      if (!audio) {
        clearFadeTimer();
        onComplete();
        return;
      }
      const next = audio.volume - stepDecrement;
      if (next <= 0.01) {
        audio.volume = 0;
        audio.pause();
        clearFadeTimer();
        onComplete();
      } else {
        audio.volume = next;
      }
    }, FADE_INTERVAL_MS);
  };

  const handleTrackError = () => {
    const audio = audioRef.current;
    const failingPath = currentTrack?.path || audio?.src || 'unknown';
    const errorCode = audio?.error?.code ?? 'UNKNOWN';

    // 3. Log the failing file path and the error code with console.warn
    console.warn(
      `Audio playback failed for path: ${failingPath} (error code: ${errorCode})`
    );

    failedTrackPathsRef.current.add(failingPath);

    // 2. If the only track fails to load, or all tracks fail, do not retry in a loop.
    // Stop, keep the speaker button in the off state, and show a small tooltip "Audio file could not be played".
    if (failedTrackPathsRef.current.size >= tracks.length || tracks.length <= 1) {
      clearFadeTimer();
      if (audio) {
        audio.pause();
      }
      setIsPlaying(false);
      setIsBlocked(false);
      setPopoverOpen(false);
      setHasError(true);
      setSavedEnabled(false);
      return;
    }

    // If there are other tracks that haven't failed yet, try the next one
    handleNextTrack();
  };

  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const track = currentTrack;
    if (!track || !track.path) {
      handleTrackError();
      return;
    }

    setIsBlocked(false);
    setHasError(false);
    setSavedEnabled(true);

    if (
      !audio.src ||
      (!audio.src.includes(encodeURI(track.path)) &&
        !audio.src.includes(track.path))
    ) {
      audio.src = track.path;
      audio.load();
    }

    try {
      audio.volume = 0;
      await audio.play();
      setIsPlaying(true);
      failedTrackPathsRef.current.clear();
      fadeIn(audio, volumeRef.current);
      setPopoverOpen(true);
    } catch (err: unknown) {
      const domErr = err as DOMException;
      if (domErr?.name === 'NotAllowedError') {
        // Browser blocked autoplay
        setIsBlocked(true);
        setIsPlaying(false);
      } else {
        handleTrackError();
      }
    }
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    setSavedEnabled(false);
    setIsBlocked(false);
    setPopoverOpen(false);

    if (!audio || audio.paused) {
      setIsPlaying(false);
      return;
    }

    fadeOut(audio, () => {
      setIsPlaying(false);
      if (audio) {
        audio.volume = volumeRef.current;
      }
    });
  };

  const togglePlay = () => {
    if (hasError) {
      setHasError(false);
      failedTrackPathsRef.current.clear();
      void playAudio();
      return;
    }
    if (isBlocked) {
      // Resuming from autoplay block
      void playAudio();
      return;
    }
    if (isPlaying) {
      stopAudio();
    } else {
      failedTrackPathsRef.current.clear();
      void playAudio();
    }
  };

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    let nextIndex = playlistIndexRef.current + 1;
    let order = shuffleOrderRef.current;

    if (nextIndex >= order.length) {
      // Shuffled playlist finished, re-shuffle and loop forever
      order = shuffleIndices(tracks.length);
      shuffleOrderRef.current = order;
      nextIndex = 0;
    }
    playlistIndexRef.current = nextIndex;
    const nextItem = tracks[order[nextIndex]];
    setCurrentTrack(nextItem);

    const audio = audioRef.current;
    if (audio && nextItem && nextItem.path) {
      audio.src = nextItem.path;
      audio.load();
      if (isPlayingRef.current) {
        audio.volume = volumeRef.current;
        audio.play().catch(() => {
          handleTrackError();
        });
      }
    }
  };

  const setVolume = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    setSavedVolume(clamped);

    const audio = audioRef.current;
    if (audio && isPlayingRef.current && fadeTimerRef.current === null) {
      audio.volume = clamped;
    }
  };

  // On initial mount: if saved state is "on", attempt playback
  useEffect(() => {
    const savedEnabled = getSavedEnabled();
    if (savedEnabled) {
      const audio = audioRef.current;
      if (audio) {
        const track = currentTrack;
        if (track && track.path) {
          audio.src = track.path;
          audio.load();
          audio.volume = 0;
          audio
            .play()
            .then(() => {
              setIsPlaying(true);
              failedTrackPathsRef.current.clear();
              fadeIn(audio, volumeRef.current);
            })
            .catch((err: unknown) => {
              const domErr = err as DOMException;
              if (domErr?.name === 'NotAllowedError') {
                // Autoplay policy blocked audio
                setIsBlocked(true);
                setIsPlaying(false);
              } else {
                handleTrackError();
              }
            });
        }
      }
    }
  }, []);

  // When blocked, listen for first user interaction anywhere in the window
  useEffect(() => {
    if (!isBlocked) return;

    const handleFirstTap = () => {
      if (isBlockedRef.current) {
        void playAudio();
      }
    };

    window.addEventListener('click', handleFirstTap, { once: true });
    window.addEventListener('keydown', handleFirstTap, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstTap);
      window.removeEventListener('keydown', handleFirstTap);
    };
  }, [isBlocked]);

  // Auto-dismiss error tooltip after 6 seconds so it doesn't linger indefinitely
  useEffect(() => {
    if (!hasError) return;
    const timer = window.setTimeout(() => {
      setHasError(false);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [hasError]);

  // Pause automatically on sign out
  useEffect(() => {
    if (!account) {
      clearFadeTimer();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
      }
      setIsPlaying(false);
      setIsBlocked(false);
      setHasError(false);
      setPopoverOpen(false);
    }
  }, [account]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFadeTimer();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
      }
    };
  }, []);

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        isBlocked,
        hasError,
        volume,
        currentTrack,
        popoverOpen,
        togglePlay,
        setVolume,
        setPopoverOpen,
        nextTrack: handleNextTrack,
      }}
    >
      <audio
        ref={audioRef}
        preload="metadata"
        onEnded={handleNextTrack}
        onError={handleTrackError}
      />
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return ctx;
}
