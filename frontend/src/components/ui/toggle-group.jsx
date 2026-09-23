import { cn } from "@/lib/utils";

// AdwToggleGroup: a gray trough with the chosen segment raised. Buttons keep
// aria-pressed, like the toggle buttons they replace.
function ToggleGroup({ label, options, value, onValueChange, className, itemClassName }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex gap-[3px] rounded-[9px] bg-fill p-[3px]", className)}>
      {options.map(({ id, label: optionLabel }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onValueChange(id)}
          className={cn(
            "min-h-[28px] min-w-0 flex-1 rounded-md px-3 text-[0.8125rem] font-bold whitespace-nowrap transition-colors outline-none pointer-coarse:min-h-9 focus-visible:outline-2 focus-visible:outline-ring",
            value === id
              ? "bg-card shadow-[0_1px_3px_rgb(0_0_6/15%),0_0_0_1px_rgb(0_0_6/4%)] dark:bg-[#56565a]"
              : "hover:bg-fill",
            itemClassName,
          )}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}

export { ToggleGroup };
