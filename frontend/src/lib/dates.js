export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// True only for a "YYYY-MM-DD" key naming a real calendar date: the shape
// check alone would accept "2026-99-99", which Date would silently roll over,
// so round-trip through Date and require the key to survive unchanged.
export function isValidDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toDateKey(fromDateKey(key)) === key;
}

export function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function formatFriendly(date) {
  const key = toDateKey(date);
  const today = new Date();
  if (key === toDateKey(today)) return "Today";
  if (key === toDateKey(addDays(today, -1))) return "Yesterday";
  if (key === toDateKey(addDays(today, 1))) return "Tomorrow";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
