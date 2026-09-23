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
    <div className="banner">
      <div className="banner-inner justify-between sm:justify-center">
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-0.5">
          <Timer className="size-4 shrink-0" aria-hidden />
          {location.pathname === "/" ? (
            <span className="truncate font-medium">{name}</span>
          ) : (
            <Link to="/" className="truncate font-medium hover:underline">
              {name}
            </Link>
          )}
          <span className="font-bold tabular-nums">
            {formatDuration(timer.elapsed)}
          </span>
          {timer.status === "paused" && (
            <span className="text-muted-foreground">Paused</span>
          )}
          {startedLabel && (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {startedLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {timer.status === "running" ? (
            <Button type="button" size="sm" variant="outline" onClick={timer.pause}>
              Pause
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={timer.resume}>
              Resume
            </Button>
          )}
          <ConfirmDialog
            trigger={
              <Button type="button" size="sm" variant="outline">
                Stop
              </Button>
            }
            title="Stop Timer?"
            description={`This adds ${formatDuration(timer.elapsed)} to ${name}.`}
            confirmLabel="Stop and Save"
            onConfirm={timer.stop}
          />
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="hover:text-destructive"
              >
                Discard
              </Button>
            }
            title="Discard Timer?"
            description="The elapsed time is thrown away and not added to any session."
            confirmLabel="Discard"
            confirmVariant="destructive"
            onConfirm={timer.discard}
          />
        </div>
      </div>
      {timer.saveError && (
        <p className="mx-auto max-w-[640px] px-3 pb-2 text-center text-sm text-destructive sm:px-6">
          {timer.saveError}
        </p>
      )}
    </div>
  );
};
