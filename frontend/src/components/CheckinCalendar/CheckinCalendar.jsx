import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  getCheckinDates,
  addCheckin,
  removeCheckin,
} from "@/services/checkins";
import { toDateKey, fromDateKey } from "@/lib/dates";

export const CheckinCalendar = () => {
  const [checkinKeys, setCheckinKeys] = useState([]);
  const [error, setError] = useState("");
  const todayKey = toDateKey(new Date());
  const checkedInToday = checkinKeys.includes(todayKey);

  useEffect(() => {
    getCheckinDates()
      .then(setCheckinKeys)
      .catch(() => setError("Could not load your check-ins."));
  }, []);

  const handleCheckin = async () => {
    setError("");
    try {
      if (checkedInToday) {
        await removeCheckin(todayKey);
        setCheckinKeys(checkinKeys.filter((k) => k !== todayKey));
      } else {
        await addCheckin(todayKey);
        setCheckinKeys(checkinKeys.concat(todayKey));
      }
    } catch {
      setError("Could not save your check-in.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Daily Check-in</h1>
        <Button
          type="button"
          variant={checkedInToday ? "outline" : "default"}
          onClick={handleCheckin}
        >
          {checkedInToday ? "Checked in ✓" : "Check in"}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Calendar
        modifiers={{ checkedIn: checkinKeys.map(fromDateKey) }}
        modifiersClassNames={{ checkedIn: "day-checked-in" }}
        className="rounded-md border w-fit p-4 [--cell-size:--spacing(11)]"
      />
    </div>
  );
};
