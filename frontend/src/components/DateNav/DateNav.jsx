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

export const DateNav = ({ selectedDate, onDateChange }) => {
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
        aria-label="Previous day"
        onClick={() => onDateChange(addDays(selectedDate, -1))}
      >
        ←
      </Button>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" className="text-lg font-semibold">
              {formatFriendly(selectedDate)}
            </Button>
          </PopoverTrigger>
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
            onClick={() => onDateChange(new Date())}
          >
            Today
          </Button>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next day"
        onClick={() => onDateChange(addDays(selectedDate, 1))}
      >
        →
      </Button>
    </div>
  );
};
