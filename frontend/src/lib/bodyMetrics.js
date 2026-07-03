export const toKg = (weight, unit) =>
  unit === "imperial" ? weight / 2.20462 : weight;

export const toCm = ({ cm, ft, inches }, unit) =>
  unit === "imperial" ? (ft * 12 + inches) * 2.54 : cm;

// Mifflin-St Jeor equation
export const calculateBmr = ({ weightKg, heightCm, age, gender }) =>
  10 * weightKg + 6.25 * heightCm - 5 * age + (gender === "male" ? 5 : -161);

export const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", multiplier: 1.2 },
  { id: "light", label: "Lightly active", multiplier: 1.375 },
  { id: "moderate", label: "Moderately active", multiplier: 1.55 },
  { id: "heavy", label: "Heavy", multiplier: 1.725 },
];

export const calculateBmi = (weightKg, heightCm) =>
  weightKg / (heightCm / 100) ** 2;

export const bmiCategory = (bmi) => {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obesity";
};
