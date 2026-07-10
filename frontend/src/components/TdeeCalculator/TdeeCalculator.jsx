import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toKg, toCm, calculateBmr, ACTIVITY_LEVELS } from "@/lib/bodyMetrics";

const units = [
  { id: "metric", label: "Metric (kg, cm)" },
  { id: "imperial", label: "Imperial (lb, ft/in)" },
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
          <Label>Gender</Label>
          <div className="flex gap-2">
            {genders.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={gender === id ? "default" : "outline"}
                onClick={() => setGender(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tdee-age">Age</Label>
          <Input
            id="tdee-age"
            type="number"
            inputMode="numeric"
            min="1"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tdee-weight">
            Weight ({unit === "metric" ? "kg" : "lb"})
          </Label>
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
        </div>
        {unit === "metric" ? (
          <div className="space-y-2">
            <Label htmlFor="tdee-height-cm">Height (cm)</Label>
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
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tdee-height-ft">Height (ft)</Label>
              <Input
                id="tdee-height-ft"
                type="number"
                inputMode="numeric"
                min="0"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdee-height-in">Height (in)</Label>
              <Input
                id="tdee-height-in"
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
        <Button type="submit">Calculate TDEE</Button>
      </form>
      <div className="rounded-xl border bg-muted/50 p-4">
        {bmr === null ? (
          <p className="text-sm text-muted-foreground">
            Fill in your details to see your BMR and daily calories.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                {Math.round(bmr)} kcal
              </p>
              <p className="text-sm text-muted-foreground">
                BMR — calories burned at rest
              </p>
            </div>
            <div className="space-y-1">
              {ACTIVITY_LEVELS.map(({ id, label, multiplier }) => (
                <div key={id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums">
                    {Math.round(bmr * multiplier)} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Estimated with the Mifflin-St Jeor formula — a good rule of thumb, but
        it won't be 100% accurate for everyone.
      </p>
    </>
  );
};
