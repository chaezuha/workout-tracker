import { Link, useLocation } from "react-router-dom";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useGlobalWorkoutTimer } from "@/contexts/WorkoutTimerContext";
import { formatDuration } from "@/lib/time";
import { toDateKey, fromDateKey, formatFriendly, isValidDateKey } from "@/lib/dates";

// Always-visible timer controls: rendered in the app chrome on every page so
// a running timer can be paused, stopped, or discarded without returning to
// the workout page (which is also how an orphaned timer — started yesterday,
// or on a page you've navigated away from — gets surfaced).
export const WorkoutTimerBar = () => {
  const timer = useGlobalWorkoutTimer();
  const location = useLocation();

  if (timer.status === "idle") return null;

  const name = timer.sessionName || "Workout";
  const isToday = timer.dateKey === toDateKey(new Date());
  const startedLabel =
    !isToday && timer.dateKey && isValidDateKey(timer.dateKey)
      ? `started ${formatFriendly(fromDateKey(timer.dateKey))}`
      : null;

  return (
    <div className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-6 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Timer className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {location.pathname === "/" ? (
            <span className="truncate font-medium">{name}</span>
          ) : (
            <Link to="/" className="truncate font-medium hover:underline">
              {name}
            </Link>
          )}
          <span className="font-semibold tabular-nums">
            {formatDuration(timer.elapsed)}
          </span>
          {timer.status === "paused" && (
            <span className="text-muted-foreground">paused</span>
          )}
          {startedLabel && (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {startedLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {timer.status === "running" ? (
            <Button type="button" size="sm" variant="ghost" onClick={timer.pause}>
              Pause
            </Button>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={timer.resume}>
              Resume
            </Button>
          )}
          <ConfirmDialog
            trigger={
              <Button type="button" size="sm" variant="outline">
                Stop
              </Button>
            }
            title="Stop timer?"
            description={`This adds ${formatDuration(timer.elapsed)} to ${name}.`}
            confirmLabel="Stop & save"
            onConfirm={timer.stop}
          />
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
              >
                Discard
              </Button>
            }
            title="Discard timer?"
            description="The elapsed time is thrown away and not added to any session."
            confirmLabel="Discard"
            confirmVariant="destructive"
            onConfirm={timer.discard}
          />
        </div>
      </div>
      {timer.saveError && (
        <p className="mx-auto max-w-2xl px-6 pb-2 text-sm text-destructive">
          {timer.saveError}
        </p>
      )}
    </div>
  );
};
