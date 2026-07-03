import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRestTimer } from "@/hooks/useRestTimer";
import { formatDuration } from "@/lib/time";

const REST_PRESETS = [60, 90, 120];

export const RestTimer = () => {
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
    <div className="rounded-xl border p-4 shadow-xs">
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
                size="sm"
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
  );
};
