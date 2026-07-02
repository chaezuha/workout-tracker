import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Exercise } from "../../Exercise/Exercise";
export const Column = ({ exercises, onDelete, onEdit }) => {
  return (
    <div className="flex flex-col gap-3">
      <SortableContext
        items={exercises.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        {exercises.map((exercise) => (
          <Exercise
            id={exercise.id}
            name={exercise.name}
            weight={exercise.weight}
            sets={exercise.sets}
            reps={exercise.reps}
            notes={exercise.notes}
            completedReps={exercise.completedReps}
            key={exercise.id}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </SortableContext>
    </div>
  );
};
