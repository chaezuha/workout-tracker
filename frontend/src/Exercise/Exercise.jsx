import React from "react";
import "./Exercise.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
export const Exercise = ({ id, name, weight, sets, reps, notes, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="exercise"
    >
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => {}}
        onPointerDown={(e) => e.stopPropagation()}
      >
        Edit
      </Button>
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
