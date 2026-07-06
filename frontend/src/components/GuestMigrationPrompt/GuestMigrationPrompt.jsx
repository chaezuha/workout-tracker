import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { isMigrationDeclined, setMigrationDeclined } from "@/lib/guestMode";
import {
  hasMigratableGuestData,
  migrateGuestDataToAccount,
} from "@/services/guestMigration";
import { hydrate } from "@/services/sync";

// Offers to import leftover guest-mode data into the account after sign-in.
// Mounted in AppLayout; renders nothing for guests or when there is nothing
// to import.
export const GuestMigrationPrompt = () => {
  const { session } = useAuth();
  // Checked once on mount; AppLayout remounts after the /auth redirect, so a
  // fresh sign-in always re-evaluates this.
  const [eligible] = useState(
    () => hasMigratableGuestData() && !isMigrationDeclined(),
  );
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState("prompt"); // prompt | migrating | error | done
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState(null);

  if (!session || !eligible || !open) return null;

  const handleImport = async () => {
    setStatus("migrating");
    setError(null);
    try {
      setCounts(await migrateGuestDataToAccount());
      // Pull the migrated rows into the account's offline mirror.
      await hydrate();
      setStatus("done");
    } catch (err) {
      setError(err);
      setStatus("error");
    }
  };

  const handleDecline = () => {
    setMigrationDeclined();
    setOpen(false);
  };

  const handleOpenChange = (next) => {
    if (status === "migrating") return;
    // Closing via Esc/overlay only dismisses for this visit; it is not a
    // persistent decline.
    if (status === "done") {
      window.location.reload();
      return;
    }
    setOpen(next);
  };

  const migrating = status === "migrating";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {status === "done" ? "Import complete" : "Import your guest workouts?"}
          </DialogTitle>
          <DialogDescription>
            {status === "done"
              ? `Imported ${counts.workoutDays} workout ${
                  counts.workoutDays === 1 ? "day" : "days"
                }, ${counts.checkins} check-in${
                  counts.checkins === 1 ? "" : "s"
                }, and ${counts.templates} template${
                  counts.templates === 1 ? "" : "s"
                }.`
              : "You have workouts saved on this device from guest mode. Import them into your account? Your existing account data is kept."}
          </DialogDescription>
        </DialogHeader>
        {status === "error" && (
          <p className="text-destructive text-sm">
            Import failed: {error?.message ?? "something went wrong."} Your
            guest data is untouched — you can retry.
          </p>
        )}
        <DialogFooter>
          {status === "done" ? (
            <Button onClick={() => window.location.reload()}>Done</Button>
          ) : status === "error" ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Not now
              </Button>
              <Button onClick={handleImport}>Retry</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={migrating}
                onClick={handleDecline}
              >
                No thanks
              </Button>
              <Button disabled={migrating} onClick={handleImport}>
                {migrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
