import { useState } from "react";
import { Check } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntryRow } from "@/components/ui/entry-row";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { toKg, toCm, calculateBmi, bmiCategory } from "@/lib/bodyMetrics";

const units = [
  { id: "metric", label: "Metric" },
  { id: "imperial", label: "Imperial" },
];

const ranges = [
  { label: "Underweight", range: "below 18.5" },
  { label: "Healthy", range: "18.5 – 24.9" },
  { label: "Overweight", range: "25 – 29.9" },
  { label: "Obesity", range: "30 and above" },
];

export const BmiCalculator = () => {
  const [unit, setUnit] = useState("metric");
  const [weight, setWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [bmi, setBmi] = useState(null);

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
    setBmi(calculateBmi(weightKg, height));
  };

  return (
    <>
      <form onSubmit={calculate} className="space-y-8">
        <section className="pref-group" aria-labelledby="bmi-body">
          <div className="group-header">
            <h2 id="bmi-body" className="group-title">Height and Weight</h2>
          </div>
          <div className="boxed-list">
            <div className="row flex-wrap">
              <span className="row-body">Units</span>
              <ToggleGroup label="Units" options={units} value={unit} onValueChange={setUnit} />
            </div>
            <EntryRow inline label="Weight" htmlFor="bmi-weight" unit={unit === "metric" ? "kg" : "lb"}>
              <Input
                id="bmi-weight"
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
              <EntryRow inline label="Height" htmlFor="bmi-height-cm" unit="cm">
                <Input
                  id="bmi-height-cm"
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
              <EntryRow inline label="Height" htmlFor="bmi-height-ft" unit="in">
                <Input
                  id="bmi-height-ft"
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
      {bmi !== null && (
        <section className="pref-group" aria-labelledby="bmi-result">
          <div className="group-header">
            <h2 id="bmi-result" className="group-title">Your BMI</h2>
          </div>
          <div className="boxed-list">
            <div className="row py-3">
              <div className="row-body">
                <span className="title-1 numeric">{bmi.toFixed(1)}</span>
                <span className="row-subtitle">{bmiCategory(bmi)}</span>
              </div>
            </div>
            {ranges.map(({ label, range }) => {
              const current = bmiCategory(bmi) === label;
              return (
                <div key={label} className={`row ${current ? "font-bold" : ""}`}>
                  <span className="row-body">{label}</span>
                  <span className={`numeric ${current ? "" : "text-muted-foreground"}`}>{range}</span>
                  {current && <Check className="size-4 text-accent-text" aria-label="Your range" />}
                </div>
              );
            })}
          </div>
          <p className="group-description px-0.5">
            BMI doesn&apos;t account for muscle mass or body composition, so treat
            it as a rough guide.
          </p>
        </section>
      )}
    </>
  );
};
