import { useState } from "react";
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
  };

  const hasLoggedReps = session.exercises.some(
    (e) => loggedReps(e).length > 0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border p-4 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editingName ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitRename();
            }}
          >
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={`Session ${index + 1}`}
              className="h-8 w-40"
            />
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditingName(false)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-1">
            <h3 className="font-semibold">{displayName}</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                setNameDraft(session.name ?? "");
                setEditingName(true);
              }}
            >
              Rename
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {(liveDuration > 0 || isActive) && (
            <span
              className={
                isActive
                  ? "font-semibold tabular-nums"
                  : "text-sm text-muted-foreground tabular-nums"
              }
            >
              {formatDuration(liveDuration)}
              {isActive && timer.status === "paused" && " · paused"}
            </span>
          )}
          {hasLoggedReps && (
            <ShareSessionButton session={session} dateKey={dateKey} />
          )}
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
              >
                Delete
              </Button>
            }
            title={`Delete ${displayName}?`}
            description={`This removes the session${
              session.exercises.length
                ? ` and its ${session.exercises.length} ${
                    session.exercises.length === 1 ? "exercise" : "exercises"
                  }`
                : ""
            }${isActive ? "; its running timer will be discarded" : ""}.`}
            confirmLabel="Delete"
            confirmVariant="destructive"
            onConfirm={() => onDelete(session.id)}
          />
        </div>
      </div>

      {(isToday || isActive) && (
        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button
              type="button"
              size="sm"
              disabled={otherTimerActive}
              onClick={() => onStartTimer(session.id, displayName)}
            >
              Start timer
            </Button>
          ) : (
            <>
              {timer.status === "running" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onPauseTimer}
                >
                  Pause
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={onResumeTimer}>
                  Resume
                </Button>
              )}
              <ConfirmDialog
                trigger={
                  <Button type="button" size="sm" variant="destructive">
                    Stop
                  </Button>
                }
                title="Stop timer?"
                description={`This adds ${formatDuration(timer.elapsed)} to ${displayName}.`}
                confirmLabel="Stop & save"
                confirmVariant="destructive"
                onConfirm={onStopTimer}
              />
            </>
          )}
          {otherTimerActive && !isActive && (
            <span className="text-xs text-muted-foreground">
              Another session's timer is running.
            </span>
          )}
        </div>
      )}

      {session.exercises.length > 0 ? (
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
      ) : (
        <p className="text-sm text-muted-foreground">
          No exercises yet — add one below.
        </p>
      )}
        <AddExerciseDialog onAdd={(data) => onAddExercise(session.id, data)} />
      </div>
    </motion.div>
  );
};
