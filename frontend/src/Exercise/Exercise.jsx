import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { Check, Copy, Plus, X, GripVertical } from "@/components/ui/icons";
import { OverflowMenu } from "@/components/ui/overflow-menu";
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
  DialogHeaderBar,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntryRow } from "@/components/ui/entry-row";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const menuRef = useRef(null);
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
        <div
          data-feedback={celebrating ? "pr" : justLogged ? "logged" : undefined}
          className={`exercise-row ${isDragging ? "relative bg-card shadow-[var(--popover-shadow)]" : ""}`}
        >
      {/* touch-none lives on the handle (not the row) so the browser can't
          claim the gesture as a scroll mid-drag. The handle has a 44px hit
          target. attributes + listeners + the
          activator ref all sit on this one focusable button so keyboard
          reordering (tab to handle, space/enter, arrows) works. */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="flex min-h-11 w-9 touch-none items-center justify-center cursor-grab active:cursor-grabbing select-none text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-2 focus-visible:outline-ring"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <div className="row-body">
        <div className="row-title">{name}</div>
        <div className="row-subtitle flex flex-wrap items-center gap-x-2">
          <span>{summarizeEntries(entries)}</span>
          {loggedCount > 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center gap-0.5 font-bold text-success numeric"
            >
              <Check className="size-3.5" aria-hidden />
              {loggedCount}/{sets}
            </motion.span>
          )}
        </div>
        {notes && (
          <div className="row-subtitle truncate italic">{notes}</div>
        )}
        {lastResult && (
          <div className="text-xs text-muted-foreground">
            Last time ({formatFriendly(fromDateKey(lastResult.date))}):{" "}
            {formatLastEntries(lastResult.entries)}
            {/* the hint collapses once today's logging starts */}
            {loggedCount === 0 && suggestion && (
              <span className="text-accent-text">
                {" "}· {formatSuggestion(suggestion)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-0.5 sm:gap-1">
      <Dialog open={logOpen} onOpenChange={openLog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Log Sets</Button>
        </DialogTrigger>
        <DialogContent headerbar className="sm:max-w-xl">
          <form className="grid gap-4" onSubmit={submitLog}>
            <DialogHeaderBar
              title={name}
              subtitle="Log Sets"
              start={<DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>}
              end={<Button type="submit">Save</Button>}
            />
            <DialogDescription>
              Log weight and reps for each set. Type and{" "}
              {scale === "rpe" ? "RPE" : "RIR"} are optional.
            </DialogDescription>
            <Button type="button" variant="ghost" size="sm" className="justify-self-start sm:hidden" onClick={toggleScale}>
              Effort: {scale === "rpe" ? "RPE" : "RIR"} · switch to {scale === "rpe" ? "RIR" : "RPE"}
            </Button>
            <div className="-mx-1.5 max-h-[55dvh] space-y-3 overflow-y-auto px-1.5 py-1.5 sm:space-y-2">
              <div className="hidden sm:grid sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 text-xs text-muted-foreground">
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
                <span className="w-[3.75rem]" />
              </div>
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="set-row"
                >
                  <div className="set-field">
                  <span className="set-label">Set {i + 1} · Type</span>
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
                  </div>
                  <label className="set-field"><span className="set-label">Weight (lb)</span>
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
                  </label>
                  <label className="set-field"><span className="set-label">Reps</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    aria-label={`Set ${i + 1} reps`}
                    placeholder={String(row.targetReps)}
                    value={row.reps}
                    onChange={(e) => patchRow(i, { reps: e.target.value })}
                  />
                  </label>
                  <div className="set-field">
                  <span className="set-label">{scale === "rpe" ? "RPE" : "RIR"} (optional)</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    aria-label={`Set ${i + 1} ${scale === "rpe" ? "RPE" : "RIR"}`}
                    value={row.rpeDisplay}
                    onChange={(e) => patchRow(i, { rpeDisplay: e.target.value })}
                  />
                  </div>
                  <div className="col-span-2 flex items-center justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      shape="circular"
                      title="Copy set above"
                      disabled={i === 0}
                      onClick={() => copyRowAbove(i)}
                    >
                      <Copy aria-hidden />
                      <span className="sr-only">Copy set above</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      shape="circular"
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
                <Plus aria-hidden /> Add Set
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={completeAllPlanned}
              >
                Fill In Planned Reps
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
                  {suggestion ? "Use Suggestion" : "Copy Last Time"}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent headerbar className="sm:max-w-sm" onCloseAutoFocus={(event) => { event.preventDefault(); menuRef.current?.focus(); }}>
          <form className="grid gap-5" onSubmit={submitEdit}>
            <DialogHeaderBar
              title="Edit Exercise"
              start={<DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>}
              end={<Button type="submit">Save</Button>}
            />
            <DialogDescription>
              Changes the plan. Sets you've already logged keep their values.
            </DialogDescription>
            <div className="boxed-list">
              <EntryRow label="Name" htmlFor="name-1">
                <Input id="name-1" name="name" defaultValue={name} required />
              </EntryRow>
              <EntryRow inline label="Weight" spin={{ step: 5, min: 0 }} unit="lb" htmlFor="weight-1">
                <Input
                  id="weight-1"
                  name="weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  defaultValue={weight ?? ""}
                />
              </EntryRow>
              <EntryRow inline label="Sets" spin={{ step: 1, min: 1 }} htmlFor="set-1">
                <Input
                  id="set-1"
                  name="sets"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  defaultValue={sets}
                  required
                />
              </EntryRow>
              <EntryRow inline label="Reps" spin={{ step: 1, min: 1 }} htmlFor="rep-1">
                <Input
                  id="rep-1"
                  name="reps"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  defaultValue={reps}
                  required
                />
              </EntryRow>
            </div>
            <div className="boxed-list">
              <EntryRow label="Notes (optional)" htmlFor="notes-1">
                <Input id="notes-1" name="notes" defaultValue={notes} />
              </EntryRow>
            </div>
          </form>
          </DialogContent>
      </Dialog>
      <OverflowMenu label={`Actions for ${name}`} triggerRef={menuRef} actions={[
        { label: "Edit Exercise", onSelect: () => setEditOpen(true) },
        "separator",
        { label: "Delete Exercise", onSelect: () => onDelete(id) },
      ]} />
      </div>
        </div>
      </motion.div>
    </div>
  );
};
