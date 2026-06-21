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
import { DateNav } from "./components/DateNav/DateNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toDateKey, formatFriendly } from "@/lib/dates";
import { getWorkoutsForDate, saveWorkoutsForDate } from "@/services/workouts";

const weights = [45, 35, 25, 10, 5, 2.5, 1, 0.5];

const App = () => {
  const [exercise, setExercise] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateKey = toDateKey(selectedDate);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [notes, setNotes] = useState("");
  const [desiredWeight, setDesiredWeight] = useState("");
  const [barbellWeight, setBarbellWeight] = useState("45");
  const [calculatedPlates, setCalculatedPlates] = useState([]);
  const [plateCounts, setPlateCounts] = useState(Array(weights.length).fill(""));
  const [plateBarbellWeight, setPlateBarbellWeight] = useState("45");
  const [calculatedWeight, setCalculatedWeight] = useState(0);


  const loadedDateRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getWorkoutsForDate(dateKey).then((items) => {
      if (cancelled) return;
      setExercise(items);
      loadedDateRef.current = dateKey;
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  useEffect(() => {
    if (loadedDateRef.current !== dateKey) return;
    saveWorkoutsForDate(dateKey, exercise);
  }, [exercise, dateKey]);

  const addExercise = (event) => {
    event.preventDefault();

    const exerciseObject = {
      id: crypto.randomUUID(),
      name,
      weight,
      sets,
      reps,
      notes,
      completedReps: []
    };

    setExercise(exercise.concat(exerciseObject));
    setName("");
    setWeight("");
    setSets("");
    setReps("");
    setNotes("");
  };

  const editExercise = (id, data) => {
    setExercise(exercise.map((e) => e.id === id ? {...e, ...data} : e));
  }

  const deleteExercise = (id) => {
    const target = exercise.find((e) => e.id === id);

    if (window.confirm(`Delete ${target.name}?`)) {
      setExercise(exercise.filter((e) => e.id !== id));
    }
  };

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handleWeightChange = (event) => {
    setWeight(event.target.value);
  };

  const handleSetChange = (event) => {
    setSets(event.target.value);
  };

  const handleRepChange = (event) => {
    setReps(event.target.value);
  };

  const handleNoteChange = (event) => {
    setNotes(event.target.value);
  };

  const handleDesiredWeightChange = (event) => {
    setDesiredWeight(event.target.value);
  }

  const handleBarbellWeightChange = (event) => {
    setBarbellWeight(event.target.value);
  }

  const handlePlateBarbellWeightChange = (event) => {
    setPlateBarbellWeight(event.target.value);
  }

  const handlePlateCountChange = (i) => (event) => {
    setPlateCounts(plateCounts.map((c, j) => j === i ? event.target.value : c));
  }



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

  const showExercise = () => {
    if (exercise.length === 0) {
      return <h1>No exercises for {formatFriendly(selectedDate)}</h1>;
    }
    return (
      <ul>
        <h1>{formatFriendly(selectedDate)}'s workout</h1>
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
    if (calculatedPlates.length === 0) {
      return <h1>Please input some values</h1>
    }
    return calculatedPlates.map((count, i) =>
      count !== 0 && <p key={i}>{count} × {weights[i]} lb</p>
    )
  }

  const calculatePlates = (event) => {
    event.preventDefault();

    let remaining = desiredWeight - barbellWeight;
    const results = [0, 0, 0, 0, 0, 0, 0, 0];

    let i = 0;
    while (remaining != 0 && i < weights.length) {
      let tmp_val = Math.floor(remaining / weights[i]);
      if (tmp_val >= 2) {
        if (tmp_val % 2 !== 0) {
          tmp_val -= 1;
        }
        results[i] = tmp_val;
        remaining -= results[i] * weights[i];
      }
      i += 1;
    }

    setCalculatedPlates(results);
  }

  const calculateWeight = (event) => {
    event.preventDefault();

    let temp_weight = Number(plateBarbellWeight) || 0;
    for (let i = 0; i < plateCounts.length; i++) {
      temp_weight += (Number(plateCounts[i]) || 0) * weights[i];
    }

    setCalculatedWeight(temp_weight)
  }

  const showCalculatedWeight = () => {
    if (calculatedWeight === 0) {
      return <h1>Please input some values</h1>
    }
    return <p>{calculatedWeight} lb</p>
  }

  return (
    <>
    <div className="mx-auto max-w-2xl p-6 space-y-6">
        {showCalculatedWeight()}
        <h1 className="text-2xl font-semibold">Plate to Weights!</h1>
        <form onSubmit={calculateWeight} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plate-barbell-weight">Barbell Weight</Label>
            <Input
              id="plate-barbell-weight"
              type="number"
              min="0"
              value={plateBarbellWeight}
              onChange={handlePlateBarbellWeightChange}
            />
          </div>
          {weights.map((w, i) => (
            <div key={w} className="space-y-2">
              <Label htmlFor={`plate-${w}`}>{w} lb plates</Label>
              <Input
                id={`plate-${w}`}
                type="number"
                min="0"
                value={plateCounts[i]}
                onChange={handlePlateCountChange(i)}
              />
            </div>
          ))}
          <Button type="submit">Calculate Weight</Button>
        </form>
    </div>
    <div className="mx-auto max-w-2xl p-6 space-y-6">
        {showCalculatedPlates()}
        <h1 className="text-2xl font-semibold">Weight to Plates!</h1>
        <form onSubmit={calculatePlates} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="Desired Weight">Desired Weight</Label>
            <Input
              id = "Desired Weight"
              value={desiredWeight}
              onChange={handleDesiredWeightChange}
              required
            >
            </Input>
          </div>
          <div className="space-y-2">
            <Label htmlFor="Desired Weight">Barell Weight</Label>
            <Input
              id = "Barbell Weight"
              value={barbellWeight}
              onChange={handleBarbellWeightChange}
              required
            >
            </Input>
          </div>
          <Button type="submit">Calculate Weights</Button>
        </form>
    </div>

      
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <DateNav selectedDate={selectedDate} onDateChange={setSelectedDate} />
      {showExercise()}
      <h1 className="text-2xl font-semibold">Save an exercise!</h1>
      <form onSubmit={addExercise} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Workout Name</Label>
          <Input
            id="name"
            value={name}
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
            value={weight}
            onChange={handleWeightChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sets">Set Amount</Label>
          <Input
            id="sets"
            type="number"
            min="1"
            value={sets}
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
            value={reps}
            onChange={handleRepChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={handleNoteChange} />
        </div>
        <Button type="submit">Save Workout</Button>
      </form>
    </div>
    </>
  );
};

export default App;
