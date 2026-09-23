import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseNameAutocomplete } from "@/components/ExerciseNameAutocomplete/ExerciseNameAutocomplete";
import { getExerciseSuggestions } from "@/services/exercises";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntryRow } from "@/components/ui/entry-row";
import { Input } from "@/components/ui/input";

// trigger="row" is the last row of a session's boxed list; "pill" is the
// empty-day status page button.
export const AddExerciseDialog = ({ onAdd, trigger = "row" }) => {
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
        {trigger === "pill" ? (
          <Button type="button" size="pill">
            <Plus aria-hidden /> Add Exercise
          </Button>
        ) : (
          <button type="button" className="row row-activatable justify-center gap-2 font-bold text-accent-text">
            <Plus className="size-4" aria-hidden /> Add Exercise
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <div className="boxed-list">
            <EntryRow label="Name" htmlFor="add-name">
              <ExerciseNameAutocomplete
                id="add-name"
                value={name}
                onChange={setName}
                suggestions={suggestions}
                onSelect={handleSelectSuggestion}
                required
              />
            </EntryRow>
            <EntryRow inline label="Weight" htmlFor="add-weight" unit="lb">
              <Input
                id="add-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </EntryRow>
            <EntryRow inline label="Sets" htmlFor="add-sets">
              <Input
                id="add-sets"
                type="number"
                inputMode="numeric"
                min="1"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                required
              />
            </EntryRow>
            <EntryRow inline label="Reps" htmlFor="add-reps">
              <Input
                id="add-reps"
                type="number"
                inputMode="numeric"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                required
              />
            </EntryRow>
          </div>
          <div className="boxed-list">
            <EntryRow label="Notes (optional)" htmlFor="add-notes">
              <Input
                id="add-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </EntryRow>
          </div>
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
