import { useState, useRef, useEffect, useCallback } from "react";
import {
  getWorkoutTimer,
  saveWorkoutTimer,
  clearWorkoutTimer,
  WORKOUT_TIMER_STORAGE_KEY,
} from "@/services/timer";
import { toDateKey } from "@/lib/dates";

function elapsedFrom(record) {
  if (!record) return 0;
  if (record.status === "paused") return record.accumulated;
  return record.accumulated + Math.floor((Date.now() - record.startedAt) / 1000);
}

// A record started under another identity is invisible to this one; records
// from before ownerId existed belong to whoever reads them.
function ownedRecord(ownerId) {
  const record = getWorkoutTimer();
  if (!record) return null;
  if (record.ownerId && ownerId && record.ownerId !== ownerId) return null;
  return record;
}

// One timer for the whole app; the record names the session (and date) the
// elapsed time is credited to when stopped. Instantiate exactly once — via
// WorkoutTimerProvider — since each instance holds its own copy of the
// record. onSaveDuration(sessionId, dateKey, seconds) persists the stop.
export function useWorkoutTimer({ onSaveDuration, ownerId = null }) {
  const [timer, setTimer] = useState(() => ownedRecord(ownerId));
  const [elapsed, setElapsed] = useState(() => elapsedFrom(timer));
  const [saveError, setSaveError] = useState("");
  const intervalRef = useRef(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const update = useCallback(
    (record) => {
      if (record) {
        saveWorkoutTimer({ ...record, ownerId: record.ownerId ?? ownerId ?? undefined });
      } else {
        clearWorkoutTimer();
      }
      setTimer(record);
      setElapsed(elapsedFrom(record));
    },
    [ownerId],
  );

  const start = useCallback(
    (sessionId, sessionName = null) => {
      setSaveError("");
      update({
        status: "running",
        startedAt: Date.now(),
        accumulated: 0,
        sessionId,
        sessionName,
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
      sessionName: timer.sessionName ?? null,
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
      sessionName: timer.sessionName ?? null,
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
      const record = ownedRecord(ownerId);
      if (!record || record.sessionId) return;
      update({
        ...record,
        sessionId,
        dateKey: record.dateKey ?? toDateKey(new Date()),
      });
    },
    [ownerId, update],
  );

  // Identity changes (sign-out, account switch): re-derive the visible record
  // during render so another identity's timer never flashes; ownerless legacy
  // records are adopted as-is.
  const [syncedOwnerId, setSyncedOwnerId] = useState(ownerId);
  if (ownerId !== syncedOwnerId) {
    setSyncedOwnerId(ownerId);
    const record = ownerId ? ownedRecord(ownerId) : timer;
    setTimer(record);
    setElapsed(elapsedFrom(record));
  }

  // Another identity's record is discarded rather than left to resurface
  // whenever its owner returns.
  useEffect(() => {
    if (!ownerId) return;
    const record = getWorkoutTimer();
    if (record?.ownerId && record.ownerId !== ownerId) {
      clearWorkoutTimer();
    }
  }, [ownerId]);

  // Cross-tab sync: another tab starting/stopping the timer updates this
  // one, so two tabs can't both stop and credit the same record.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== null && e.key !== WORKOUT_TIMER_STORAGE_KEY) return;
      const record = ownedRecord(ownerId);
      setTimer(record);
      setElapsed(elapsedFrom(record));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [ownerId]);

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
    dateKey: timer?.dateKey ?? null,
    sessionName: timer?.sessionName ?? null,
    saveError,
    start,
    pause,
    resume,
    stop,
    discard,
    adoptSession,
  };
}
