import { Button } from "@/components/ui/button";

// The plates you own, as a wrap of toggle buttons inside a boxed-list row.
export const PlateSelector = ({ weights, selected, onToggle }) => (
  <div className="row flex-wrap gap-y-2 py-3">
    <span className="row-body min-w-24">
      <span className="row-title">Available plates</span>
      <span className="row-subtitle">lb</span>
    </span>
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Available plates">
      {weights.map((w) => (
        <Button
          key={w}
          type="button"
          size="sm"
          variant="toggle"
          className="min-w-11 numeric"
          aria-pressed={selected.includes(w)}
          onClick={() => onToggle(w)}
        >
          {w}
        </Button>
      ))}
    </div>
  </div>
);
