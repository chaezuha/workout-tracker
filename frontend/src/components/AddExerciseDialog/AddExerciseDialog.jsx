import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseNameAutocomplete } from "@/components/ExerciseNameAutocomplete/ExerciseNameAutocomplete";
import { getExerciseSuggestions } from "@/services/exercises";
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

export const AddExerciseDialog = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!open) return;
    getExerciseSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [open]);

  const handleSelectSuggestion = (s) => {
    setWeight(s.weight === "" ? "" : String(s.weight));
    setSets(String(s.sets ?? ""));
    setReps(String(s.reps ?? ""));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onAdd({ name, weight, sets, reps, notes });
    setName("");
    setWeight("");
    setSets("");
    setReps("");
    setNotes("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full rounded-xl border border-dashed border-muted-foreground/40 p-3 text-sm text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
        >
          + Add exercise
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add exercise</DialogTitle>
            <DialogDescription>
              Add an exercise to this day's workout
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="add-name">Name</Label>
              <ExerciseNameAutocomplete
                id="add-name"
                value={name}
                onChange={setName}
                suggestions={suggestions}
                onSelect={handleSelectSuggestion}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="add-weight">Weight</Label>
              <Input
                id="add-weight"
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="add-sets">Sets</Label>
              <Input
                id="add-sets"
                type="number"
                min="1"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="add-reps">Reps</Label>
              <Input
                id="add-reps"
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="add-notes">Notes</Label>
              <Input
                id="add-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
