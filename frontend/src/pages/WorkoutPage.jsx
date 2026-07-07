import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/SessionCard/SessionCard";
import { DateNav } from "@/components/DateNav/DateNav";
import { RestTimer } from "@/components/RestTimer/RestTimer";
import { SavedWorkouts } from "@/components/SavedWorkouts/SavedWorkouts";
import { AddExerciseDialog } from "@/components/AddExerciseDialog/AddExerciseDialog";
import { toDateKey } from "@/lib/dates";
import { getDayForDate, saveDayForDate } from "@/services/workouts";
import { addSessionDuration } from "@/services/sessions";
import { getAllStatsRows } from "@/services/stats";
import { buildPrBaselines, detectPrs, recordResult } from "@/services/prs";
import { getWorkoutTimer } from "@/services/timer";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";
import { useAuth } from "@/contexts/AuthContext";

const makeExercise = (data) => ({
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

  const { user } = useAuth();

  const loadedDateRef = useRef(null);
  // Saves must run one at a time: saveDayForDate deletes rows missing
  // from the list it was given, so a save started with a stale list would
  // delete rows a newer overlapping save just inserted.
  const saveQueueRef = useRef(Promise.resolve());

  // Timer stops go through the same save queue so a brand-new session's row
  // is guaranteed to exist before its duration is written. Day-saves never
  // write durations, so the optimistic state bump below can't be clobbered.
  const onSaveDuration = useCallback(
    (sessionId, timerDateKey, seconds) => {
      const write = saveQueueRef.current.then(() =>
        addSessionDuration(timerDateKey, sessionId, seconds),
      );
      saveQueueRef.current = write.catch(() => {});
      if (timerDateKey === dateKey) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, durationSeconds: s.durationSeconds + seconds }
              : s,
          ),
        );
      }
      return write;
    },
    [dateKey],
  );

  const timer = useWorkoutTimer({ onSaveDuration });
  const adoptSession = timer.adoptSession; // stable

  // PR baselines are fetched once per viewed day, then mutated: today's
  // pre-edit results and every detected PR fold in via recordResult, so a
  // reopened dialog can't re-celebrate but a second heavier set can.
  const baselinesRef = useRef(null);
  const [celebratingId, setCelebratingId] = useState(null);
  const celebrateTimeoutRef = useRef(null);

  const checkForPrs = async (exercise, prevSessions) => {
    try {
      baselinesRef.current ??= getAllStatsRows().then((rows) =>
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
    baselinesRef.current = null; // baselines are relative to the viewed day
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
      setSessions(day);
      loadedDateRef.current = dateKey;
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey, user, adoptSession]);

  useEffect(() => {
    if (!user) return;
    if (loadedDateRef.current !== dateKey) return;
    saveQueueRef.current = saveQueueRef.current
      .then(() => saveDayForDate(dateKey, sessions))
      .catch((err) => console.error("Failed to save workout", err));
  }, [sessions, dateKey, user]);

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
    // Reps saves and weight edits can both change the logged result (a weight
    // bump after logging reps is still a new best); other edits can't.
    if (data.completedReps !== undefined || data.weight !== undefined) {
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
          <h2 className="text-lg font-medium">Sessions</h2>
          <SavedWorkouts
            dayExercises={sessions.flatMap((s) => s.exercises)}
            onLoadTemplate={loadTemplateIntoDay}
          />
        </div>
        {timer.saveError && (
          <p className="text-sm text-destructive">{timer.saveError}</p>
        )}
        {sessions.length > 0 ? (
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
