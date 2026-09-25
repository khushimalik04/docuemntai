"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PlaybackSpeed = 1 | 1.5 | 2;

/**
 * Simulates an audio/video player clock for a meeting of `durationSec`
 * length. There's no real media file, so this drives `currentTime`
 * forward on a 250ms timer, scaled by the chosen speed, and
 * stops at the end.
 */
export function usePlayer(durationSec: number) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  // Timestamp of the previous tick, so each tick advances by real elapsed time.
  const lastTickRef = useRef<number | null>(null);

  // While playing, advance the clock every 250ms. We measure elapsed time
  // instead of assuming 250ms because timers drift and background tabs throttle.
  useEffect(() => {
    if (!isPlaying) return;
    lastTickRef.current = performance.now();

    const id = window.setInterval(() => {
      const now = performance.now();
      const deltaSec = ((now - (lastTickRef.current ?? now)) / 1000) * speed;
      lastTickRef.current = now;
      setCurrentTime((prev) => Math.min(prev + deltaSec, durationSec));
    }, 250);

    return () => window.clearInterval(id);
  }, [isPlaying, speed, durationSec]);

  // Stop automatically when the clock reaches the end of the meeting.
  if (isPlaying && currentTime >= durationSec) {
    setIsPlaying(false);
  }

  const play = useCallback(() => {
    if (durationSec <= 0) return;
    setCurrentTime((t) => (t >= durationSec ? 0 : t));
    setIsPlaying(true);
  }, [durationSec]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const seek = useCallback(
    (seconds: number) => {
      const clamped = Math.min(Math.max(seconds, 0), durationSec);
      setCurrentTime(clamped);
    },
    [durationSec]
  );

  const skip = useCallback(
    (deltaSeconds: number) => {
      setCurrentTime((t) => Math.min(Math.max(t + deltaSeconds, 0), durationSec));
    },
    [durationSec]
  );

  return {
    currentTime,
    isPlaying,
    speed,
    setSpeed,
    play,
    pause,
    toggle,
    seek,
    skip,
  };
}
