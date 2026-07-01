import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const updateRow = (key, field, value) => {
    setRows(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
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
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{initialName ? "Edit workout" : "New workout"}</DialogTitle>
        <DialogDescription>
          Name your workout and add its exercises
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <Label htmlFor="template-name">Workout Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        {rows.map((row, i) => (
          <div key={row.key} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Exercise {i + 1}</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeRow(row.key)}
              >
                Remove
              </Button>
            </div>
            <Field>
              <Label htmlFor={`ex-name-${row.key}`}>Name</Label>
              <Input
                id={`ex-name-${row.key}`}
                value={row.name}
                onChange={(e) => updateRow(row.key, "name", e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor={`ex-weight-${row.key}`}>Weight</Label>
              <Input
                id={`ex-weight-${row.key}`}
                type="number"
                min="0"
                step="0.5"
                value={row.weight}
                onChange={(e) => updateRow(row.key, "weight", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor={`ex-sets-${row.key}`}>Sets</Label>
              <Input
                id={`ex-sets-${row.key}`}
                type="number"
                min="1"
                value={row.sets}
                onChange={(e) => updateRow(row.key, "sets", e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor={`ex-reps-${row.key}`}>Reps</Label>
              <Input
                id={`ex-reps-${row.key}`}
                type="number"
                min="1"
                value={row.reps}
                onChange={(e) => updateRow(row.key, "reps", e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor={`ex-notes-${row.key}`}>Notes</Label>
              <Input
                id={`ex-notes-${row.key}`}
                value={row.notes}
                onChange={(e) => updateRow(row.key, "notes", e.target.value)}
              />
            </Field>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setRows(rows.concat(emptyRow()))}>
          Add exercise
        </Button>
      </FieldGroup>
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={name.trim() === "" || rows.length === 0}>
          Save Workout
        </Button>
      </DialogFooter>
    </form>
  );
};
