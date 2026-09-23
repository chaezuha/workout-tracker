import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeaderBar,
  DialogHeaderClose,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { getDayForDate } from "@/services/workouts";
import { summarizeEntries } from "@/services/setEntries";
import { formatFriendly, fromDateKey, toDateKey } from "@/lib/dates";
import { formatDuration } from "@/lib/time";

// The exercise this history is for gets an accent bar, so it stands out
// among the rest of that day's lifts.
const DayExerciseRow = ({ exercise, highlighted }) => (
  <div className={`row ${highlighted ? "shadow-[inset_3px_0_0_var(--primary)]" : ""}`}>
    <div className="row-body">
      <span className={`row-title ${highlighted ? "font-bold" : ""}`}>{exercise.name}</span>
      <span className="row-subtitle numeric">{summarizeEntries(exercise.setEntries)}</span>
      {exercise.notes && <span className="row-subtitle italic">{exercise.notes}</span>}
    </div>
  </div>
);

const ExerciseHistory = ({ exercise }) => {
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [daySessions, setDaySessions] = useState(null);
  const [dayError, setDayError] = useState("");

  const performedDays = useMemo(
    () => exercise.dateKeys.map(fromDateKey),
    [exercise.dateKeys],
  );
  const dateKeySet = useMemo(
    () => new Set(exercise.dateKeys),
    [exercise.dateKeys],
  );

  const handleSelect = (date) => {
    if (!date) return;
    const dateKey = toDateKey(date);
    setSelectedDateKey(dateKey);
    setDaySessions(null);
    setDayError("");
    getDayForDate(dateKey)
      .then(setDaySessions)
      .catch(() => setDayError("Could not load that day's workout."));
  };

  return (
    <>
      <DialogHeaderBar title={exercise.name} subtitle="History" end={<DialogHeaderClose />} />
      <DialogDescription>
        Trained on {exercise.days} {exercise.days === 1 ? "day" : "days"}.
        Pick a marked day to see that workout.
      </DialogDescription>
      <Calendar
        mode="single"
        className="mx-auto rounded-xl shadow-[var(--card-shadow)]"
        selected={selectedDateKey ? fromDateKey(selectedDateKey) : undefined}
        onSelect={handleSelect}
        defaultMonth={fromDateKey(exercise.dateKeys.at(-1))}
        modifiers={{ performed: performedDays }}
        modifiersClassNames={{ performed: "day-has-workout" }}
        disabled={(date) => !dateKeySet.has(toDateKey(date))}
      />
      {selectedDateKey && (
        <div className="grid gap-3">
          <h3 className="group-title px-0.5">
            {formatFriendly(fromDateKey(selectedDateKey))}
          </h3>
          {dayError ? (
            <p className="text-sm text-destructive">{dayError}</p>
          ) : !daySessions ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            daySessions
              // Legacy duration-only sessions still show (as a duration line),
              // but empty zero-duration sessions add nothing.
              .filter((s) => s.exercises.length > 0 || s.durationSeconds > 0)
              .map((session, index, visible) => {
                // A lone unnamed, untimed session is just "the day" — no header.
                const showHeader =
                  visible.length > 1 ||
                  session.name != null ||
                  session.durationSeconds > 0;
                return (
                  <div key={session.id} className="grid gap-2">
                    {showHeader && (
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <p className="text-xs font-bold text-muted-foreground">
                          {session.name ?? `Session ${index + 1}`}
                        </p>
                        {session.durationSeconds > 0 && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatDuration(session.durationSeconds)}
                          </p>
                        )}
                      </div>
                    )}
                    {session.exercises.length > 0 && (
                      <div className="boxed-list overflow-hidden">
                        {session.exercises.map((e) => (
                          <DayExerciseRow
                            key={e.id}
                            exercise={e}
                            highlighted={
                              e.name.trim().toLowerCase() === exercise.key
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}
    </>
  );
};

export const ExerciseHistoryDialog = ({ exercise, onOpenChange }) => (
  <Dialog open={!!exercise} onOpenChange={onOpenChange}>
    {exercise && (
      <DialogContent headerbar>
        <ExerciseHistory key={exercise.key} exercise={exercise} />
      </DialogContent>
    )}
  </Dialog>
);
