import { useEffect, useState } from "react";
import { Check } from "@/components/ui/icons";
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

// An AdwActionRow with the number as its suffix.
const StatRow = ({ value, label }) => (
  <div className="row">
    <span className="row-body">{label}</span>
    <span className="title-4 numeric">{value}</span>
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
    <div className="space-y-8">
      <h1 className="sr-only">Daily Check-In</h1>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <div className="boxed-list">
        <StatRow value={streak} label="Day Streak" />
        <StatRow value={monthCount} label="This Month" />
      </div>
      <div className="overflow-hidden rounded-xl bg-card shadow-[var(--card-shadow)]">
        <Calendar
          modifiers={{ checkedIn: checkinKeys.map(fromDateKey) }}
          modifiersClassNames={{ checkedIn: "day-checked-in" }}
          className="w-full p-3 sm:p-5 [--cell-size:clamp(2rem,10vw,2.75rem)] [&_.rdp-day]:flex [&_.rdp-day]:h-(--cell-size) [&_.rdp-day]:items-center [&_.rdp-day]:justify-center [&_.rdp-day]:text-sm"
          classNames={{
            root: "w-full",
            caption_label: "text-base font-bold",
            weekdays: "flex gap-1",
            week: "mt-1.5 flex w-full gap-1",
          }}
        />
      </div>
      <div className="flex justify-center">
        <Button
          type="button"
          size="pill"
          variant={checkedInToday ? "outline" : "default"}
          onClick={handleCheckin}
        >
          {checkedInToday ? (
            <>
              <Check aria-hidden /> Checked In Today
            </>
          ) : (
            "Check In for Today"
          )}
        </Button>
      </div>
    </div>
  );
};
