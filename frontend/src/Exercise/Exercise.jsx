import React from "react";
import "./Exercise.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
      <ul>
        <div>Name: {name}</div>
        <div>Weight: {weight}</div>
        <div>Sets: {sets}</div>
        <div>Reps: {reps}</div>
        <div>Notes:{notes}</div>
      </ul>
      <input
        type="button"
        value="Delete"
        onClick={() => onDelete(id)}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
};
