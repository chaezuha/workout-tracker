import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { getWorkoutsForDate } from "@/services/workouts";
import { formatFriendly, fromDateKey, toDateKey } from "@/lib/dates";

const DayExerciseRow = ({ exercise, highlighted }) => (
  <div
    className={
      highlighted
        ? "rounded-xl border border-primary/50 bg-primary/5 p-3"
        : "rounded-xl border bg-muted/50 p-3"
    }
  >
    <div className="flex items-center justify-between gap-3">
      <p className="font-medium">{exercise.name}</p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {exercise.sets} × {exercise.reps}
        {exercise.weight !== "" && ` @ ${exercise.weight} lb`}
      </p>
    </div>
    {exercise.notes && (
      <p className="mt-1 text-xs text-muted-foreground">{exercise.notes}</p>
    )}
  </div>
);

const ExerciseHistory = ({ exercise }) => {
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [dayExercises, setDayExercises] = useState(null);
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
    setDayExercises(null);
    setDayError("");
    getWorkoutsForDate(dateKey)
      .then(setDayExercises)
      .catch(() => setDayError("Could not load that day's workout."));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{exercise.name}</DialogTitle>
        <DialogDescription>
          {exercise.days} {exercise.days === 1 ? "day" : "days"} trained — tap
          a highlighted day to see that workout.
        </DialogDescription>
      </DialogHeader>
      <Calendar
        mode="single"
        className="mx-auto"
        selected={selectedDateKey ? fromDateKey(selectedDateKey) : undefined}
        onSelect={handleSelect}
        defaultMonth={fromDateKey(exercise.dateKeys.at(-1))}
        modifiers={{ performed: performedDays }}
        modifiersClassNames={{ performed: "day-has-workout" }}
        disabled={(date) => !dateKeySet.has(toDateKey(date))}
      />
      {selectedDateKey && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {formatFriendly(fromDateKey(selectedDateKey))}
          </p>
          {dayError ? (
            <p className="text-sm text-destructive">{dayError}</p>
          ) : !dayExercises ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            dayExercises.map((e) => (
              <DayExerciseRow
                key={e.id}
                exercise={e}
                highlighted={e.name.trim().toLowerCase() === exercise.key}
              />
            ))
          )}
        </div>
      )}
    </>
  );
};

export const ExerciseHistoryDialog = ({ exercise, onOpenChange }) => (
  <Dialog open={!!exercise} onOpenChange={onOpenChange}>
    {exercise && (
      <DialogContent>
        <ExerciseHistory key={exercise.key} exercise={exercise} />
      </DialogContent>
    )}
  </Dialog>
);
