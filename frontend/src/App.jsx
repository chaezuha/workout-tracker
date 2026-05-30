import { useState, useEffect } from "react";

const App = () => {
  const [session, setNewSession] = useState([]);
  const [exercise, setNewExercise] = useState([]);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newSet, setNewSet] = useState("");
  const [newRep, setNewRep] = useState("");
  const [newNote, setNewNotes] = useState("");
  const [id, setId] = useState(0);

  const addExercise = (event) => {
    event.preventDefault();

    const exerciseObject = {
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

  const showExercise = () => {
    if (exercise.length === 0) {
      return <h1>No exercises found</h1>;
    }
    return (
      <ul>
        <h1>Today's workout</h1>
        {exercise.map((w) => (
          <li key={w.name}>
            <div>
              <div>Workout: {w.name}</div>
              <div>Weight: {w.weight}</div>
              <div>Sets: {w.sets}</div>
              <div>Reps: {w.reps}</div>
              {w.notes.length !== 0 && <div>Notes: {w.notes}</div>}
            </div>
          </li>
        ))}
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
