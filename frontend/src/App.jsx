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
import { Column } from "./components/Column/Column";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const App = () => {
  const [session, setNewSession] = useState([]);
  const [exercise, setNewExercise] = useState([]);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newSet, setNewSet] = useState("");
  const [newRep, setNewRep] = useState("");
  const [newNote, setNewNotes] = useState("");
  const idRef = useRef(1);
  const newId = () => idRef.current++;

  const addExercise = (event) => {
    event.preventDefault();

    const exerciseObject = {
      id: newId(),
      name: newName,
      weight: newWeight,
      sets: newSet,
      reps: newRep,
      notes: newNote,
      completedReps: []
    };

    setNewExercise(exercise.concat(exerciseObject));
    setNewName("");
    setNewWeight("");
    setNewSet("");
    setNewRep("");
    setNewNotes("");
  };

  const editExercise = (id, data) => {
    const target = exercise.find((e) => e.id === id);
    
    setNewExercise(exercise.map((e) => e.id === id ? {...e, ...data} : e));
  }

  const deleteExercise = (id) => {
    const target = exercise.find((e) => e.id === id);

    if (window.confirm(`Delete ${target.name}?`)) {
      setNewExercise(exercise.filter((e) => e.id !== id));
    }
  };

  const handleNameChange = (event) => {
    setNewName(event.target.value);
  };

  const handleWeightChange = (event) => {
    setNewWeight(event.target.value);
  };

  const handleSetChange = (event) => {
    setNewSet(event.target.value);
  };

  const handleRepChange = (event) => {
    setNewRep(event.target.value);
  };

  const handleNoteChange = (event) => {
    setNewNotes(event.target.value);
  };

  const getExercisePos = (id) =>
    exercise.findIndex((exercise) => exercise.id === id);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id === over.id) {
      return;
    }

    setNewExercise((exercise) => {
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

  const showExercise = () => {
    if (exercise.length === 0) {
      return <h1>No exercises found</h1>;
    }
    return (
      <ul>
        <h1>Today's workout</h1>
        <DndContext
          sensors={sensors}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
        >
          <Column exercises={exercise} onDelete={deleteExercise} onEdit={editExercise} />
        </DndContext>
      </ul>
    );
  };

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      {showExercise()}
      <h1 className="text-2xl font-semibold">Save an exercise!</h1>
      <form onSubmit={addExercise} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Workout Name</Label>
          <Input
            id="name"
            value={newName}
            onChange={handleNameChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <Input
            id="weight"
            type="number"
            min="0"
            step="0.5"
            value={newWeight}
            onChange={handleWeightChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sets">Set Amount</Label>
          <Input
            id="sets"
            type="number"
            min="1"
            value={newSet}
            onChange={handleSetChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reps">Target Rep Amount</Label>
          <Input
            id="reps"
            type="number"
            min="1"
            value={newRep}
            onChange={handleRepChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={newNote} onChange={handleNoteChange} />
        </div>
        <Button type="submit">Save Workout</Button>
      </form>
    </div>
  );
};

export default App;
