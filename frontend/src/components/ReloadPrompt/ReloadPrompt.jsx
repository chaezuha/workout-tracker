import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";

// Shown when a new service worker is waiting (registerType: "prompt" in
// vite.config.js): the user picks when to reload instead of silently running
// a stale build until the next visit.
export const ReloadPrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg sm:inset-x-auto sm:right-4">
      <p className="text-sm">A new version is available.</p>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>
        Reload
      </Button>
      <Button size="sm" variant="outline" onClick={() => setNeedRefresh(false)}>
        Dismiss
      </Button>
    </div>
  );
};
