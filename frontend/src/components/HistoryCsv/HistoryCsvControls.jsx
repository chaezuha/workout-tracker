import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseCsv, planImport, rowsToDays, serializeDays } from "@/services/csv";
import {
  getAllDays,
  getDatesWithWorkouts,
  saveDayForDate,
} from "@/services/workouts";
import { addSessionDuration } from "@/services/sessions";
import { toDateKey } from "@/lib/dates";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// CSV export/import of the full workout history. Export ignores the stats
// range filter on purpose — a backup should be complete. Import never touches
// dates that already have data (planImport), so re-importing an export can't
// duplicate or overwrite anything.
export const HistoryCsvControls = ({ onImported }) => {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  // Parsed-and-planned import awaiting user confirmation; non-null opens the
  // dialog.
  const [plan, setPlan] = useState(null);

  const exportCsv = async () => {
    setBusy(true);
    try {
      const days = await getAllDays();
      if (!days.length) {
        toast("No workout history to export yet.");
        return;
      }
      const url = URL.createObjectURL(
        new Blob([serializeDays(days)], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `workout-history-${toDateKey(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${plural(days.length, "day")} of history`);
    } catch (err) {
      console.error("CSV export failed", err);
      toast.error("Couldn't export your history");
    } finally {
      setBusy(false);
    }
  };

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again re-fires change
    if (!file) return;
    setBusy(true);
    try {
      const { days, errors } = rowsToDays(parseCsv(await file.text()));
      if (!days.length) {
        toast.error(
          errors.length
            ? `Nothing to import. Line ${errors[0].line}: ${errors[0].message}`
            : "Nothing to import in that file",
        );
        return;
      }
      const existing = await getDatesWithWorkouts();
      const { toImport, skippedDates } = planImport(existing, days);
      setPlan({ toImport, skippedDates, invalidRows: errors.length });
    } catch (err) {
      console.error("CSV import failed", err);
      toast.error("Couldn't read that CSV file");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    const { toImport, skippedDates } = plan;
    setPlan(null);
    setBusy(true);
    try {
      for (const { date, sessions } of toImport) {
        await saveDayForDate(date, sessions);
        // saveDayForDate never writes durations (only the timer path does —
        // see services/sessions.js), so restore imported ones explicitly.
        for (const s of sessions) {
          if (s.durationSeconds > 0) {
            await addSessionDuration(date, s.id, s.durationSeconds);
          }
        }
      }
      toast.success(
        skippedDates.length
          ? `Imported ${plural(toImport.length, "date")}, skipped ${skippedDates.length}`
          : `Imported ${plural(toImport.length, "date")}`,
      );
      onImported?.();
    } catch (err) {
      console.error("CSV import failed", err);
      toast.error("Import stopped partway. Existing data wasn't changed.");
    } finally {
      setBusy(false);
    }
  };

  const describePlan = () => {
    if (!plan) return "";
    const parts = [];
    parts.push(
      plan.toImport.length
        ? `${plural(plan.toImport.length, "new date")} will be imported.`
        : "Every date in this file already has data, so there's nothing to import.",
    );
    if (plan.toImport.length && plan.skippedDates.length) {
      parts.push(
        `${plural(plan.skippedDates.length, "date")} already ${
          plan.skippedDates.length === 1 ? "has" : "have"
        } data and will be skipped.`,
      );
    }
    if (plan.invalidRows) {
      parts.push(`${plural(plan.invalidRows, "invalid row")} will be ignored.`);
    }
    return parts.join(" ");
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        aria-label="Import history from CSV"
        title="Import history from CSV"
      >
        <Upload aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={exportCsv}
        disabled={busy}
        aria-label="Export history as CSV"
        title="Export full history as CSV (ignores the range)"
      >
        <Download aria-hidden />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onFileChosen}
      />
      <Dialog open={plan !== null} onOpenChange={(open) => !open && setPlan(null)}>
        <DialogContent variant="alert" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Import Workout History?</DialogTitle>
            <DialogDescription>{describePlan()}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="lg" className="rounded-full">Cancel</Button>
            </DialogClose>
            {plan?.toImport.length > 0 && (
              <Button size="lg" className="rounded-full" onClick={runImport}>Import</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
