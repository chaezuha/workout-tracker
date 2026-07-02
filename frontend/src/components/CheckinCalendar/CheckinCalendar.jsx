import { useEffect, useState } from "react";
import { Check, Flame, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  getCheckinDates,
  addCheckin,
  removeCheckin,
} from "@/services/checkins";
import { toDateKey, fromDateKey } from "@/lib/dates";

const computeStreak = (keys) => {
  const checked = new Set(keys);
  const day = new Date();
  // A streak is still alive if today hasn't been checked in yet
  if (!checked.has(toDateKey(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (checked.has(toDateKey(day))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
};

const StatTile = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs">
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
      <Icon className="size-4 text-muted-foreground" />
    </div>
    <div className="space-y-1">
      <p className="text-lg leading-none font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

export const CheckinCalendar = () => {
  const [checkinKeys, setCheckinKeys] = useState([]);
  const [error, setError] = useState("");
  const todayKey = toDateKey(new Date());
  const checkedInToday = checkinKeys.includes(todayKey);
  const monthCount = checkinKeys.filter((k) =>
    k.startsWith(todayKey.slice(0, 7)),
  ).length;
  const streak = computeStreak(checkinKeys);

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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Daily check-in
        </h1>
        <p className="text-sm text-muted-foreground">
          Check in once a day to build the habit.
        </p>
      </div>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <div className="mx-auto w-full max-w-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StatTile icon={Flame} value={streak} label="day streak" />
          <StatTile
            icon={CalendarCheck}
            value={monthCount}
            label="this month"
          />
        </div>
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Calendar
            modifiers={{ checkedIn: checkinKeys.map(fromDateKey) }}
            modifiersClassNames={{ checkedIn: "day-checked-in" }}
            className="w-full p-4 sm:p-5 [--cell-radius:9999px] [--cell-size:--spacing(10)] [&_.rdp-day]:flex [&_.rdp-day]:items-center [&_.rdp-day]:justify-center [&_.rdp-day]:text-sm"
            classNames={{
              root: "w-full",
              caption_label: "text-base font-semibold",
              weekdays: "flex gap-1",
              week: "mt-1.5 flex w-full gap-1",
            }}
          />
          <div className="border-t bg-muted/30 p-4">
            <Button
              type="button"
              className="w-full"
              variant={checkedInToday ? "outline" : "default"}
              onClick={handleCheckin}
            >
              {checkedInToday ? (
                <>
                  <Check /> Checked in today
                </>
              ) : (
                "Check in for today"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
