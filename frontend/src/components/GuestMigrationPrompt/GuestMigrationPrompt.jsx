import { useState } from "react";
import { Spinner } from "@/components/ui/icons";
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
      <DialogContent variant="alert" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {status === "done" ? "Import Complete" : "Import Guest Workouts?"}
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
              : "This device has workouts from guest mode. Import them into your account? Nothing already in your account is changed."}
          </DialogDescription>
        </DialogHeader>
        {status === "error" && (
          <p className="text-destructive text-sm">
            Import failed: {error?.message ?? "something went wrong."} Your
            guest data is untouched, so you can try again.
          </p>
        )}
        <DialogFooter>
          {status === "done" ? (
            <Button onClick={() => window.location.reload()}>Done</Button>
          ) : status === "error" ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Not Now
              </Button>
              <Button onClick={handleImport}>Try Again</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={migrating}
                onClick={handleDecline}
              >
                No Thanks
              </Button>
              <Button disabled={migrating} onClick={handleImport}>
                {migrating ? (
                  <>
                    <Spinner className="animate-spin" aria-hidden />
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
