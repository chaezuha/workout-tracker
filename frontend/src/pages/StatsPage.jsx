import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getExerciseStats } from "@/services/stats";

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
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getExerciseStats()
      .then((s) => {
        if (!cancelled) setStats(s);
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

  const showStats = () => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Loading your stats…</p>;
    }
    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }
    if (!stats || stats.exercises.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No workouts logged yet — add some exercises to see your stats.
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
            <div
              key={exercise.name}
              className="flex items-center justify-between rounded-xl border bg-muted/50 p-4"
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
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Your training totals and best lifts.
        </p>
      </div>
      {showStats()}
    </div>
  );
};
