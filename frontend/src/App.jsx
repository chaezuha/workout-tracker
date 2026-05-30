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
import { Column } from "./Components/Column/Column";

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
    };

    setNewExercise(exercise.concat(exerciseObject));
    setNewName("");
    setNewWeight("");
    setNewSet("");
    setNewRep("");
    setNewNotes("");
  };

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
          <Column exercises={exercise} onDelete={deleteExercise} />
        </DndContext>
      </ul>
    );
  };

  return (
    <div>
      {showExercise()}
      <h1>Save an exercise!</h1>
      <form onSubmit={addExercise}>
        <div>
          Workout Name:{" "}
          <input value={newName} onChange={handleNameChange} required />
        </div>
        <div>
          Weight:{" "}
          <input
            type="number"
            min="0"
            step="0.5"
            value={newWeight}
            onChange={handleWeightChange}
          />
        </div>
        <div>
          Set Amount:{" "}
          <input
            type="number"
            min="1"
            value={newSet}
            onChange={handleSetChange}
            required
          />
        </div>
        <div>
          Target Rep Amount:{" "}
          <input
            type="number"
            min="1"
            value={newRep}
            onChange={handleRepChange}
            required
          />
        </div>
        <div>
          Notes: <input value={newNote} onChange={handleNoteChange} />
        </div>
        <div>
          <button type="submit">Save Workout</button>
        </div>
      </form>
      <div></div>
      <p></p>
    </div>
  );
};

export default App;
