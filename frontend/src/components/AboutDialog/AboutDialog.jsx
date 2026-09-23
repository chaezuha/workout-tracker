import { ExternalLink } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeaderBar,
  DialogHeaderClose,
} from "@/components/ui/dialog";

const SOURCE_URL = "https://github.com/chaezuha/workout-tracker";

// AdwAboutDialog: app icon, name, developer and version up top, then a
// boxed list of links. Controlled so the main menu can open it.
export const AboutDialog = ({ open, onOpenChange, restoreFocusRef }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      headerbar
      className="sm:max-w-sm"
      onCloseAutoFocus={restoreFocusRef ? (event) => {
        event.preventDefault();
        restoreFocusRef.current?.focus();
      } : undefined}
    >
      <DialogHeaderBar title={<span className="sr-only">About Workout Tracker</span>} end={<DialogHeaderClose />} />
      <div className="flex flex-col items-center gap-1 pb-2 text-center">
        <img src="/pwa-192x192.png" alt="" className="mb-3 size-24 rounded-[22%] shadow-[var(--card-shadow)]" />
        <p className="title-1">Workout Tracker</p>
        <p className="dim">Harley</p>
        <p className="mt-3 rounded-full bg-accent px-3 py-0.5 text-sm font-bold text-accent-text numeric">
          {__APP_VERSION__}
        </p>
      </div>
      <DialogDescription className="text-center">
        Log workouts, track progress, and time your rests.
      </DialogDescription>
      <div className="boxed-list">
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="row row-activatable">
          <span className="row-body">Source Code</span>
          <ExternalLink className="size-4" aria-hidden />
        </a>
        <div className="row">
          <span className="row-body">License</span>
          <span className="dim">MIT</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
