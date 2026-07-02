import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  RANGE_OPTIONS,
  aggregateStats,
  filterRowsByRange,
  getAllStatsRows,
} from "@/services/stats";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExerciseHistoryDialog } from "@/components/ExerciseHistoryDialog/ExerciseHistoryDialog";

const SummaryCard = ({ value, label }) => (
  <div className="rounded-xl border bg-muted/50 p-4">
    <div className="space-y-1">
      <p className="text-lg leading-none font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

export const StatsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("all");
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAllStatsRows()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your stats.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(
    () => (rows ? aggregateStats(filterRowsByRange(rows, range)) : null),
    [rows, range],
  );

  const showStats = () => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Loading your stats…</p>;
    }
    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }
    if (!rows || rows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No workouts logged yet — add some exercises to see your stats.
        </p>
      );
    }
    if (stats.exercises.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No workouts in this range.
        </p>
      );
    }
    return (
      <>
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            value={`${stats.totals.totalVolume.toLocaleString()} lb`}
            label="Total volume"
          />
          <SummaryCard value={stats.totals.exercises} label="Exercises" />
          <SummaryCard value={stats.totals.sessions} label="Training days" />
        </div>
        <div className="space-y-3">
          {stats.exercises.map((exercise) => (
            <button
              type="button"
              key={exercise.key}
              onClick={() => setSelectedExercise(exercise)}
              className="flex w-full items-center justify-between rounded-xl border bg-muted/50 p-4 text-left transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="space-y-1">
                <p className="font-medium">{exercise.name}</p>
                <p className="text-xs text-muted-foreground">
                  {exercise.days} {exercise.days === 1 ? "day" : "days"} trained
                </p>
              </div>
              <div className="flex gap-6 text-right">
                <div className="space-y-1">
                  <p className="text-sm font-semibold tabular-nums">
                    {exercise.bestWeight} lb
                  </p>
                  <p className="text-xs text-muted-foreground">Best weight</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold tabular-nums">
                    {Math.round(exercise.bestOneRepMax)} lb
                  </p>
                  <p className="text-xs text-muted-foreground">Est. 1RM</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </>
    );
  };

  const showRangeSelect = !loading && !error && rows && rows.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
          <p className="text-sm text-muted-foreground">
            Your training totals and best lifts.
          </p>
        </div>
        {showRangeSelect && (
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger aria-label="Time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {showStats()}
      <ExerciseHistoryDialog
        exercise={selectedExercise}
        onOpenChange={(open) => !open && setSelectedExercise(null)}
      />
    </div>
  );
};
