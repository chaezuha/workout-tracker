import { formatDurationCompact } from "@/lib/time";

// The capture target for the share image. Fixed width so output is stable
// across viewports; semantic tokens so it matches the active theme; system
// font stack because capture runs with skipFonts (embedding webfonts into the
// foreignObject SVG is what breaks Safari).
export const ShareSummaryCard = ({ summary, ref }) => (
  <div
    ref={ref}
    className="w-[600px] rounded-2xl border bg-card p-8 text-card-foreground"
    style={{
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}
  >
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Workout Tracker
      </span>
      <span className="text-sm text-muted-foreground">{summary.dateLabel}</span>
    </div>
    <h2 className="mt-2 text-2xl font-bold">{summary.name}</h2>
    {summary.durationSeconds > 0 && (
      <div className="mt-1 text-sm text-muted-foreground">
        {formatDurationCompact(summary.durationSeconds)}
      </div>
    )}
    <div className="mt-6 space-y-3">
      {summary.exercises.map((ex) => (
        <div
          key={ex.name}
          className="flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
        >
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <span className="truncate">{ex.name}</span>
            {ex.isPr && (
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                PR
              </span>
            )}
          </span>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {ex.setSummary ??
              `${ex.loggedReps.join(" / ")} reps${ex.weight ? ` @ ${ex.weight} lb` : ""}`}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-6 flex items-center justify-between border-t pt-4">
      <span className="text-sm text-muted-foreground">Total volume</span>
      <span className="text-lg font-bold">
        {summary.totalVolume.toLocaleString("en-US")} lb
      </span>
    </div>
  </div>
);
