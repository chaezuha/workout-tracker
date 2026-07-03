import { useState, useRef, useEffect, useCallback } from "react";
import {
  getWorkoutTimer,
  saveWorkoutTimer,
  clearWorkoutTimer,
} from "@/services/timer";
import { toDateKey } from "@/lib/dates";

function elapsedFrom(record) {
  if (!record) return 0;
  if (record.status === "paused") return record.accumulated;
  return record.accumulated + Math.floor((Date.now() - record.startedAt) / 1000);
}

// One timer for the whole app; the record names the session (and date) the
// elapsed time is credited to when stopped. onSaveDuration(sessionId,
// dateKey, seconds) is supplied by the page so persistence goes through its
// save queue.
export function useWorkoutTimer({ onSaveDuration }) {
  const [timer, setTimer] = useState(() => getWorkoutTimer());
  const [elapsed, setElapsed] = useState(() => elapsedFrom(timer));
  const [saveError, setSaveError] = useState("");
  const intervalRef = useRef(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const update = useCallback((record) => {
    if (record) {
      saveWorkoutTimer(record);
    } else {
      clearWorkoutTimer();
    }
    setTimer(record);
    setElapsed(elapsedFrom(record));
  }, []);

  const start = useCallback(
    (sessionId) => {
      setSaveError("");
      update({
        status: "running",
        startedAt: Date.now(),
        accumulated: 0,
        sessionId,
        dateKey: toDateKey(new Date()),
      });
    },
    [update],
  );

  const pause = useCallback(() => {
    if (timer?.status !== "running") return;
    update({
      status: "paused",
      accumulated: elapsedFrom(timer),
      sessionId: timer.sessionId,
      dateKey: timer.dateKey,
    });
  }, [timer, update]);

  const resume = useCallback(() => {
    if (timer?.status !== "paused") return;
    update({
      status: "running",
      startedAt: Date.now(),
      accumulated: timer.accumulated,
      sessionId: timer.sessionId,
      dateKey: timer.dateKey,
    });
  }, [timer, update]);

  const stop = useCallback(async () => {
    if (!timer) return;
    const duration = elapsedFrom(timer);
    const { sessionId, dateKey } = timer;
    update(null);
    try {
      await onSaveDuration(sessionId, dateKey ?? toDateKey(new Date()), duration);
      setSaveError("");
    } catch {
      setSaveError("Could not save your session time.");
    }
  }, [timer, update, onSaveDuration]);

  // Clears the timer without crediting the time anywhere (e.g. when the
  // session it belongs to is deleted).
  const discard = useCallback(() => {
    update(null);
  }, [update]);

  // Stamps a session onto a record saved before timers were per-session.
  // Reads storage directly so the callback stays stable across renders.
  const adoptSession = useCallback(
    (sessionId) => {
      const record = getWorkoutTimer();
      if (!record || record.sessionId) return;
      update({
        ...record,
        sessionId,
        dateKey: record.dateKey ?? toDateKey(new Date()),
      });
    },
    [update],
  );

  useEffect(() => {
    if (timer?.status !== "running") return;

    const tick = () => {
      setElapsed(elapsedFrom(timer));
    };

    intervalRef.current = setInterval(tick, 1000);
    tick();

    return clear;
  }, [timer, clear]);

  return {
    elapsed,
    status: timer?.status ?? "idle",
    activeSessionId: timer?.sessionId ?? null,
    saveError,
    start,
    pause,
    resume,
    stop,
    discard,
    adoptSession,
  };
}
