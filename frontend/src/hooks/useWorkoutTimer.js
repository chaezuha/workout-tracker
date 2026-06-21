import { useState, useRef, useEffect, useCallback } from "react";
import {
  getWorkoutTimer,
  saveWorkoutTimer,
  clearWorkoutTimer,
} from "@/services/timer";

export function useWorkoutTimer() {
  const [startedAt, setStartedAt] = useState(() => getWorkoutTimer()?.startedAt ?? null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    const now = Date.now();
    saveWorkoutTimer(now);
    setStartedAt(now);
  }, []);

  const stop = useCallback(() => {
    clearWorkoutTimer();
    clear();
    setStartedAt(null);
    setElapsed(0);
  }, [clear]);

  useEffect(() => {
    if (startedAt === null) return;

    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    };

    intervalRef.current = setInterval(tick, 1000);
    tick();

    return clear;
  }, [startedAt, clear]);

  return { elapsed, isRunning: startedAt !== null, start, stop };
}
