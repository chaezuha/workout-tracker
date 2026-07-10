import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toKg, toCm, calculateBmi, bmiCategory } from "@/lib/bodyMetrics";

const units = [
  { id: "metric", label: "Metric (kg, cm)" },
  { id: "imperial", label: "Imperial (lb, ft/in)" },
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
      <form onSubmit={calculate} className="space-y-4">
        <div className="space-y-2">
          <Label>Units</Label>
          <div className="flex gap-2">
            {units.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={unit === id ? "default" : "outline"}
                onClick={() => setUnit(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bmi-weight">
            Weight ({unit === "metric" ? "kg" : "lb"})
          </Label>
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
        </div>
        {unit === "metric" ? (
          <div className="space-y-2">
            <Label htmlFor="bmi-height-cm">Height (cm)</Label>
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
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bmi-height-ft">Height (ft)</Label>
              <Input
                id="bmi-height-ft"
                type="number"
                inputMode="numeric"
                min="0"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bmi-height-in">Height (in)</Label>
              <Input
                id="bmi-height-in"
                type="number"
                inputMode="decimal"
                min="0"
                max="11"
                step="any"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                required
              />
            </div>
          </div>
        )}
        <Button type="submit">Calculate BMI</Button>
      </form>
      <div className="rounded-xl border bg-muted/50 p-4">
        {bmi === null ? (
          <p className="text-sm text-muted-foreground">
            Enter your height and weight to see your BMI.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                {bmi.toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">
                BMI — {bmiCategory(bmi)}
              </p>
            </div>
            <div className="space-y-1">
              {ranges.map(({ label, range }) => (
                <div
                  key={label}
                  className={`flex justify-between text-sm ${
                    bmiCategory(bmi) === label
                      ? "font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <span>{label}</span>
                  <span className="tabular-nums">{range}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        BMI is a good rule of thumb, but it doesn't account for muscle mass or
        body composition — it won't be 100% accurate for everyone.
      </p>
    </>
  );
};
