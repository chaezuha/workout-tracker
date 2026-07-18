import { createContext, useContext, useCallback, useRef } from "react";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";
import { addSessionDuration } from "@/services/sessions";
import { enqueueWrite } from "@/services/writeQueue";
import { useAuth } from "@/contexts/AuthContext";

const WorkoutTimerContext = createContext(null);

// Owns the app's single useWorkoutTimer instance so the timer bar and the
// workout page share one record. Duration saves go through the shared write
// queue: a brand-new session's day-save is queued ahead of them, so stopping
// from any page can't credit time to a row that doesn't exist yet.
export function WorkoutTimerProvider({ children }) {
  const { user } = useAuth();
  const listenersRef = useRef(new Set());

  const onSaveDuration = useCallback((sessionId, dateKey, seconds) => {
    const write = enqueueWrite(() =>
      addSessionDuration(dateKey, sessionId, seconds),
    );
    // Notify optimistically (matching the write's local-first semantics) so
    // a mounted WorkoutPage can bump its in-memory durationSeconds.
    for (const fn of listenersRef.current) fn({ sessionId, dateKey, seconds });
    return write;
  }, []);

  const timer = useWorkoutTimer({ onSaveDuration, ownerId: user?.id ?? null });

  const subscribeDurationSaved = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  return (
    <WorkoutTimerContext.Provider value={{ ...timer, subscribeDurationSaved }}>
      {children}
    </WorkoutTimerContext.Provider>
  );
}

export function useGlobalWorkoutTimer() {
  const ctx = useContext(WorkoutTimerContext);
  if (!ctx) {
    throw new Error(
      "useGlobalWorkoutTimer must be used within a WorkoutTimerProvider",
    );
  }
  return ctx;
}
