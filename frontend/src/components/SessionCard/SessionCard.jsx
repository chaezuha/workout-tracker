import { useRef, useState } from "react";
import { Pause, Play, Stop } from "@/components/ui/icons";
import { motion } from "motion/react";
import {
  DndContext,
  closestCorners,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Column } from "@/components/Column/Column";
import { AddExerciseDialog } from "@/components/AddExerciseDialog/AddExerciseDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ShareSessionButton } from "@/components/ShareSummary/ShareSessionButton";
import { formatDuration } from "@/lib/time";
import { loggedReps } from "@/services/stats";

// One session's card: name (renamable), accumulated timer, timer controls
// (starting is today-only, but an already-running timer keeps its controls on
// any date so a midnight-crossing timer can still be stopped — one timer runs
// at a time across all sessions), and its own sortable exercise list. Cross-session drag is intentionally not supported:
// each card has its own DndContext.
export const SessionCard = ({
  session,
  index,
  isToday,
  dateKey,
  celebratingId,
  lastResults,
  timer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  onRename,
  onDelete,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onDragEnd,
}) => {
  const menuRef = useRef(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const displayName = session.name ?? `Session ${index + 1}`;
  const isActive =
    timer.status !== "idle" && timer.activeSessionId === session.id;
  const otherTimerActive =
    timer.status !== "idle" && timer.activeSessionId !== session.id;
  const liveDuration = session.durationSeconds + (isActive ? timer.elapsed : 0);

  // Mouse/touch split (not PointerSensor): a touch would trip the pointer
  // sensor's distance constraint before the touch delay elapses. The delay
  // lets touches scroll the page; moving past the tolerance cancels the drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const submitRename = () => {
    onRename(session.id, nameDraft.trim() || null);
    setEditingName(false);
    requestAnimationFrame(() => menuRef.current?.focus());
  };

  const hasLoggedReps = session.exercises.some(
    (e) => loggedReps(e).length > 0,
  );

  const timerControls = (isToday || isActive) && (
    !isActive ? (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={otherTimerActive}
        title={otherTimerActive ? "Another session's timer is running" : undefined}
        onClick={() => onStartTimer(session.id, displayName)}
      >
        <Play aria-hidden /> Start
      </Button>
    ) : (
      <>
        {timer.status === "running" ? (
          <Button type="button" size="sm" variant="ghost" onClick={onPauseTimer}>
            <Pause aria-hidden /> Pause
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onResumeTimer}>
            <Play aria-hidden /> Resume
          </Button>
        )}
        <ConfirmDialog
          trigger={
            <Button type="button" size="sm" variant="ghost">
              <Stop aria-hidden /> Stop
            </Button>
          }
          title="Stop Timer?"
          description={`This adds ${formatDuration(timer.elapsed)} to ${displayName}.`}
          confirmLabel="Stop and Save"
          onConfirm={onStopTimer}
        />
      </>
    )
  );

  return (
    // The padding leaves room for the boxed list's shadow inside the
    // clipping wrapper that animates the height.
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="-mx-2 -mt-2 overflow-hidden px-2 pt-2 pb-2"
    >
      <section className="pref-group" aria-label={displayName}>
        <div className="group-header items-center">
          {editingName ? (
            <form
              className="flex min-w-0 flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitRename();
              }}
            >
              <Input
                autoFocus
                aria-label="Session name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder={`Session ${index + 1}`}
                className="w-44"
              />
              <Button type="submit" size="sm">
                Rename
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setEditingName(false); requestAnimationFrame(() => menuRef.current?.focus()); }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="min-w-0 flex-1">
              <h2 className="group-title break-words">{displayName}</h2>
              {(liveDuration > 0 || isActive) && (
                <p className={`group-description numeric ${isActive ? "font-bold text-accent-text" : ""}`}>
                  {formatDuration(liveDuration)}
                  {isActive && timer.status === "paused" && " · Paused"}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {timerControls}
            <ShareSessionButton session={session} dateKey={dateKey} menu={{
              label: `Actions for ${displayName}`, triggerRef: menuRef, canShare: hasLoggedReps,
              before: [{ label: "Rename Session", onSelect: () => { setNameDraft(session.name ?? ""); setEditingName(true); } }],
              after: ["separator", { label: "Delete Session", onSelect: () => setDeleteOpen(true) }],
            }} />
            <ConfirmDialog
              open={deleteOpen} onOpenChange={setDeleteOpen} restoreFocusRef={menuRef}
              title={`Delete ${displayName}?`}
              description={`This removes the session${session.exercises.length ? ` and its ${session.exercises.length} ${session.exercises.length === 1 ? "exercise" : "exercises"}` : ""}${isActive ? ", and discards its running timer" : ""}.`}
              confirmLabel="Delete" confirmVariant="destructive" onConfirm={() => onDelete(session.id)}
            />
          </div>
        </div>
        <div className="boxed-list">
          {session.exercises.length > 0 && (
            <DndContext
              sensors={sensors}
              onDragEnd={(event) => onDragEnd(session.id, event)}
              collisionDetection={closestCorners}
            >
              <Column
                exercises={session.exercises}
                celebratingId={celebratingId}
                lastResults={lastResults}
                onDelete={(exerciseId) => onDeleteExercise(session.id, exerciseId)}
                onEdit={(exerciseId, data) =>
                  onEditExercise(session.id, exerciseId, data)
                }
              />
            </DndContext>
          )}
          <AddExerciseDialog onAdd={(data) => onAddExercise(session.id, data)} />
        </div>
      </section>
    </motion.div>
  );
};
