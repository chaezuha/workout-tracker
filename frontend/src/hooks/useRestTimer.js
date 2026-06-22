import { useState, useRef, useEffect, useCallback } from "react";
import {
  playBeep,
  showNotification,
  requestNotificationPermission,
} from "@/lib/notify";
import { getRestTimer, saveRestTimer, clearRestTimer } from "@/services/timer";

export function useRestTimer() {
  const [endsAt, setEndsAt] = useState(() => {
    const saved = getRestTimer()?.endsAt ?? null;
    return saved && saved > Date.now() ? saved : null;
  });
  const [remaining, setRemaining] = useState(() => {
    const saved = getRestTimer()?.endsAt ?? null;
    return saved && saved > Date.now()
      ? Math.ceil((saved - Date.now()) / 1000)
      : 0;
  });
  const intervalRef = useRef(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((seconds) => {
    if (!seconds || seconds <= 0) return;
    requestNotificationPermission();
    const end = Date.now() + seconds * 1000;
    saveRestTimer(end);
    setEndsAt(end);
    setRemaining(seconds);
  }, []);

  const cancel = useCallback(() => {
    clear();
    clearRestTimer();
    setEndsAt(null);
    setRemaining(0);
  }, [clear]);

  useEffect(() => {
    if (endsAt === null) return;

    const tick = () => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      if (left <= 0) {
        clear();
        clearRestTimer();
        setRemaining(0);
        setEndsAt(null);
        playBeep();
        showNotification("Rest over", "Time for your next set");
      } else {
        setRemaining(left);
      }
    };

    intervalRef.current = setInterval(tick, 250);
    tick();

    return clear;
  }, [endsAt, clear]);

  return { remaining, isRunning: endsAt !== null, start, cancel };
}
