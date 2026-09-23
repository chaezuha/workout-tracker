import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "@/components/ui/icons";

// Steps the row's <input> and fires a real "input" event, so React's
// onChange runs for controlled inputs and uncontrolled ones (defaultValue)
// still submit the new value. The native setter bypasses React's value
// tracker, which is what makes React notice the change.
const stepInput = (row, delta, min) => {
  const input = row?.querySelector("input");
  if (!input) return;
  let next = (Number(input.value) || 0) + delta;
  if (min != null) next = Math.max(min, next);
  next = Math.round(next * 100) / 100; // no 0.1 + 0.2 drift
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setValue.call(input, String(next));
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

// Form rows for a .boxed-list. Stacked is AdwEntryRow (small title above a
// borderless entry); inline is for numbers (title left, short right-aligned
// entry and unit right). With `spin` ({ step, min }) inline rows become an
// AdwSpinRow with − / + buttons. They stay out of the tab order: keyboard
// users step with the number input's arrow keys.
function EntryRow({ label, htmlFor, inline = false, unit, spin, description, className, children }) {
  const rowRef = useRef(null);
  if (inline) {
    return (
      <div ref={rowRef} data-inline className={cn("entry-row row", className)}>
        <label htmlFor={htmlFor} className="row-body">
          <span className="row-title">{label}</span>
          {description && <span className="row-subtitle">{description}</span>}
        </label>
        <div className="flex shrink-0 items-center gap-2">
          {children}
          <span className="w-5 text-sm text-muted-foreground">{unit}</span>
          {spin && (
            <div className="flex items-center gap-0.5">
              <Button type="button" variant="ghost" size="icon-sm" shape="circular" tabIndex={-1}
                aria-label={`Decrease ${label}`} onClick={() => stepInput(rowRef.current, -spin.step, spin.min)}>
                <Minus />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" shape="circular" tabIndex={-1}
                aria-label={`Increase ${label}`} onClick={() => stepInput(rowRef.current, spin.step, spin.min)}>
                <Plus />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className={cn("entry-row flex min-h-[58px] flex-col justify-center px-3 py-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export { EntryRow };
