import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export const ExerciseNameAutocomplete = ({
  value,
  onChange,
  suggestions,
  onSelect,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const query = value.trim().toLowerCase();
  const matches = query
    ? suggestions
        .filter((s) => s.name.toLowerCase().includes(query))
        .slice(0, 8)
    : [];
  const showList = open && matches.length > 0;

  // Radix Dialog dismisses on Escape via a document-level capture listener,
  // which fires before this input's onKeyDown. This component mounts as a
  // child of DialogContent, so its effect (and listener) registers first —
  // preventDefault here makes Radix skip dismissal while the list is open.
  const showListRef = useRef(false);
  useEffect(() => {
    showListRef.current = showList;
  }, [showList]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== "Escape" || !showListRef.current) return;
      e.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
    };
    document.addEventListener("keydown", handleEscape, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleEscape, { capture: true });
  }, []);

  const selectSuggestion = (suggestion) => {
    onChange(suggestion.name);
    onSelect?.(suggestion);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showList) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(matches[highlightedIndex]);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setHighlightedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={showList}
        autoComplete="off"
        {...rest}
      />
      {showList && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {matches.map((s, i) => (
            <button
              key={s.name}
              type="button"
              role="option"
              aria-selected={i === highlightedIndex}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                i === highlightedIndex ? "bg-accent text-accent-foreground" : ""
              }`}
              onClick={() => selectSuggestion(s)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
