import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { Check, CopyPlus, Plus, X } from "lucide-react";
import { loggedReps } from "@/services/stats";
import {
  sanitizeEntry,
  deriveLegacyFields,
  summarizeEntries,
  toWeight,
} from "@/services/setEntries";
import {
  suggestProgression,
  formatSuggestion,
  formatLastEntries,
} from "@/services/progression";
import {
  getEffortScale,
  setEffortScale,
  rpeToDisplay,
  displayToRpe,
} from "@/lib/effort";
import { formatFriendly, fromDateKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Keyframes end on the card's resting shadow (shadow-xs) so the pulse
// doesn't leave a stale inline box-shadow behind.
const BASE_SHADOW = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
const pulse = (rgb, spread) => ({
  boxShadow: [
    `${BASE_SHADOW}, 0 0 0 0px rgba(${rgb}, 0)`,
    `${BASE_SHADOW}, 0 0 0 ${spread}px rgba(${rgb}, 0.45)`,
    `${BASE_SHADOW}, 0 0 0 0px rgba(${rgb}, 0)`,
  ],
});

const TYPE_LABELS = { warmup: "Warm-up", working: "Working", drop: "Drop" };

// Dialog rows hold raw input strings; sanitizeEntry converts on save.
const entryToRow = (entry, scale) => ({
  weight: entry.weight ?? "",
  targetReps: entry.targetReps,
  reps: entry.reps ?? "",
  type: entry.type,
  rpeDisplay: rpeToDisplay(entry.rpe, scale) ?? "",
});

const rowToEntry = (row, scale) =>
  sanitizeEntry({
    weight: row.weight,
    targetReps: row.targetReps,
    reps: row.reps,
    type: row.type,
    rpe: displayToRpe(row.rpeDisplay, scale),
  });

export const Exercise = ({ id, name, weight, sets, reps, notes, completedReps, setEntries, lastResult, celebrating, onDelete, onEdit }) => {
  const [rows, setRows] = useState([]);
  const [scale, setScale] = useState(() => getEffortScale());
  const [logOpen, setLogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    if (!justLogged) return;
    const t = setTimeout(() => setJustLogged(false), 900);
    return () => clearTimeout(t);
  }, [justLogged]);

  const entries = setEntries ?? [];
  const loggedCount = loggedReps({ sets, completedReps }).length;
  const suggestion = suggestProgression(lastResult);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const openLog = (open) => {
    if (open) setRows(entries.map((en) => entryToRow(en, scale)));
    setLogOpen(open);
  };

  const patchRow = (i, patch) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const copyRowAbove = (i) => {
    setRows((prev) =>
      prev.map((r, j) => (j === i ? { ...prev[i - 1] } : r)),
    );
  };

  const removeRow = (i) => {
    setRows((prev) => prev.filter((_, j) => j !== i));
  };

  const addRow = () => {
    setRows((prev) => {
      const last = prev.at(-1);
      return prev.concat({
        weight: last?.weight ?? (weight ?? ""),
        targetReps: last?.targetReps ?? (Math.floor(Number(reps)) || 1),
        reps: "",
        type: last?.type === "warmup" ? "working" : (last?.type ?? "working"),
        rpeDisplay: "",
      });
    });
  };

  const completeAllPlanned = () => {
    setRows((prev) =>
      prev.map((r) => (r.reps === "" ? { ...r, reps: String(r.targetReps) } : r)),
    );
  };

  // With a suggestion: apply its weight/target to un-logged rows. Without
  // one (mixed/pyramid last time): rebuild the plan from last time's sets,
  // keeping anything already logged today at the same position.
  const applyPrefill = () => {
    setRows((prev) => {
      if (suggestion) {
        return prev.map((r) =>
          r.reps === ""
            ? { ...r, weight: suggestion.weight, targetReps: suggestion.targetReps }
            : r,
        );
      }
      const base = lastResult.entries.map((en) => ({
        weight: en.weight ?? "",
        targetReps: en.targetReps,
        reps: "",
        type: en.type,
        rpeDisplay: "",
      }));
      prev.forEach((r, i) => {
        if (r.reps !== "" && base[i]) base[i] = r;
      });
      return base;
    });
  };

  const toggleScale = () => {
    const next = scale === "rpe" ? "rir" : "rpe";
    // Re-express typed values in the new scale so nothing shifts meaning.
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        rpeDisplay: rpeToDisplay(displayToRpe(r.rpeDisplay, scale), next) ?? "",
      })),
    );
    setScale(next);
    setEffortScale(next);
  };

  const submitLog = (e) => {
    e.preventDefault();
    const next = rows.map((r) => rowToEntry(r, scale));
    onEdit(id, { setEntries: next, ...deriveLegacyFields(next) });
    setLogOpen(false);
    setJustLogged(true);
  };

  // Plan edits only re-shape un-logged sets: the entry count follows `sets`,
  // and weight/target overwrite rows without a logged result. Logged sets
  // keep what actually happened.
  const submitEdit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const count = Math.max(0, Math.floor(Number(data.sets)) || 0);
    const target = Math.floor(Number(data.reps)) || 1;
    const next = entries
      .slice(0, count)
      .map((en) =>
        en.reps == null
          ? { ...en, weight: toWeight(data.weight), targetReps: target }
          : en,
      );
    while (next.length < count) {
      next.push(sanitizeEntry({ weight: data.weight, targetReps: target }));
    }
    onEdit(id, {
      name: data.name,
      notes: data.notes,
      setEntries: next,
      ...deriveLegacyFields(next),
    });
    setEditOpen(false);
  };

  return (
    // The outer div belongs to dnd-kit (its inline transform must not be
    // animated by motion); the motion wrapper only animates enter/exit.
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-10" : undefined}
    >
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <motion.div
          animate={
            celebrating
              ? { scale: [1, 1.03, 1], ...pulse("245, 158, 11", 6) }
              : justLogged
                ? pulse("16, 185, 129", 4)
                : {}
          }
          transition={{ duration: celebrating ? 1.1 : 0.7, ease: "easeInOut" }}
          className={`flex w-full flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-xs transition-shadow ${
            isDragging ? "opacity-90 shadow-lg ring-2 ring-ring/40" : ""
          }`}
        >
      {/* touch-none lives on the handle (not the row) so the browser can't
          claim the gesture as a scroll mid-drag; py-2 -my-2 grows the hit box
          without changing the row height. attributes + listeners + the
          activator ref all sit on this one focusable button so keyboard
          reordering (tab to handle, space/enter, arrows) works. */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="touch-none text-2xl px-2 py-2 -my-2 cursor-grab active:cursor-grabbing select-none text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-2 focus-visible:outline-ring"
      >
        ⠿
      </button>
      <div className="min-w-0 space-y-1">
        <div className="font-medium">{name}</div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{summarizeEntries(entries)}</span>
          {loggedCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              <Check className="size-3.5" aria-hidden />
              {loggedCount}/{sets}
            </motion.span>
          )}
        </div>
        {notes && (
          <div className="truncate text-sm text-muted-foreground">{notes}</div>
        )}
        {lastResult && (
          <div className="text-xs text-muted-foreground">
            Last ({formatFriendly(fromDateKey(lastResult.date))}):{" "}
            {formatLastEntries(lastResult.entries)}
            {/* the hint collapses once today's logging starts */}
            {loggedCount === 0 && suggestion && (
              <span className="text-foreground/70">
                {" "}· {formatSuggestion(suggestion)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="ml-auto flex gap-2">
      <Dialog open={logOpen} onOpenChange={openLog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Log sets</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <form className="grid gap-4" onSubmit={submitLog}>
            <DialogHeader>
              <DialogTitle>Log sets</DialogTitle>
              <DialogDescription>
                Weight and reps for each set; type and{" "}
                {scale === "rpe" ? "RPE" : "RIR"} are optional.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
              <div className="grid grid-cols-[minmax(5rem,1fr)_minmax(4rem,1fr)_minmax(3.5rem,1fr)_3.25rem_3.5rem] items-center gap-1.5 text-xs text-muted-foreground">
                <span>Type</span>
                <span>Weight</span>
                <span>Reps</span>
                <button
                  type="button"
                  onClick={toggleScale}
                  title="Switch between RPE and RIR"
                  className="rounded text-left underline decoration-dotted underline-offset-2 hover:text-foreground"
                >
                  {scale === "rpe" ? "RPE" : "RIR"}
                </button>
                <span />
              </div>
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(5rem,1fr)_minmax(4rem,1fr)_minmax(3.5rem,1fr)_3.25rem_3.5rem] items-center gap-1.5"
                >
                  <Select
                    value={row.type}
                    onValueChange={(type) => patchRow(i, { type })}
                  >
                    <SelectTrigger
                      aria-label={`Set ${i + 1} type`}
                      className="w-full px-2"
                    >
                      <SelectValue>{TYPE_LABELS[row.type]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warmup">Warm-up</SelectItem>
                      <SelectItem value="working">Working</SelectItem>
                      <SelectItem value="drop">Drop set</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    aria-label={`Set ${i + 1} weight`}
                    placeholder="lb"
                    value={row.weight}
                    onChange={(e) => patchRow(i, { weight: e.target.value })}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    aria-label={`Set ${i + 1} reps`}
                    placeholder={String(row.targetReps)}
                    value={row.reps}
                    onChange={(e) => patchRow(i, { reps: e.target.value })}
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    aria-label={`Set ${i + 1} ${scale === "rpe" ? "RPE" : "RIR"}`}
                    value={row.rpeDisplay}
                    onChange={(e) => patchRow(i, { rpeDisplay: e.target.value })}
                  />
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Copy set above"
                      disabled={i === 0}
                      onClick={() => copyRowAbove(i)}
                    >
                      <CopyPlus aria-hidden />
                      <span className="sr-only">Copy set above</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Remove set"
                      onClick={() => removeRow(i)}
                    >
                      <X aria-hidden />
                      <span className="sr-only">Remove set</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus aria-hidden /> Add set
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={completeAllPlanned}
              >
                Complete all planned
              </Button>
              {lastResult && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title={
                    suggestion
                      ? formatSuggestion(suggestion)
                      : "Copy last time's sets as today's plan"
                  }
                  onClick={applyPrefill}
                >
                  {suggestion ? "Prefill suggestion" : "Prefill from last time"}
                </Button>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save sets</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Edit</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
          <form className="grid gap-4" onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle>Edit exercise</DialogTitle>
              <DialogDescription>
                Weight, sets, and reps set the plan; sets you've already
                logged keep their own values.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label htmlFor="name-1">Name</Label>
                <Input id="name-1" name="name" defaultValue={name} required />
              </Field>
              <Field>
                <Label htmlFor="weight-1">Weight</Label>
                <Input
                  id="weight-1"
                  name="weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  defaultValue={weight ?? ""}
                />
              </Field>
              <Field>
                <Label htmlFor="set-1">Sets</Label>
                <Input
                  id="set-1"
                  name="sets"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  defaultValue={sets}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="rep-1">Reps</Label>
                <Input
                  id="rep-1"
                  name="reps"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  defaultValue={reps}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="notes-1">Notes</Label>
                <Input id="notes-1" name="notes" defaultValue={notes} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
          </DialogContent>
      </Dialog>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => onDelete(id)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        Delete
      </Button>
      </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
