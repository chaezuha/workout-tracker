import { Timer } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRestTimer } from "@/hooks/useRestTimer";
import { formatDuration } from "@/lib/time";

const REST_PRESETS = [60, 90, 120];

export const RestTimer = () => {
  const rest = useRestTimer();
  const [customRest, setCustomRest] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  const startCustomRest = () => {
    const seconds = Number(customRest);
    if (seconds > 0) {
      rest.start(seconds);
      setCustomRest("");
      setCustomOpen(false);
    }
  };

  return (
    <div className="boxed-list">
      {rest.isRunning ? (
        <div className="row min-h-16" role="timer" aria-live="off">
          <Timer className="size-5 text-accent-text" aria-hidden />
          <div className="row-body">
            <span className="row-subtitle">Resting</span>
            <span className="title-2 numeric">{formatDuration(rest.remaining)}</span>
          </div>
          <Button type="button" variant="outline" onClick={rest.cancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="row flex-wrap gap-y-2">
          <Timer className="size-4" aria-hidden />
          <span className="row-body min-w-24">Rest Timer</span>
          <div className="row-suffix ml-auto">
            <div className="linked" role="group" aria-label="Start rest">
              {REST_PRESETS.map((seconds) => (
                <Button
                  key={seconds}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="numeric"
                  onClick={() => rest.start(seconds)}
                >
                  {seconds}s
                </Button>
              ))}
            </div>
            <Popover open={customOpen} onOpenChange={setCustomOpen}>
              <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm">Custom</Button></PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); startCustomRest(); }}>
                  <Label htmlFor="custom-rest">Rest duration (seconds)</Label>
                  <Input id="custom-rest" type="number" inputMode="numeric" min="1" required value={customRest} onChange={(e) => setCustomRest(e.target.value)} />
                  <Button type="submit" className="w-full">Start Rest</Button>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
};
