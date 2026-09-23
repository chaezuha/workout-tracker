import { useState } from "react";
import { PlateSelector } from "@/components/PlateSelector/PlateSelector";
import { TdeeCalculator } from "@/components/TdeeCalculator/TdeeCalculator";
import { BmiCalculator } from "@/components/BmiCalculator/BmiCalculator";
import { calculatePlateBreakdown } from "@/lib/plates";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntryRow } from "@/components/ui/entry-row";
import { ToggleGroup } from "@/components/ui/toggle-group";

const weights = [45, 35, 25, 10, 5, 2.5, 1, 0.5];

const modes = [
  { id: "plateToWeight", label: "Bar Total" },
  { id: "weightToPlate", label: "Load Bar" },
  { id: "tdee", label: "TDEE" },
  { id: "bmi", label: "BMI" },
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
    if (!plateCalcSummary) return null;
    if (plateCalcSummary.error) {
      return (
        <p className="text-center text-sm text-destructive">
          {plateCalcSummary.error === "barbell"
            ? "The barbell alone is heavier than that."
            : "Choose at least one plate size."}
        </p>
      );
    }
    return (
      <section className="pref-group" aria-labelledby="plates-result">
        <div className="group-header">
          <h2 id="plates-result" className="group-title">Load the Bar</h2>
        </div>
        <div className="boxed-list">
          <div className="row py-3">
            <div className="row-body">
              <span className="title-1 numeric">{plateCalcSummary.total} lb</span>
              {!plateCalcSummary.exact && (
                <span className="row-subtitle text-warning">
                  Rounded {plateCalcSummary.mode}. {plateCalcSummary.desired} lb
                  isn&apos;t possible with these plates.
                </span>
              )}
            </div>
          </div>
          {calculatedPlates.map(
            (count, i) =>
              count !== 0 && (
                <div key={i} className="row">
                  <span className="row-body">{weights[i]} lb</span>
                  <span className="font-bold numeric">× {count}</span>
                </div>
              ),
          )}
        </div>
      </section>
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
    if (calculatedWeight === 0) return null;
    return (
      <div className="boxed-list">
        <div className="row py-3">
          <div className="row-body">
            <span className="row-subtitle">Total on the bar</span>
            <span className="title-1 numeric">{calculatedWeight} lb</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-content">
      <h1 className="sr-only">Calculators</h1>
      <ToggleGroup
        label="Calculator"
        options={modes}
        value={calcMode}
        onValueChange={setCalcMode}
        className="flex w-full"
        itemClassName="px-1.5 sm:px-3"
      />
      {calcMode === "tdee" ? (
        <TdeeCalculator />
      ) : calcMode === "bmi" ? (
        <BmiCalculator />
      ) : calcMode === "plateToWeight" ? (
        <>
          <form onSubmit={calculateWeight} className="space-y-8">
            <section className="pref-group" aria-labelledby="total-bar">
              <div className="group-header">
                <h2 id="total-bar" className="group-title">Bar and Plates</h2>
              </div>
              <div className="boxed-list">
                <EntryRow inline label="Barbell" htmlFor="plate-barbell-weight" unit="lb">
                  <Input
                    id="plate-barbell-weight"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={plateBarbellWeight}
                    onChange={handlePlateBarbellWeightChange}
                  />
                </EntryRow>
                <PlateSelector
                  weights={weights}
                  selected={selectedPlates}
                  onToggle={togglePlate}
                />
              </div>
            </section>
            {selectedPlates.length > 0 && (
              <section className="pref-group" aria-labelledby="total-counts">
                <div className="group-header">
                  <div>
                    <h2 id="total-counts" className="group-title">Plates on the Bar</h2>
                    <p className="group-description">Count every plate, both sides.</p>
                  </div>
                </div>
                <div className="boxed-list">
                  {weights.map(
                    (w, i) =>
                      selectedPlates.includes(w) && (
                        <EntryRow key={w} inline label={`${w} lb`} htmlFor={`plate-${w}`} unit="×">
                          <Input
                            id={`plate-${w}`}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder="0"
                            value={plateCounts[i]}
                            onChange={handlePlateCountChange(i)}
                          />
                        </EntryRow>
                      ),
                  )}
                </div>
              </section>
            )}
            <div className="flex justify-center">
              <Button type="submit" size="pill">Calculate Total</Button>
            </div>
          </form>
          {showCalculatedWeight()}
        </>
      ) : (
        <>
          <form onSubmit={calculatePlates} className="space-y-8">
            <section className="pref-group" aria-labelledby="load-target">
              <div className="group-header">
                <h2 id="load-target" className="group-title">Target</h2>
              </div>
              <div className="boxed-list">
                <EntryRow inline label="Desired weight" htmlFor="desired-weight" unit="lb">
                  <Input
                    id="desired-weight"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={desiredWeight}
                    onChange={handleDesiredWeightChange}
                    required
                  />
                </EntryRow>
                <EntryRow inline label="Barbell" htmlFor="barbell-weight" unit="lb">
                  <Input
                    id="barbell-weight"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={barbellWeight}
                    onChange={handleBarbellWeightChange}
                    required
                  />
                </EntryRow>
                <PlateSelector
                  weights={weights}
                  selected={selectedPlates}
                  onToggle={togglePlate}
                />
                <div className="row flex-wrap">
                  <span className="row-body">
                    <span className="row-title">If it can&apos;t be exact</span>
                  </span>
                  <ToggleGroup
                    label="Rounding"
                    options={[
                      { id: "up", label: "Round Up" },
                      { id: "down", label: "Round Down" },
                    ]}
                    value={roundMode}
                    onValueChange={setRoundMode}
                  />
                </div>
              </div>
            </section>
            <div className="flex justify-center">
              <Button type="submit" size="pill">Calculate Plates</Button>
            </div>
          </form>
          {showCalculatedPlates()}
        </>
      )}
    </div>
  );
};
