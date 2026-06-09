import React from "react";
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

export const Exercise = ({ id, name, weight, sets, reps, notes, onDelete, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => {}}
        onPointerDown={(e) => e.stopPropagation()}
      >
        Reps
      </Button>
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
