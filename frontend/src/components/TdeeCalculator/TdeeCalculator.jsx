import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntryRow } from "@/components/ui/entry-row";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { toKg, toCm, calculateBmr, ACTIVITY_LEVELS } from "@/lib/bodyMetrics";

const units = [
  { id: "metric", label: "Metric" },
  { id: "imperial", label: "Imperial" },
];

const genders = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];

export const TdeeCalculator = () => {
  const [unit, setUnit] = useState("metric");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [bmr, setBmr] = useState(null);

  const calculate = (event) => {
    event.preventDefault();

    const weightKg = toKg(Number(weight), unit);
    const height = toCm(
      {
        cm: Number(heightCm),
        ft: Number(heightFt),
        inches: Number(heightIn),
      },
      unit,
    );
    setBmr(calculateBmr({ weightKg, heightCm: height, age: Number(age), gender }));
  };

  return (
    <>
      <form onSubmit={calculate} className="space-y-8">
        <section className="pref-group" aria-labelledby="tdee-about">
          <div className="group-header">
            <h2 id="tdee-about" className="group-title">About You</h2>
          </div>
          <div className="boxed-list">
            <div className="row flex-wrap">
              <span className="row-body">Units</span>
              <ToggleGroup label="Units" options={units} value={unit} onValueChange={setUnit} />
            </div>
            <div className="row flex-wrap">
              <span className="row-body">Sex</span>
              <ToggleGroup label="Sex" options={genders} value={gender} onValueChange={setGender} />
            </div>
            <EntryRow inline label="Age" htmlFor="tdee-age" unit="yr">
              <Input
                id="tdee-age"
                type="number"
                inputMode="numeric"
                min="1"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </EntryRow>
            <EntryRow inline label="Weight" htmlFor="tdee-weight" unit={unit === "metric" ? "kg" : "lb"}>
              <Input
                id="tdee-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </EntryRow>
            {unit === "metric" ? (
              <EntryRow inline label="Height" htmlFor="tdee-height-cm" unit="cm">
                <Input
                  id="tdee-height-cm"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  required
                />
              </EntryRow>
            ) : (
              <EntryRow inline label="Height" htmlFor="tdee-height-ft" unit="in">
                <Input
                  id="tdee-height-ft"
                  aria-label="Height, feet"
                  style={{ width: "3.75rem" }}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  required
                />
                <span className="text-sm text-muted-foreground">ft</span>
                <Input
                  aria-label="Height, inches"
                  style={{ width: "3.75rem" }}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="11"
                  step="any"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  required
                />
              </EntryRow>
            )}
          </div>
        </section>
        <div className="flex justify-center">
          <Button type="submit" size="pill">Calculate</Button>
        </div>
      </form>
      {bmr !== null && (
        <section className="pref-group" aria-labelledby="tdee-result">
          <div className="group-header">
            <h2 id="tdee-result" className="group-title">Daily Calories</h2>
          </div>
          <div className="boxed-list">
            <div className="row py-3">
              <div className="row-body">
                <span className="title-1 numeric">{Math.round(bmr)} kcal</span>
                <span className="row-subtitle">BMR, burned at rest</span>
              </div>
            </div>
            {ACTIVITY_LEVELS.map(({ id, label, multiplier }) => (
              <div key={id} className="row">
                <span className="row-body">{label}</span>
                <span className="font-bold numeric">{Math.round(bmr * multiplier)} kcal</span>
              </div>
            ))}
          </div>
          <p className="group-description px-0.5">
            Estimated with the Mifflin-St Jeor formula. A good rule of thumb, but
            not exact for everyone.
          </p>
        </section>
      )}
    </>
  );
};
