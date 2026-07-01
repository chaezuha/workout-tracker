import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const PlateSelector = ({ weights, selected, onToggle }) => (
  <div className="space-y-2">
    <Label>Plates</Label>
    <div className="flex flex-wrap gap-2">
      {weights.map((w) => (
        <Button
          key={w}
          type="button"
          size="sm"
          variant={selected.includes(w) ? "default" : "outline"}
          onClick={() => onToggle(w)}
        >
          {w}
        </Button>
      ))}
    </div>
  </div>
);
