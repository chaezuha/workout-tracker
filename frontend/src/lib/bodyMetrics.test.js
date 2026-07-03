import { describe, expect, it } from "vitest";
import {
  bmiCategory,
  calculateBmi,
  calculateBmr,
  toCm,
  toKg,
} from "./bodyMetrics";

describe("toKg", () => {
  it("converts pounds to kilograms in imperial", () => {
    expect(toKg(220.462, "imperial")).toBeCloseTo(100, 3);
  });

  it("passes kilograms through in metric", () => {
    expect(toKg(80, "metric")).toBe(80);
  });
});

describe("toCm", () => {
  it("converts feet and inches in imperial", () => {
    expect(toCm({ ft: 5, inches: 10 }, "imperial")).toBeCloseTo(177.8);
  });

  it("passes centimeters through in metric", () => {
    expect(toCm({ cm: 180 }, "metric")).toBe(180);
  });
});

describe("calculateBmr", () => {
  // Mifflin-St Jeor: 10*80 + 6.25*180 - 5*30 = 1775, then +5 male / -161 female
  it("matches a hand-computed value for males", () => {
    expect(
      calculateBmr({ weightKg: 80, heightCm: 180, age: 30, gender: "male" }),
    ).toBe(1780);
  });

  it("matches a hand-computed value for females", () => {
    expect(
      calculateBmr({ weightKg: 80, heightCm: 180, age: 30, gender: "female" }),
    ).toBe(1614);
  });
});

describe("calculateBmi", () => {
  it("computes weight over height squared", () => {
    expect(calculateBmi(80, 180)).toBeCloseTo(24.69, 2);
  });
});

describe("bmiCategory", () => {
  it.each([
    [18.4, "Underweight"],
    [18.5, "Healthy"],
    [24.9, "Healthy"],
    [25, "Overweight"],
    [29.9, "Overweight"],
    [30, "Obesity"],
  ])("categorizes a BMI of %s as %s", (bmi, category) => {
    expect(bmiCategory(bmi)).toBe(category);
  });
});
