import { Button } from "@/components/ui/button";
import { addDays, formatFriendly, toDateKey } from "@/lib/dates";

export const DateNav = ({ selectedDate, onDateChange }) => {
  const isToday = toDateKey(selectedDate) === toDateKey(new Date());

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
        <span className="text-lg font-semibold">
          {formatFriendly(selectedDate)}
        </span>
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
