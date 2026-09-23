import { Check, CloudOff, Loader2 } from "lucide-react";

// Save/sync state for the viewed day. Saves are local-first, so the labels
// say where the data actually is: "Saved on this device" the moment the
// local write lands, "Syncing to account…" while the outbox drains. Guests
// have no outbox — they only ever see Saving/Saved.
export const SaveStatus = ({ saving, pending, online, isGuest }) => {
  let icon;
  let label;
  if (saving > 0) {
    icon = <Loader2 className="size-3 animate-spin" aria-hidden />;
    label = "Saving…";
  } else if (!isGuest && pending > 0 && !online) {
    icon = <CloudOff className="size-3" aria-hidden />;
    label = "Offline, will sync later";
  } else if (!isGuest && pending > 0) {
    icon = <Loader2 className="size-3 animate-spin" aria-hidden />;
    label = "Syncing to account…";
  } else {
    icon = <Check className="size-3" aria-hidden />;
    label = isGuest ? "Saved" : "Saved on this device";
  }

  return (
    <span
      role="status"
      className="flex items-center gap-1 text-xs text-muted-foreground"
    >
      {icon}
      {label}
    </span>
  );
};
