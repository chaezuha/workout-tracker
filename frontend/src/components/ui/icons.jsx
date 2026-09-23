import { cn } from "@/lib/utils";

// GNOME symbolic icons, converted from the GNOME icon-development-kit
// (https://gitlab.gnome.org/Teams/Design/icon-development-kit, CC0-1.0).
// Each export keeps the drawing on a 16px grid and inherits currentColor;
// the kit file name is noted above it. Size comes from className (buttons
// default to size-4). Lucide-only props like strokeWidth are ignored.
const icon = (paths) => {
  const Icon = ({ className, ...props }) => {
    delete props.strokeWidth;
    return (
      <svg
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("size-4", className)}
        aria-hidden={props["aria-label"] ? undefined : true}
        {...props}
      >
        {paths}
      </svg>
    );
  };
  return Icon;
};

// plus
export const Plus = icon(<><path d="M 2 8 L 14 8 M 8 2 L 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// minus
export const Minus = icon(<><path d="M 2 8 L 14 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// cross
export const X = icon(<><path d="M 3 13 L 13 3 M 3 3 L 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// object-select
export const Check = icon(<><path d="M 3 9 L 6 12 L 13 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// go-previous
export const ChevronLeft = icon(<><path d="M 11 2 L 5 8 L 11 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// go-next
export const ChevronRight = icon(<><path d="M 5 2 L 11 8 L 5 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// pan-down
export const ChevronDown = icon(<><path d="M 13 6 L 8 11 L 3 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// pan-up
export const ChevronUp = icon(<><path d="M 13 10 L 8 5 L 3 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// open-menu
export const Menu = icon(<><path d="M 2 13 L 14 13 M 2 8 L 14 8 M 2 3 L 14 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// view-more
export const MoreVertical = icon(<><path d="M 9 14 C 9 14.5522852, 8.55228519 15, 8 15 C 7.44771528 15, 7 14.5522852, 7 14 C 7 13.4477148, 7.44771528 13, 8 13 C 8.55228519 13, 9 13.4477148, 9 14 M 9 8 C 9 8.55228519, 8.55228519 9, 8 9 C 7.44771528 9, 7 8.55228519, 7 8 C 7 7.44771528, 7.44771528 7, 8 7 C 8.55228519 7, 9 7.44771528, 9 8 M 9 2 C 9 2.55228472, 8.55228519 3, 8 3 C 7.44771528 3, 7 2.55228472, 7 2 C 7 1.44771528, 7.44771528 1, 8 1 C 8.55228519 1, 9 1.44771528, 9 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// draggable
export const GripVertical = icon(<><path d="M 9.99999046 4.01379824 L 9.99999905 3.98620534 M 9.99999905 8.0137949 L 10 7.98620892 M 10 12.0137959 L 9.99999905 11.9862061 M 5.99999094 4.01379824 L 6 3.98620534 M 6 8.0137949 L 6 7.98620892 M 6.00000048 12.0137959 L 5.99999952 11.9862061" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// user-trash
export const Trash = icon(<><path d="M 3 4 L 3 13 C 3 14.1045694, 3.89543056 15, 5 15 L 11 15 C 12.1045694 15, 13 14.1045694, 13 13 L 13 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M 15 4 L 1 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M 5 4 L 5 3 C 5 1.89543045, 5.89543056 1, 7 1 L 9 1 C 10.1045694 1, 11 1.89543045, 11 3 L 11 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M 6.5 7 L 6.5 12 M 9.49961376 7 L 9.49961376 12" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></>);
// pencil
export const Pencil = icon(<><path d="M 2 13 L 3 14 M 2 11 L 5 14 M 10 3 L 13 6 M 2 14 L 2 11 L 10.458621 2.54137921 C 11.3099012 1.69009948, 12.6900988 1.69009948, 13.541379 2.54137921 C 14.3469534 3.3926599, 14.3099003 4.73580599, 13.4586191 5.54137945 L 5 14 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// media-playback-start
export const Play = icon(<><path d="M 4 4 L 4 12 A 1.13238 1.13238 29.5181 0 0 5.71499 12.971 L 12.4251 8.94495 A 1.10199 1.10199 90 0 0 12.4251 7.05505 L 5.71499 3.02899 A 1.13238 1.13238 150.482 0 0 4 4 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillRule="nonzero" /></>);
// media-playback-pause
export const Pause = icon(<><path d="M 6 3.5 L 6 12.5 C 6 13.3284273, 5.32842731 14, 4.5 14 C 3.67157292 14, 3 13.3284273, 3 12.5 L 3 3.5 C 3 2.67157292, 3.67157292 2, 4.5 2 C 5.32842731 2, 6 2.67157292, 6 3.5 Z M 13 3.5 L 13 12.5 C 13 13.3284273, 12.3284273 14, 11.5 14 C 10.6715727 14, 10 13.3284273, 10 12.5 L 10 3.5 C 10 2.67157292, 10.6715727 2, 11.5 2 C 12.3284273 2, 13 2.67157292, 13 3.5 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// media-playback-stop
export const Stop = icon(<><path d="M 3 4.5 L 3 11.5 C 3 12.3284273, 3.67157292 13, 4.5 13 L 11.5 13 C 12.3284273 13, 13 12.3284273, 13 11.5 L 13 4.5 C 13 3.67157292, 12.3284273 3, 11.5 3 L 4.5 3 C 3.67157292 3, 3 3.67157292, 3 4.5 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// share
export const Share = icon(<><path d="M 5 4 L 8 1 L 11 4 M 8 11 L 8 1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M 10 8 L 12 8 C 13.1045694 8, 14 8.89543056, 14 10 L 14 13 C 14 14.1045694, 13.1045694 15, 12 15 L 4 15 C 2.89543056 15, 2 14.1045694, 2 13 L 2 10 C 2 8.89543056, 2.89543056 8, 4 8 L 6 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="round" /></>);
// edit-copy
export const Copy = icon(<><path d="M 3 10 C 1.89543045 10, 1 9.10456944, 1 8 L 1 3 C 1 1.89543045, 1.89543045 1, 3 1 L 8 1 C 9.10456944 1, 10 1.89543045, 10 3 M 6 8 L 6 13 C 6 14.1045694, 6.89543056 15, 8 15 L 13 15 C 14.1045694 15, 15 14.1045694, 15 13 L 15 8 C 15 6.89543056, 14.1045694 6, 13 6 L 8 6 C 6.89543056 6, 6 6.89543056, 6 8 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// globe-no
export const Offline = icon(<><path d="M 8 15 C 4.13401 15, 1 11.866, 1 8 C 1 4.13401, 4.13401 1, 8 1 C 11.866 1, 15 4.13401, 15 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillRule="nonzero" /><path d="M 8.00299 15 C 6.06161 15, 4.48781 11.8619, 4.48781 7.99092 C 4.48781 4.11991, 6.06161 0.981835, 8.00299 0.981835 C 9.94437 0.981836, 11.5182 4.11991, 11.5182 7.99092 M 13.7903 4.04813 C 12.2869 4.98682, 10.2054 5.51991, 8.02674 5.52424 C 5.84805 5.52858, 3.76063 5.00378, 2.24676 4.0711 M 8.02674 10.5007 C 5.84805 10.4964, 3.76063 11.0212, 2.24676 11.9539" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /><path d="M 15 11 L 11 15 M 15 15 L 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// stopwatch
export const Timer = icon(<><path d="M 8 9 L 10 7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /><path d="M 8 9 L 7.98049355 9 M 2 4.49283361 L 3.41421366 3.0786202 M 6.02068949 1 L 10 1 M 8 4 L 8 1 M 13 9 C 13 11.7614241, 10.7614241 14, 8 14 C 5.23857641 14, 3 11.7614241, 3 9 C 3 6.23857641, 5.23857641 4, 8 4 C 10.7614241 4, 13 6.23857641, 13 9 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// calendar
export const Calendar = icon(<><path d="M 4 11.5 L 6 11.5 M 4 9.5 L 6 9.5 M 10 11.5 L 12 11.5 M 7 11.5 L 9 11.5 M 10 9.5 L 12 9.5 M 7 9.5 L 9 9.5 M 10 7.5 L 12 7.5 M 7 7.5 L 9 7.5 M 2 5.5 L 14 5.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="round" /><path d="M 5 3 L 5 2 M 11 3 L 11 2 M 2 5 L 2 12 C 2 13.1045694, 2.89543056 14, 4 14 L 12 14 C 13.1045694 14, 14 13.1045694, 14 12 L 14 5 C 14 3.89543056, 13.1045694 3, 12 3 L 4 3 C 2.89543056 3, 2 3.89543056, 2 5 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// calculator
export const Calculator = icon(<><path d="M 1 3 L 1 13 C 1 14.1045694, 1.89543045 15, 3 15 L 12 15 C 13.1045694 15, 14 14.1045694, 14 13 L 14 3 C 14 1.89543045, 13.1045694 1, 12 1 L 3 1 C 1.89543045 1, 1 1.89543045, 1 3 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M 10.5 11.5 L 0.989655375 11.499999 M 14 8.5 L 0.989655972 8.5 M 10.5 5.48965502 L 10.5 15 M 7.5 5.48965502 L 7.5 15 M 4.46896553 5.48965502 L 4.46896553 15 M 1 5.48965502 L 14 5.48965502" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></>);
// profit
export const Chart = icon(<><path d="M 11 5 L 14 5 L 14 8 M 2 12 L 6 8 L 8.5 10.5 L 14 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// library
export const Library = icon(<><path d="M 1 15 L 1 2 L 3 2 L 3 15 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillRule="nonzero" /><path d="M 6 15 L 6 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="miter" fillRule="nonzero" /><path d="M 9 3 L 9 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="miter" fillRule="nonzero" /><path d="M 10.9062 1.46875 L 14.5 14.625" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillRule="nonzero" /></>);
// document-save
export const Save = icon(<><path d="M 2 15 L 14 15 M 5 9 L 8 12 L 11 9 M 8 2 L 8 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
// external-link
export const ExternalLink = icon(<><path d="M 10 1 L 15 1 L 15 6 M 8 8 L 15 1 M 7 3 L 3 3 C 1.89543045 3, 1 3.89543056, 1 5 L 1 13 C 1 14.1045694, 1.89543045 15, 3 15 L 11 15 C 12.1045694 15, 13 14.1045694, 13 13 L 13 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);

// The kit has no dumbbell, so the Workout page keeps Lucide's.
export { Dumbbell } from "lucide-react";

// AdwSpinner: a thin ring with a moving arc.
export const Spinner = ({ className, ...props }) => (
  <svg viewBox="0 0 16 16" className={cn("size-4 animate-spin", className)} aria-hidden={props["aria-label"] ? undefined : true} {...props}>
    <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
    <path d="M 8 1.5 A 6.5 6.5 0 0 1 14.5 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
