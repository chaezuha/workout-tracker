import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "motion/react";
import { Exercise } from "../../Exercise/Exercise";
export const Column = ({ exercises, celebratingId, lastResults, onDelete, onEdit }) => {
  return (
    <div className="flex flex-col gap-3">
      <SortableContext
        items={exercises.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <AnimatePresence initial={false}>
          {exercises.map((exercise) => (
            <Exercise
              id={exercise.id}
              name={exercise.name}
              weight={exercise.weight}
              sets={exercise.sets}
              reps={exercise.reps}
              notes={exercise.notes}
              completedReps={exercise.completedReps}
              setEntries={exercise.setEntries}
              lastResult={lastResults?.get(
                (exercise.name ?? "").trim().toLowerCase(),
              )}
              celebrating={exercise.id === celebratingId}
              key={exercise.id}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </AnimatePresence>
      </SortableContext>
    </div>
  );
};
