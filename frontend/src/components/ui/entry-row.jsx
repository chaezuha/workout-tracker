import { cn } from "@/lib/utils";

// Form rows for a .boxed-list. Stacked is AdwEntryRow (small title above a
// borderless entry); inline is AdwSpinRow-like (title left, short
// right-aligned entry and unit right) for numbers.
function EntryRow({ label, htmlFor, inline = false, unit, description, className, children }) {
  if (inline) {
    return (
      <div data-inline className={cn("entry-row row", className)}>
        <label htmlFor={htmlFor} className="row-body">
          <span className="row-title">{label}</span>
          {description && <span className="row-subtitle">{description}</span>}
        </label>
        <div className="flex shrink-0 items-center gap-2">
          {children}
          <span className="w-5 text-sm text-muted-foreground">{unit}</span>
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
