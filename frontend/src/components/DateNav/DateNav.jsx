import { ChevronLeft, ChevronRight, ChevronDown } from "@/components/ui/icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getDatesWithWorkouts } from "@/services/workouts";
import { addDays, formatFriendly, toDateKey, fromDateKey } from "@/lib/dates";

// Circular prev/next around a date title that opens a calendar; the
// optional subtitle (save status) sits under it like AdwWindowTitle's.
export const DateNav = ({ selectedDate, onDateChange, subtitle }) => {
  const isToday = toDateKey(selectedDate) === toDateKey(new Date());
  const [open, setOpen] = useState(false);
  const [workoutDays, setWorkoutDays] = useState([]);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) {
      getDatesWithWorkouts().then((keys) => setWorkoutDays(keys.map(fromDateKey)));
    }
  };

  const handleSelect = (date) => {
    if (!date) return;
    onDateChange(date);
    setOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        shape="circular"
        aria-label="Previous day"
        onClick={() => onDateChange(addDays(selectedDate, -1))}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <div className="flex min-w-0 flex-col items-center gap-0.5">
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-1">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <h1>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" className="h-10 gap-1.5 px-3 text-xl font-extrabold">
              {formatFriendly(selectedDate)}<ChevronDown className="size-4" strokeWidth={2.5} aria-hidden />
            </Button>
          </PopoverTrigger>
          </h1>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              defaultMonth={selectedDate}
              modifiers={{ hasWorkout: workoutDays }}
              modifiersClassNames={{ hasWorkout: "day-has-workout" }}
            />
          </PopoverContent>
        </Popover>
        {!isToday && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onDateChange(new Date())}
          >
            Today
          </Button>
        )}
      </div>
      {subtitle}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        shape="circular"
        aria-label="Next day"
        onClick={() => onDateChange(addDays(selectedDate, 1))}
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
};
