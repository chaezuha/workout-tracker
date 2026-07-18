import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveStatus } from "@/components/SaveStatus/SaveStatus";
import { SessionCard } from "@/components/SessionCard/SessionCard";
import { DateNav } from "@/components/DateNav/DateNav";
import { RestTimer } from "@/components/RestTimer/RestTimer";
import { SavedWorkouts } from "@/components/SavedWorkouts/SavedWorkouts";
import { AddExerciseDialog } from "@/components/AddExerciseDialog/AddExerciseDialog";
import { toDateKey } from "@/lib/dates";
import { getDayForDate, saveDayForDate } from "@/services/workouts";
import { normalizeExercise } from "@/services/setEntries";
import { getAllStatsRows } from "@/services/stats";
import { buildPrBaselines, detectPrs, recordResult } from "@/services/prs";
import { buildLastResults } from "@/services/progression";
import { getWorkoutTimer } from "@/services/timer";
import { enqueueWrite } from "@/services/writeQueue";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalWorkoutTimer } from "@/contexts/WorkoutTimerContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";

// Every exercise entering state carries canonical setEntries (new, template,
// and legacy-shaped data alike) — the UI never sees a legacy-only shape.
const makeExercise = (data) =>
  normalizeExercise({
    id: crypto.randomUUID(),
    completedReps: [],
    ...data,
  });

const makeSession = (exercises = []) => ({
  id: crypto.randomUUID(),
  name: null,
  position: 0,
  durationSeconds: 0,
  createdAt: new Date().toISOString(),
  exercises,
});

export const WorkoutPage = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateKey = toDateKey(selectedDate);
  const isToday = dateKey === toDateKey(new Date());

  const { user, isGuest } = useAuth();
  const { pending, online } = useSyncStatus();
  // In-flight local saves for the status line; the outbox `pending` count
  // covers the slower half (reaching Supabase).
  const [saving, setSaving] = useState(0);
  // Loading a day must not immediately save it back: the no-op write would
  // flash "Saving…" (and enqueue a pointless sync op) from merely viewing a
  // date. Set per load, consumed by the autosave effect's first run.
  const skipNextSaveRef = useRef(false);

  // State (not a ref) so the UI can hide the previous day's sessions while
  // the selected day loads — otherwise the stale list stays interactive and
  // any edit made mid-load is discarded by the incoming setSessions.
  const [loadedDate, setLoadedDate] = useState(null);
  const dayLoaded = loadedDate === dateKey;

  // The timer lives app-wide (WorkoutTimerProvider) so it stays controllable
  // from every page; its duration saves already run through the shared write
  // queue. Day-saves never write durations, so the optimistic state bump
  // below can't be clobbered.
  const timer = useGlobalWorkoutTimer();
  const { adoptSession, subscribeDurationSaved } = timer; // stable

  useEffect(() => {
    return subscribeDurationSaved(({ sessionId, dateKey: savedKey, seconds }) => {
      if (savedKey !== dateKey) return;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, durationSeconds: s.durationSeconds + seconds }
            : s,
        ),
      );
    });
  }, [dateKey, subscribeDurationSaved]);

  // One history fetch per viewed day (historyRef) feeds both the PR
  // baselines and the "last time" hints. Baselines are then mutated: today's
  // pre-edit results and every detected PR fold in via recordResult, so a
  // reopened dialog can't re-celebrate but a second heavier set can.
  const historyRef = useRef(null);
  const baselinesRef = useRef(null);
  // Tagged with the day they were built for; a mismatch (mid date-change)
  // renders as "no hints" without needing a synchronous reset.
  const [lastResults, setLastResults] = useState(null);
  const lastResultsForDay =
    lastResults?.dateKey === dateKey ? lastResults.map : null;
  const [celebratingId, setCelebratingId] = useState(null);
  const celebrateTimeoutRef = useRef(null);

  const checkForPrs = async (exercise, prevSessions) => {
    try {
      historyRef.current ??= getAllStatsRows();
      baselinesRef.current ??= historyRef.current.then((rows) =>
        buildPrBaselines(rows, dateKey),
      );
      const baselines = await baselinesRef.current;
      for (const s of prevSessions) {
        for (const e of s.exercises) recordResult(baselines, e);
      }
      const prs = detectPrs(exercise, baselines);
      recordResult(baselines, exercise);
      if (!prs.length) return;
      const parts = prs.map((pr) =>
        pr.type === "weight"
          ? `${pr.value} lb (was ${pr.previous})`
          : `est. 1RM ${Math.round(pr.value)} lb (was ${Math.round(pr.previous)})`,
      );
      toast.success(`New ${exercise.name} PR — ${parts.join(", ")}`);
      setCelebratingId(exercise.id);
      clearTimeout(celebrateTimeoutRef.current);
      celebrateTimeoutRef.current = setTimeout(
        () => setCelebratingId(null),
        1500,
      );
    } catch {
      // Best-effort: a failed history fetch should never block logging reps.
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // History (and everything derived from it) is relative to the viewed
    // day. The fetch starts eagerly so "last time" hints arrive with the
    // day instead of waiting for the first PR check.
    baselinesRef.current = null;
    historyRef.current = getAllStatsRows();
    historyRef.current
      .then((rows) => {
        if (!cancelled) {
          setLastResults({ dateKey, map: buildLastResults(rows, dateKey) });
        }
      })
      .catch(() => {
        // hints are best-effort; a failed fetch must never block the day
      });
    getDayForDate(dateKey).then((items) => {
      if (cancelled) return;
      let day = items;
      // A timer record saved before timers were per-session has no sessionId;
      // credit it to today's first session (creating Session 1 if the day is
      // empty).
      const record = getWorkoutTimer();
      if (record && !record.sessionId && dateKey === toDateKey(new Date())) {
        if (!day.length) day = [makeSession()];
        adoptSession(day[0].id);
      }
      // Only skip the initial autosave when the day is exactly what storage
      // returned; a session synthesized for adoption above must be saved so
      // its row exists before the timer credits time to it.
      skipNextSaveRef.current = day === items;
      setSessions(day);
      setLoadedDate(dateKey);
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey, user, adoptSession]);

  useEffect(() => {
    if (!user) return;
    if (loadedDate !== dateKey) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    setSaving((c) => c + 1);
    enqueueWrite(() => saveDayForDate(dateKey, sessions))
      .catch((err) => console.error("Failed to save workout", err))
      .finally(() => setSaving((c) => c - 1));
  }, [sessions, dateKey, user, loadedDate]);

  const addExercise = (sessionId, data) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, exercises: s.exercises.concat(makeExercise(data)) }
          : s,
      ),
    );
  };

  const addFirstExercise = (data) => {
    setSessions((prev) =>
      prev.length ? prev : [makeSession([makeExercise(data)])],
    );
  };

  const addNewSession = () => {
    setSessions((prev) => prev.concat(makeSession()));
  };

  const renameSession = (sessionId, name) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, name } : s)),
    );
  };

  const deleteSession = (sessionId) => {
    if (timer.activeSessionId === sessionId) {
      timer.discard();
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const loadTemplateIntoDay = (templateExercises) => {
    const added = templateExercises.map((e) =>
      makeExercise({
        name: e.name,
        weight: e.weight ?? "",
        sets: e.sets,
        reps: e.reps,
        notes: e.notes ?? "",
      }),
    );
    // Templates land in the day's last session (creating Session 1 if empty).
    setSessions((prev) => {
      if (!prev.length) return [makeSession(added)];
      return prev.map((s, i) =>
        i === prev.length - 1
          ? { ...s, exercises: s.exercises.concat(added) }
          : s,
      );
    });
  };

  const editExercise = (sessionId, exerciseId, data) => {
    // Set logs and weight edits can both change the logged result (a weight
    // bump after logging reps is still a new best); other edits can't.
    if (
      data.setEntries !== undefined ||
      data.completedReps !== undefined ||
      data.weight !== undefined
    ) {
      const prev = sessions
        .find((s) => s.id === sessionId)
        ?.exercises.find((e) => e.id === exerciseId);
      if (prev) checkForPrs({ ...prev, ...data }, sessions);
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              exercises: s.exercises.map((e) =>
                e.id === exerciseId ? { ...e, ...data } : e,
              ),
            }
          : s,
      ),
    );
  };

  const deleteExercise = (sessionId, exerciseId) => {
    const session = sessions.find((s) => s.id === sessionId);
    const target = session?.exercises.find((e) => e.id === exerciseId);
    if (!target) return;

    if (window.confirm(`Delete ${target.name}?`)) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
            : s,
        ),
      );
    }
  };

  const handleDragEnd = (sessionId, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const originalPos = s.exercises.findIndex((e) => e.id === active.id);
        const newPos = s.exercises.findIndex((e) => e.id === over.id);
        return { ...s, exercises: arrayMove(s.exercises, originalPos, newPos) };
      }),
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <DateNav selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <RestTimer />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-medium">Sessions</h2>
            <SaveStatus
              saving={saving}
              pending={pending}
              online={online}
              isGuest={isGuest}
            />
          </div>
          {dayLoaded && (
            <SavedWorkouts
              dayExercises={sessions.flatMap((s) => s.exercises)}
              onLoadTemplate={loadTemplateIntoDay}
            />
          )}
        </div>
        {timer.saveError && (
          <p className="text-sm text-destructive">{timer.saveError}</p>
        )}
        {!dayLoaded ? (
          // Placeholder session cards; the real list stays hidden (and thus
          // non-interactive) until the selected day's data is in.
          <div className="space-y-4" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="space-y-4 rounded-xl border p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <>
            <AnimatePresence initial={false}>
              {sessions.map((session, index) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  index={index}
                  isToday={isToday}
                  dateKey={dateKey}
                  celebratingId={celebratingId}
                  lastResults={lastResultsForDay}
                  timer={timer}
                  onStartTimer={timer.start}
                  onPauseTimer={timer.pause}
                  onResumeTimer={timer.resume}
                  onStopTimer={timer.stop}
                  onRename={renameSession}
                  onDelete={deleteSession}
                  onAddExercise={addExercise}
                  onEditExercise={editExercise}
                  onDeleteExercise={deleteExercise}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </AnimatePresence>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addNewSession}
            >
              + Add session
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No exercises yet — adding one starts Session 1.
            </p>
            <AddExerciseDialog onAdd={addFirstExercise} />
          </div>
        )}
      </div>
    </div>
  );
};
