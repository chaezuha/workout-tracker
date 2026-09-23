import { useRegisterSW } from "virtual:pwa-register/react";
import { X } from "lucide-react";

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
    <div role="status" className="fixed inset-x-4 bottom-[calc(1rem+var(--mobile-nav-height))] z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full bg-[#1e1e21]/95 py-1.5 pr-1.5 pl-5 text-sm font-medium text-white shadow-[0_2px_8px_2px_rgb(0_0_6/25%)]">
      <p className="mr-2">A new version is available</p>
      <button type="button" className="rounded-full px-3 py-1.5 font-bold text-[#81d0ff] hover:bg-white/10" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
      <button type="button" aria-label="Dismiss" className="grid size-8 place-items-center rounded-full hover:bg-white/10" onClick={() => setNeedRefresh(false)}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
};
