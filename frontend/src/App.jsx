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

const weights = [45, 35, 25, 10, 5, 2.5, 1, 0.5];

const App = () => {
  const [session, setNewSession] = useState([]);
  const [exercise, setNewExercise] = useState([]);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newSet, setNewSet] = useState("");
  const [newRep, setNewRep] = useState("");
  const [newNote, setNewNotes] = useState("");
  const [newDesiredWeight, setNewDesiredWeight] = useState("");
  const [newBarbellWeight, setNewBarbellWeight] = useState("");
  const [calculatedWeights, setNewCalculatedWeights] = useState([]);

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

  const handleDesiredWeightChange = (event) => {
    setNewDesiredWeight(event.target.value);
  }

  const handleBarbellWeightChange = (event) => {
    setNewBarbellWeight(event.target.value);
  }



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

  const showCalculatedPlates = () => {
    if (calculatedWeights.length === 0) {
      return <h1>Please input some values</h1>
    }
    return calculatedWeights.map((count, i) =>
      count !== 0 && <p key={i}>{count} × {weights[i]} lb</p>
    )
  }

  const calculatePlates = (event) => {
    event.preventDefault();

    let desiredWeight = newDesiredWeight;
    let barWeight = newBarbellWeight;
    desiredWeight -= barWeight;
    const results = [0, 0, 0, 0, 0, 0, 0, 0];

    let i = 0;
    while (desiredWeight != 0 && i < weights.length) {
      let tmp_val = Math.floor(desiredWeight / weights[i]);
      if (tmp_val >= 2) {
        if (tmp_val % 2 !== 0) {
          tmp_val -= 1;
        }
        results[i] = tmp_val;
        desiredWeight -= results[i] * weights[i];
      }
      i += 1;
    }

    setNewCalculatedWeights(results);
  }

  return (
    <>
    <div className="mx-auto max-w-2xl p-6 space-y-6">
        {showCalculatedPlates()}
        <h1 className="text-2xl font-semibold">Plate Calculator!</h1>
        <form onSubmit={calculatePlates} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="Desired Weight">Desired Weight</Label>
            <Input
              id = "Desired Weight"
              value={newDesiredWeight}
              onChange={handleDesiredWeightChange}
              required
            >
            </Input>
          </div>
          <div className="space-y-2">
            <Label htmlFor="Desired Weight">Barell Weight</Label>
            <Input
              id = "Barbell Weight"
              value={newBarbellWeight}
              onChange={handleBarbellWeightChange}
              required
            >
            </Input>
          </div>
          <Button type="submit">Calculate Weights</Button>
        </form>
    </div>
      
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
    </>
  );
};

export default App;
