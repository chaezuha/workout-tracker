import { useState, useEffect } from "react";

const App = () => {
  const [session, setNewSession] = useState([]);
  const [workout, setNewWorkout] = useState([]);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newSet, setNewSet] = useState("");
  const [newRep, setNewRep] = useState("");
  const [newNote, setNewNotes] = useState("");

  const addWorkout = (event) => {
    event.preventDefault();

    const workoutObject = {
      name: newName,
      weight: newWeight,
      sets: newSet,
      reps: newRep,
      notes: newNote,
    };

    setNewWorkout(workout.concat(workoutObject));
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

  return (
    <div>
      <h1>Save today's workout</h1>
      <ul>
        {workout.map((w) => (
          <ul key={w.name}>
            <div>Workout: {w.name}</div>
            <div>Weight: {w.weight}</div>
            <div>Sets: {w.sets}</div>
            <div>Notes: {w.notes}</div>
          </ul>
        ))}
      </ul>
      <form onSubmit={addWorkout}>
        <div>
          Workout Name: <input value={newName} onChange={handleNameChange} />
        </div>
        <div>
          Weight: <input value={newWeight} onChange={handleWeightChange} />
        </div>
        <div>
          Set Amount: <input value={newSet} onChange={handleSetChange} />
        </div>
        <div>
          Target Rep Amount: <input value={newRep} onChange={handleRepChange} />
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
