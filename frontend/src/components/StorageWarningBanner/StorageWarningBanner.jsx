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
    <div className="border-b bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-2 text-sm">
        <p>
          Couldn't save your latest change — browser storage may be full or
          unavailable. Recent edits might be lost if you close this tab.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss"
          className="shrink-0 text-red-900 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-900/40"
          onClick={() => setVisible(false)}
        >
          <X />
        </Button>
      </div>
    </div>
  );
};
