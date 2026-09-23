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
    <div className="banner" data-tone="neutral">
      <div className="banner-inner">
        <p>Saved in this browser only</p>
        <div className="flex items-center gap-1">
          <Button asChild size="sm">
            <Link to="/auth?mode=signup">Sign Up<span className="max-sm:hidden"> to Sync</span></Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            shape="circular"
            aria-label="Dismiss"
            onClick={dismiss}
          >
            <X />
          </Button>
        </div>
      </div>
    </div>
  );
};
