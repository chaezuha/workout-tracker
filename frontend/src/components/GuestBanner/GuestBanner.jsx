import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const DISMISS_KEY = "guest:bannerDismissed";

export const GuestBanner = () => {
  const { isGuest } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1",
  );

  if (!isGuest || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="border-b bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-2 text-sm">
        <p>
          You're in guest mode so your data is saved only in this browser.{" "}
          <Link
            to="/auth?mode=signup"
            className="font-medium underline underline-offset-2"
          >
            Sign up
          </Link>{" "}
          to save data.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss"
          className="shrink-0 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
          onClick={dismiss}
        >
          <X />
        </Button>
      </div>
    </div>
  );
};
