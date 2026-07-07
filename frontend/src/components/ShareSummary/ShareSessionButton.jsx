import { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShareSummaryCard } from "./ShareSummaryCard";
import { summarizeSession } from "@/services/summary";
import { getAllStatsRows } from "@/services/stats";
import { buildPrBaselines, detectPrs } from "@/services/prs";

const isWebKit =
  typeof navigator !== "undefined" &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Chrome/.test(navigator.userAgent);

// Rasterization can stall indefinitely in throttled/background tabs; give up
// rather than leaving the button stuck on busy.
const CAPTURE_TIMEOUT_MS = 20000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("capture timed out")), ms),
    ),
  ]);

export const ShareSessionButton = ({ session, dateKey }) => {
  const cardRef = useRef(null);
  // Non-null summary mounts the off-screen card for capture.
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Lazy: html-to-image only loads the first time someone shares.
      const { toBlob } = await import("html-to-image");
      // PR badges compare against strictly-before-today history; they're a
      // bonus, so a failed fetch just means no badges.
      const prNames = new Set();
      try {
        const baselines = buildPrBaselines(await getAllStatsRows(), dateKey);
        for (const e of session.exercises) {
          if (detectPrs(e, baselines).length) {
            prNames.add(e.name.trim().toLowerCase());
          }
        }
      } catch {
        /* no badges */
      }

      setSummary(summarizeSession(session, dateKey, prNames));
      // Two frames so the off-screen card has committed and laid out.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const node = cardRef.current;
      const options = {
        pixelRatio: 2,
        skipFonts: true,
        backgroundColor: getComputedStyle(node).backgroundColor,
      };
      let blob = await withTimeout(toBlob(node, options), CAPTURE_TIMEOUT_MS);
      // Safari's first foreignObject rasterization is often blank/unstyled;
      // capturing again with warm caches is the standard workaround.
      if (isWebKit) {
        blob = await withTimeout(toBlob(node, options), CAPTURE_TIMEOUT_MS);
      }
      if (!blob) throw new Error("capture returned no image");

      const file = new File([blob], `workout-${dateKey}.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Workout summary" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Workout image downloaded");
      }
    } catch (err) {
      // AbortError = user closed the share sheet; not a failure.
      if (err?.name !== "AbortError") {
        console.error("Share image failed", err);
        toast.error("Couldn't create the share image");
      }
    } finally {
      setSummary(null);
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={share}
        disabled={busy}
        aria-label="Share session summary"
      >
        <Share2 />
      </Button>
      {summary && (
        <div className="fixed left-[-9999px] top-0" aria-hidden="true">
          <ShareSummaryCard ref={cardRef} summary={summary} />
        </div>
      )}
    </>
  );
};
