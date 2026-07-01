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
import { WorkoutTimers } from "./components/WorkoutTimers/WorkoutTimers";
import { SavedWorkouts } from "./components/SavedWorkouts/SavedWorkouts";
import { CheckinCalendar } from "./components/CheckinCalendar/CheckinCalendar";
import { AddExerciseDialog } from "./components/AddExerciseDialog/AddExerciseDialog";
import { PlateSelector } from "./components/PlateSelector/PlateSelector";
import { calculatePlateBreakdown } from "@/lib/plates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toDateKey, formatFriendly } from "@/lib/dates";
import { getWorkoutsForDate, saveWorkoutsForDate } from "@/services/workouts";
import { useAuth } from "@/contexts/AuthContext";
import { AuthForm } from "@/components/Auth/AuthForm";

const weights = [45, 35, 25, 10, 5, 2.5, 1, 0.5];

const App = () => {
  const [exercise, setExercise] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateKey = toDateKey(selectedDate);
  const [desiredWeight, setDesiredWeight] = useState("");
  const [barbellWeight, setBarbellWeight] = useState("45");
  const [calculatedPlates, setCalculatedPlates] = useState([]);
  const [plateCounts, setPlateCounts] = useState(
    Array(weights.length).fill(""),
  );
  const [plateBarbellWeight, setPlateBarbellWeight] = useState("45");
  const [selectedPlates, setSelectedPlates] = useState([45, 35, 25, 10, 5, 2.5]);
  const [roundMode, setRoundMode] = useState("up");
  const [calcMode, setCalcMode] = useState("plateToWeight");
  const [plateCalcSummary, setPlateCalcSummary] = useState(null);
  const [calculatedWeight, setCalculatedWeight] = useState(0);

  const { user, loading, signOut } = useAuth();

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

  const handleDesiredWeightChange = (event) => {
    setDesiredWeight(event.target.value);
  };

  const handleBarbellWeightChange = (event) => {
    setBarbellWeight(event.target.value);
  };

  const handlePlateBarbellWeightChange = (event) => {
    setPlateBarbellWeight(event.target.value);
  };

  const handlePlateCountChange = (i) => (event) => {
    setPlateCounts(
      plateCounts.map((c, j) => (j === i ? event.target.value : c)),
    );
  };

  const togglePlate = (w) => {
    if (selectedPlates.includes(w)) {
      setSelectedPlates(selectedPlates.filter((p) => p !== w));
      // clear the count so a hidden input can't silently affect the total
      const i = weights.indexOf(w);
      setPlateCounts(plateCounts.map((c, j) => (j === i ? "" : c)));
    } else {
      setSelectedPlates(selectedPlates.concat(w));
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
      <h1>{formatFriendly(selectedDate)}'s workout</h1>
      {exercise.length > 0 && (
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
      )}
      <AddExerciseDialog onAdd={addExercise} />
    </div>
  );

  const showCalculatedPlates = () => {
    if (!plateCalcSummary) {
      return <h1>Please input some values</h1>;
    }
    if (plateCalcSummary.error === "barbell") {
      return (
        <p className="text-destructive text-sm">
          The barbell alone is heavier than the desired weight.
        </p>
      );
    }
    if (plateCalcSummary.error === "noPlates") {
      return (
        <p className="text-destructive text-sm">
          Select some plates to load the bar.
        </p>
      );
    }
    return (
      <div className="space-y-1">
        {plateCalcSummary.exact ? (
          <p className="font-medium">Total: {plateCalcSummary.total} lb</p>
        ) : (
          <p className="text-sm text-amber-600">
            Can't hit {plateCalcSummary.desired} lb exactly with the selected
            plates — rounded {plateCalcSummary.mode} to {plateCalcSummary.total}{" "}
            lb.
          </p>
        )}
        {calculatedPlates.map(
          (count, i) =>
            count !== 0 && (
              <p key={i}>
                {count} × {weights[i]} lb
              </p>
            ),
        )}
      </div>
    );
  };

  const calculatePlates = (event) => {
    event.preventDefault();

    const desired = Number(desiredWeight);
    const barbell = Number(barbellWeight);
    const target = desired - barbell;

    if (target < 0) {
      setCalculatedPlates([]);
      setPlateCalcSummary({ error: "barbell" });
      return;
    }
    if (selectedPlates.length === 0 && target > 0) {
      setCalculatedPlates([]);
      setPlateCalcSummary({ error: "noPlates" });
      return;
    }

    const { counts, achieved, exact } = calculatePlateBreakdown(
      target,
      selectedPlates,
      roundMode,
    );
    setCalculatedPlates(weights.map((w) => counts[w] ?? 0));
    setPlateCalcSummary({
      desired,
      total: achieved + barbell,
      exact,
      mode: roundMode,
    });
  };

  const calculateWeight = (event) => {
    event.preventDefault();

    let temp_weight = Number(plateBarbellWeight) || 0;
    for (let i = 0; i < plateCounts.length; i++) {
      if (!selectedPlates.includes(weights[i])) continue;
      temp_weight += (Number(plateCounts[i]) || 0) * weights[i];
    }

    setCalculatedWeight(temp_weight);
  };

  const showCalculatedWeight = () => {
    if (calculatedWeight === 0) {
      return <h1>Please input some values</h1>;
    }
    return <p>{calculatedWeight} lb</p>;
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <>
      <div className="mx-auto max-w-2xl p-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <Button type="button" variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        <CheckinCalendar />
      </div>
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={calcMode === "plateToWeight" ? "default" : "outline"}
            onClick={() => setCalcMode("plateToWeight")}
          >
            Plates to Weight
          </Button>
          <Button
            type="button"
            variant={calcMode === "weightToPlate" ? "default" : "outline"}
            onClick={() => setCalcMode("weightToPlate")}
          >
            Weight to Plates
          </Button>
        </div>
        {calcMode === "plateToWeight" ? (
          <>
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
          <PlateSelector
            weights={weights}
            selected={selectedPlates}
            onToggle={togglePlate}
          />
          <div className="grid grid-cols-3 gap-3">
            {weights.map(
              (w, i) =>
                selectedPlates.includes(w) && (
                  <div key={w} className="space-y-2">
                    <Label htmlFor={`plate-${w}`}>{w} lb</Label>
                    <Input
                      id={`plate-${w}`}
                      type="number"
                      min="0"
                      value={plateCounts[i]}
                      onChange={handlePlateCountChange(i)}
                    />
                  </div>
                ),
            )}
          </div>
          <Button type="submit">Calculate Weight</Button>
        </form>
          </>
        ) : (
          <>
        {showCalculatedPlates()}
        <h1 className="text-2xl font-semibold">Weight to Plates!</h1>
        <form onSubmit={calculatePlates} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="Desired Weight">Desired Weight</Label>
            <Input
              id="Desired Weight"
              value={desiredWeight}
              onChange={handleDesiredWeightChange}
              required
            ></Input>
          </div>
          <div className="space-y-2">
            <Label htmlFor="Desired Weight">Barell Weight</Label>
            <Input
              id="Barbell Weight"
              value={barbellWeight}
              onChange={handleBarbellWeightChange}
              required
            ></Input>
          </div>
          <PlateSelector
            weights={weights}
            selected={selectedPlates}
            onToggle={togglePlate}
          />
          <div className="space-y-2">
            <Label>If the exact weight isn't possible</Label>
            <div className="flex gap-2">
              {["up", "down"].map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={roundMode === m ? "default" : "outline"}
                  onClick={() => setRoundMode(m)}
                >
                  Round {m}
                </Button>
              ))}
            </div>
          </div>
          <Button type="submit">Calculate Weights</Button>
        </form>
          </>
        )}
      </div>

      <div className="mx-auto max-w-2xl p-6 space-y-6">
        <DateNav selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <SavedWorkouts
          dayExercises={exercise}
          onLoadTemplate={loadTemplateIntoDay}
        />
        <WorkoutTimers />
        {showExercise()}
      </div>
    </>
  );
};

export default App;
