import { useEffect, useMemo, useState } from "react";
import { ChartNoAxesCombined, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { HeaderActions } from "@/components/HeaderBar/HeaderSlot";
import {
  RANGE_OPTIONS,
  aggregateSessionTotals,
  aggregateStats,
  filterRowsByRange,
  getAllSessionRows,
  getAllStatsRows,
} from "@/services/stats";
import { formatDurationCompact } from "@/lib/time";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExerciseHistoryDialog } from "@/components/ExerciseHistoryDialog/ExerciseHistoryDialog";
import { HistoryCsvControls } from "@/components/HistoryCsv/HistoryCsvControls";

const SummaryCard = ({ value, label }) => (
  <div className="min-w-0 bg-card px-4 py-3.5 first:col-span-2 sm:first:col-span-1 sm:last:col-span-2">
    <p className="title-3 numeric break-words">{value}</p>
    <p className="caption dim">{label}</p>
  </div>
);

const StatusPage = ({ title, children }) => (
  <div className="status-page">
    <ChartNoAxesCombined className="status-page-icon" aria-hidden />
    <h2 className="title-1">{title}</h2>
    <p>{children}</p>
  </div>
);

export const StatsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [sessionRows, setSessionRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("all");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getAllStatsRows(), getAllSessionRows()])
      .then(([exerciseRows, sessions]) => {
        if (cancelled) return;
        setRows(exerciseRows);
        setSessionRows(sessions);
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
  }, [user, reloadKey]);

  const stats = useMemo(
    () => (rows ? aggregateStats(filterRowsByRange(rows, range)) : null),
    [rows, range],
  );

  const sessionTotals = useMemo(
    () =>
      sessionRows && stats
        ? aggregateSessionTotals(filterRowsByRange(sessionRows, range), {
            trainedSessionIds: stats.trainedSessionIds,
            trainedDates: stats.trainedDates,
          })
        : null,
    [sessionRows, stats, range],
  );

  const showStats = () => {
    if (loading) {
      return <p className="py-10 text-center text-sm text-muted-foreground">Loading your stats…</p>;
    }
    if (error) {
      return <StatusPage title="Couldn't Load Stats">{error}</StatusPage>;
    }
    if (!rows || rows.length === 0) {
      return (
        <StatusPage title="No Stats Yet">
          Log a workout and your totals and best lifts will show up here.
        </StatusPage>
      );
    }
    if (stats.exercises.length === 0) {
      return (
        <StatusPage title="Nothing in This Range">
          No logged sets in this time range. Try a longer one.
        </StatusPage>
      );
    }
    return (
      <section className="pref-group" aria-labelledby="lifts-title">
        <div className="group-header">
          <h2 id="lifts-title" className="group-title">Lifts</h2>
        </div>
        <div className="boxed-list">
          {stats.exercises.map((exercise) => (
            <button
              type="button"
              key={exercise.key}
              onClick={() => setSelectedExercise(exercise)}
              className="row row-activatable flex-wrap gap-y-2"
            >
              <span className="row-body min-w-32">
                <span className="row-title">{exercise.name}</span>
                <span className="row-subtitle">
                  {exercise.days} {exercise.days === 1 ? "day" : "days"}
                </span>
              </span>
              <span className="row-suffix gap-5 text-right">
                <span className="grid">
                  <span className="font-bold numeric">{exercise.bestWeight} lb</span>
                  <span className="caption dim">Best</span>
                </span>
                <span className="grid">
                  <span className="font-bold numeric">{Math.round(exercise.bestOneRepMax)} lb</span>
                  <span className="caption dim">Est. 1RM</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  };

  const showRangeSelect = !loading && !error && rows && rows.length > 0;

  return (
    <div className="page-content">
      <h1 className="sr-only">Stats</h1>
      <HeaderActions>
        <HistoryCsvControls onImported={() => setReloadKey((k) => k + 1)} />
      </HeaderActions>
      {showRangeSelect && (
        <section className="pref-group" aria-labelledby="overview-title">
          <div className="group-header items-center">
            <h2 id="overview-title" className="group-title">Overview</h2>
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
          </div>
          {stats.exercises.length > 0 && (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-separator shadow-[var(--card-shadow)] sm:grid-cols-3">
            <SummaryCard
              value={`${stats.totals.totalVolume.toLocaleString()} lb`}
              label="Total volume"
            />
            <SummaryCard value={stats.totals.exercises} label="Exercises" />
            <SummaryCard value={stats.totals.sessions} label="Training days" />
            <SummaryCard value={sessionTotals?.count ?? 0} label="Sessions" />
            <SummaryCard
              value={formatDurationCompact(sessionTotals?.totalSeconds ?? 0)}
              label="Total time"
            />
          </div>
          )}
        </section>
      )}
      {showStats()}
      <ExerciseHistoryDialog
        exercise={selectedExercise}
        onOpenChange={(open) => !open && setSelectedExercise(null)}
      />
    </div>
  );
};
