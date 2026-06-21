import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRestTimer } from "@/hooks/useRestTimer";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";
import { formatDuration } from "@/lib/time";

const REST_PRESETS = [60, 90, 120];

export const WorkoutTimers = () => {
  const workout = useWorkoutTimer();
  const rest = useRestTimer();
  const [customRest, setCustomRest] = useState("");

  const startCustomRest = () => {
    const seconds = Number(customRest);
    if (seconds > 0) {
      rest.start(seconds);
      setCustomRest("");
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm text-muted-foreground">Workout time</div>
          <div className="text-2xl font-semibold tabular-nums">
            {formatDuration(workout.elapsed)}
          </div>
        </div>
        {workout.isRunning ? (
          <Button type="button" variant="destructive" onClick={workout.stop}>
            Stop
          </Button>
        ) : (
          <Button type="button" onClick={workout.start}>
            Start
          </Button>
        )}
      </div>

      <div className="border-t pt-4">
        {rest.isRunning ? (
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm text-muted-foreground">Rest</div>
              <div className="text-2xl font-semibold tabular-nums">
                {formatDuration(rest.remaining)}
              </div>
            </div>
            <Button type="button" variant="outline" onClick={rest.cancel}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Rest timer</div>
            <div className="flex flex-wrap items-center gap-2">
              {REST_PRESETS.map((seconds) => (
                <Button
                  key={seconds}
                  type="button"
                  variant="outline"
                  onClick={() => rest.start(seconds)}
                >
                  {seconds}s
                </Button>
              ))}
              <Input
                type="number"
                min="1"
                placeholder="Custom (s)"
                className="w-32"
                value={customRest}
                onChange={(e) => setCustomRest(e.target.value)}
              />
              <Button type="button" onClick={startCustomRest}>
                Start
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
