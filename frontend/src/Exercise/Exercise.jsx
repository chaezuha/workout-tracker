import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { loggedReps } from "@/services/stats";
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

export const Exercise = ({ id, name, weight, sets, reps, notes, completedReps, celebrating, onDelete, onEdit }) => {
  const [inputReps, setNewReps] = useState(completedReps ?? []);
  const [repsOpen, setRepsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    if (!justLogged) return;
    const t = setTimeout(() => setJustLogged(false), 900);
    return () => clearTimeout(t);
  }, [justLogged]);

  const loggedCount = loggedReps({ sets, completedReps }).length;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  function renderReps() {
    const inputs = [];
    const setCount = Number(sets);

    for (let i = 0; i < setCount; i++) {
      inputs.push(
        <Field key={i}>
          <Label>Set {i + 1}</Label>
          <Input
            type="number"
            placeholder="Input reps"
            value={inputReps[i] || ""}
            onChange={(e) => handleRepChange(i, e.target.value)}
          />
        </Field>
      )
    }
    return inputs;
  }

  function handleRepChange(i, newValue) {
    const next = inputReps.slice();
    next[i] = newValue;
    setNewReps(next);
  }

  return (
    // The outer div belongs to dnd-kit (its inline transform must not be
    // animated by motion); the motion wrapper only animates enter/exit.
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={isDragging ? "relative z-10 touch-none" : "touch-none"}
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
      <div
        {...listeners}
        className="text-2xl px-2 cursor-grab active:cursor-grabbing select-none text-muted-foreground hover:text-foreground"
      >
        ⠿
      </div>
      <div className="min-w-0 space-y-1">
        <div className="font-medium">{name}</div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {weight ? `${weight} lb · ` : ""}
            {sets} sets × {reps} reps
          </span>
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
      </div>
      <div className="ml-auto flex gap-2">
      <Dialog open={repsOpen} onOpenChange={setRepsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Reps</Button>
        </DialogTrigger>
        <DialogContent className = "sm:max-w-sm">
          <form className="grid gap-4" onSubmit={(e) => {
            e.preventDefault();
            onEdit(id, {completedReps: inputReps});
            setRepsOpen(false);
            setJustLogged(true);
          }}>
            <DialogHeader>
              <DialogTitle>Log reps</DialogTitle>
              <DialogDescription>
                Record the reps you completed for each set
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="max-h-[55vh] overflow-y-auto">
              {renderReps()}
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save reps</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Edit</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
          <form className="grid gap-4" onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            onEdit(id, data);
            setEditOpen(false);
          }}>
            <DialogHeader>
              <DialogTitle>Edit exercise</DialogTitle>
              <DialogDescription>
                Update the details for this exercise
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label htmlFor="name-1">Name</Label>
                <Input id="name-1" name="name" defaultValue={name} />
              </Field>
              <Field>
                <Label htmlFor="weight-1">Weight</Label>
                <Input id="weight-1" name="weight" defaultValue={weight} />
              </Field>
              <Field>
                <Label htmlFor="set-1">Sets</Label>
                <Input id="set-1" name="sets" defaultValue={sets} />
              </Field>
              <Field>
                <Label htmlFor="rep-1">Reps</Label>
                <Input id="rep-1" name="reps" defaultValue={reps} />
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
