import React, { useState } from "react";
import "./Exercise.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

export const Exercise = ({ id, name, weight, sets, reps, notes, completedReps, onDelete, onEdit }) => {
  const [inputReps, setNewReps] = useState(completedReps ?? []);

  const { attributes, listeners, setNodeRef, transform, transition } =
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
    <div ref={setNodeRef} style={style} {...attributes} className="exercise">
      <div
        {...listeners}
        className="text-2xl px-2 cursor-grab active:cursor-grabbing select-none text-muted-foreground hover:text-foreground"
      >
        ⠿
      </div>
      <div className="space-y-1">
        <div className="font-semibold">{name}</div>
        <div className="text-sm text-muted-foreground">Weight: {weight}</div>
        <div className="text-sm text-muted-foreground">Sets: {sets}</div>
        <div className="text-sm text-muted-foreground">Reps: {reps}</div>
        {notes && (
          <div className="text-sm text-muted-foreground">Notes: {notes}</div>
        )}
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Reps</Button>
        </DialogTrigger>
        <DialogContent className = "sm:max-w-sm">
          <form onSubmit={(e) => {
            e.preventDefault();
            onEdit(id, {completedReps: inputReps});
          }}>
            <DialogHeader>
              <DialogTitle>Edit Reps</DialogTitle>
              <DialogDescription>
                Count the amount of reps per set
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              {renderReps()}
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Reps</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Edit</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
          <form onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            onEdit(id, data);
          }}>
            <DialogHeader>
              <DialogTitle>Edit Mode</DialogTitle>
              <DialogDescription>
                Make changes to your exercise
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
              <Button type="submit"> Save changes</Button>
            </DialogFooter>
          </form>
          </DialogContent>
      </Dialog>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => onDelete(id)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        Delete
      </Button>
    </div>
  );
};
