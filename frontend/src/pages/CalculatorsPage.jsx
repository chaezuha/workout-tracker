import { useState } from "react";
import { PlateSelector } from "@/components/PlateSelector/PlateSelector";
import { calculatePlateBreakdown } from "@/lib/plates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const weights = [45, 35, 25, 10, 5, 2.5, 1, 0.5];

const modes = [
  { id: "plateToWeight", label: "Plates to weight" },
  { id: "weightToPlate", label: "Weight to plates" },
];

export const CalculatorsPage = () => {
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

  const showCalculatedPlates = () => {
    if (!plateCalcSummary) {
      return (
        <p className="text-sm text-muted-foreground">
          Enter a target weight to see the plate breakdown.
        </p>
      );
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
      <div className="space-y-2">
        <p className="text-3xl font-semibold tabular-nums">
          {plateCalcSummary.total} lb
        </p>
        {!plateCalcSummary.exact && (
          <p className="text-sm text-amber-600">
            Rounded {plateCalcSummary.mode} to {plateCalcSummary.total} lb —{" "}
            {plateCalcSummary.desired} lb isn't possible with these plates.
          </p>
        )}
        <div className="space-y-1">
          {calculatedPlates.map(
            (count, i) =>
              count !== 0 && (
                <p key={i} className="text-sm text-muted-foreground">
                  {count} × {weights[i]} lb
                </p>
              ),
          )}
        </div>
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
      return (
        <p className="text-sm text-muted-foreground">
          Enter plate counts to see the total weight.
        </p>
      );
    }
    return (
      <p className="text-3xl font-semibold tabular-nums">
        {calculatedWeight} lb
      </p>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Calculators</h1>
        <p className="text-sm text-muted-foreground">
          Work out what's on the bar — or what should be.
        </p>
      </div>
      <div className="inline-flex rounded-lg bg-muted p-1">
        {modes.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={calcMode === id ? "default" : "ghost"}
            onClick={() => setCalcMode(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {calcMode === "plateToWeight" ? (
        <>
          <form onSubmit={calculateWeight} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plate-barbell-weight">Barbell weight</Label>
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
            <Button type="submit">Calculate total</Button>
          </form>
          <div className="rounded-xl border bg-muted/50 p-4">
            {showCalculatedWeight()}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={calculatePlates} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="desired-weight">Desired weight</Label>
              <Input
                id="desired-weight"
                type="number"
                min="0"
                value={desiredWeight}
                onChange={handleDesiredWeightChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barbell-weight">Barbell weight</Label>
              <Input
                id="barbell-weight"
                type="number"
                min="0"
                value={barbellWeight}
                onChange={handleBarbellWeightChange}
                required
              />
            </div>
            <PlateSelector
              weights={weights}
              selected={selectedPlates}
              onToggle={togglePlate}
            />
            <div className="space-y-2">
              <Label>If the target can't be hit exactly</Label>
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
            <Button type="submit">Calculate plates</Button>
          </form>
          <div className="rounded-xl border bg-muted/50 p-4">
            {showCalculatedPlates()}
          </div>
        </>
      )}
    </div>
  );
};
