import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Column } from "@/components/Column/Column";
import { DateNav } from "@/components/DateNav/DateNav";
import { WorkoutTimers } from "@/components/WorkoutTimers/WorkoutTimers";
import { SavedWorkouts } from "@/components/SavedWorkouts/SavedWorkouts";
import { AddExerciseDialog } from "@/components/AddExerciseDialog/AddExerciseDialog";
import { toDateKey } from "@/lib/dates";
import { getWorkoutsForDate, saveWorkoutsForDate } from "@/services/workouts";
import { useAuth } from "@/contexts/AuthContext";

export const WorkoutPage = () => {
  const [exercise, setExercise] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateKey = toDateKey(selectedDate);

  const { user } = useAuth();

  const loadedDateRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getWorkoutsForDate(dateKey).then((items) => {
      if (cancelled) return;
      setExercise(items);
      loadedDateRef.current = dateKey;
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey, user]);

  useEffect(() => {
    if (!user) return;
    if (loadedDateRef.current !== dateKey) return;
    saveWorkoutsForDate(dateKey, exercise);
  }, [exercise, dateKey, user]);

  const addExercise = (data) => {
    setExercise(
      exercise.concat({ id: crypto.randomUUID(), completedReps: [], ...data }),
    );
  };

  const loadTemplateIntoDay = (templateExercises) => {
    setExercise((prev) =>
      prev.concat(
        templateExercises.map((e) => ({
          id: crypto.randomUUID(),
          name: e.name,
          weight: e.weight ?? "",
          sets: e.sets,
          reps: e.reps,
          notes: e.notes ?? "",
          completedReps: [],
        })),
      ),
    );
  };

  const editExercise = (id, data) => {
    setExercise(exercise.map((e) => (e.id === id ? { ...e, ...data } : e)));
  };

  const deleteExercise = (id) => {
    const target = exercise.find((e) => e.id === id);

    if (window.confirm(`Delete ${target.name}?`)) {
      setExercise(exercise.filter((e) => e.id !== id));
    }
  };

  const getExercisePos = (id) =>
    exercise.findIndex((exercise) => exercise.id === id);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id === over.id) {
      return;
    }

    setExercise((exercise) => {
      const originalPos = getExercisePos(active.id);
      const newPos = getExercisePos(over.id);

      return arrayMove(exercise, originalPos, newPos);
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const showExercise = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Exercises</h2>
        <SavedWorkouts
          dayExercises={exercise}
          onLoadTemplate={loadTemplateIntoDay}
        />
      </div>
      {exercise.length > 0 ? (
        <DndContext
          sensors={sensors}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
        >
          <Column
            exercises={exercise}
            onDelete={deleteExercise}
            onEdit={editExercise}
          />
        </DndContext>
      ) : (
        <p className="text-sm text-muted-foreground">
          No exercises yet — add one below.
        </p>
      )}
      <AddExerciseDialog onAdd={addExercise} />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <DateNav selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <WorkoutTimers />
      {showExercise()}
    </div>
  );
};
