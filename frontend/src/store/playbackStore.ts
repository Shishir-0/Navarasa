import { create } from "zustand";

interface PlaybackState {
  isPlaying: boolean;
  isReplayMode: boolean;
  playbackSpeed: number; // 0.5x, 1x, 2x, 4x
  scrubberIndex: number;
  
  // Actions
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setReplayMode: (replay: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setScrubberIndex: (index: number) => void;
  stepForward: (maxIndex: number) => void;
  stepBackward: () => void;
  seek: (frameId: number) => void;
  resetReplay: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: true,
  isReplayMode: false,
  playbackSpeed: 1.0,
  scrubberIndex: 0,

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setReplayMode: (replay) => set({ isReplayMode: replay }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setScrubberIndex: (index) => set({ scrubberIndex: index }),
  stepForward: (maxIndex) =>
    set((s) => ({
      scrubberIndex: Math.min(maxIndex, s.scrubberIndex + 1),
    })),
  stepBackward: () =>
    set((s) => ({
      scrubberIndex: Math.max(0, s.scrubberIndex - 1),
    })),
  seek: (frameId) =>
    set(() => ({
      scrubberIndex: frameId,
      isReplayMode: true,
    })),
  resetReplay: () =>
    set(() => ({
      scrubberIndex: 0,
      isReplayMode: false,
      isPlaying: true,
    })),
}));
