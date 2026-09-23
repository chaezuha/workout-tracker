import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STORAGE_WRITE_FAILED_EVENT } from "@/lib/storageEvents";

// Shown when a localStorage write fails (quota, private mode, eviction):
// without it the UI looks like it saved while neither the data nor its sync
// op persisted. Dismissing only hides it until the next failure.
export const StorageWarningBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onFail = () => setVisible(true);
    window.addEventListener(STORAGE_WRITE_FAILED_EVENT, onFail);
    return () => window.removeEventListener(STORAGE_WRITE_FAILED_EVENT, onFail);
  }, []);

  if (!visible) return null;

  return (
    <div className="banner" data-tone="warning" role="alert">
      <div className="banner-inner">
        <p className="min-w-0 flex-1 sm:flex-none">
          Your latest change couldn't be saved. Browser storage may be full,
          so recent edits could be lost if you close this tab.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          shape="circular"
          aria-label="Dismiss"
          onClick={() => setVisible(false)}
        >
          <X />
        </Button>
      </div>
    </div>
  );
};
