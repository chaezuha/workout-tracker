import { useEffect, useState } from "react";
import { Plus, Trash } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ExerciseNameAutocomplete } from "@/components/ExerciseNameAutocomplete/ExerciseNameAutocomplete";
import { getExerciseSuggestions } from "@/services/exercises";
import {
  DialogHeaderBar,
} from "@/components/ui/dialog";
import { EntryRow } from "@/components/ui/entry-row";
import { Input } from "@/components/ui/input";

const emptyRow = () => ({
  key: crypto.randomUUID(),
  name: "",
  weight: "",
  sets: "",
  reps: "",
  notes: "",
});

export const TemplateEditor = ({
  initialName = "",
  initialExercises = [],
  error,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialName);
  const [rows, setRows] = useState(() =>
    initialExercises.length
      ? initialExercises.map((e) => ({
          key: crypto.randomUUID(),
          name: e.name ?? "",
          weight: e.weight ?? "",
          sets: e.sets ?? "",
          reps: e.reps ?? "",
          notes: e.notes ?? "",
        }))
      : [emptyRow()]
  );

  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    getExerciseSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, []);

  const updateRow = (key, field, value) => {
    setRows(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const fillRowFromSuggestion = (key, s) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              name: s.name,
              weight: s.weight === "" ? "" : String(s.weight),
              sets: String(s.sets ?? ""),
              reps: String(s.reps ?? ""),
            }
          : r
      )
    );
  };

  const removeRow = (key) => {
    setRows(rows.filter((r) => r.key !== key));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSave(
      name.trim(),
      rows.map((r) => ({
        name: r.name,
        weight: r.weight === "" ? null : Number(r.weight),
        sets: Number(r.sets),
        reps: Number(r.reps),
        notes: r.notes ?? "",
      }))
    );
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <DialogHeaderBar
        title={initialName ? "Edit Workout" : "New Workout"}
        start={<Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        end={<Button type="submit" disabled={name.trim() === "" || rows.length === 0}>Save</Button>}
      />
      <div className="boxed-list">
        <EntryRow label="Workout name" htmlFor="template-name">
          <Input
            autoFocus
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </EntryRow>
      </div>
      {rows.map((row, i) => (
        <section key={row.key} className="pref-group" aria-label={`Exercise ${i + 1}`}>
          <div className="group-header items-center">
            <h3 className="group-title">Exercise {i + 1}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              shape="circular"
              aria-label={`Remove exercise ${i + 1}`}
              className="hover:text-destructive"
              onClick={() => removeRow(row.key)}
            >
              <Trash aria-hidden />
            </Button>
          </div>
          <div className="boxed-list">
            <EntryRow label="Name" htmlFor={`ex-name-${row.key}`}>
              <ExerciseNameAutocomplete
                id={`ex-name-${row.key}`}
                value={row.name}
                onChange={(value) => updateRow(row.key, "name", value)}
                suggestions={suggestions}
                onSelect={(s) => fillRowFromSuggestion(row.key, s)}
                required
              />
            </EntryRow>
            <EntryRow inline label="Weight" spin={{ step: 5, min: 0 }} unit="lb" htmlFor={`ex-weight-${row.key}`}>
              <Input
                id={`ex-weight-${row.key}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={row.weight}
                onChange={(e) => updateRow(row.key, "weight", e.target.value)}
              />
            </EntryRow>
            <EntryRow inline label="Sets" spin={{ step: 1, min: 1 }} htmlFor={`ex-sets-${row.key}`}>
              <Input
                id={`ex-sets-${row.key}`}
                type="number"
                inputMode="numeric"
                min="1"
                value={row.sets}
                onChange={(e) => updateRow(row.key, "sets", e.target.value)}
                required
              />
            </EntryRow>
            <EntryRow inline label="Reps" spin={{ step: 1, min: 1 }} htmlFor={`ex-reps-${row.key}`}>
              <Input
                id={`ex-reps-${row.key}`}
                type="number"
                inputMode="numeric"
                min="1"
                value={row.reps}
                onChange={(e) => updateRow(row.key, "reps", e.target.value)}
                required
              />
            </EntryRow>
            <EntryRow label="Notes (optional)" htmlFor={`ex-notes-${row.key}`}>
              <Input
                id={`ex-notes-${row.key}`}
                value={row.notes}
                onChange={(e) => updateRow(row.key, "notes", e.target.value)}
              />
            </EntryRow>
          </div>
        </section>
      ))}
      <div className="boxed-list">
        <button type="button" className="row row-activatable justify-center gap-2 font-bold text-accent-text" onClick={() => setRows(rows.concat(emptyRow()))}>
          <Plus className="size-4" aria-hidden /> Add Exercise
        </button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
};
