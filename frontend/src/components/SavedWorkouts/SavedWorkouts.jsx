import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/services/templates";
import { TemplateEditor } from "./TemplateEditor";

export const SavedWorkouts = ({ dayExercises, onLoadTemplate }) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list");
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");

  const handleOpenChange = (next) => {
    setOpen(next);
    setView("list");
    setError("");
    if (next) {
      getTemplates()
        .then(setTemplates)
        .catch(() => setError("Could not load your workouts."));
    }
  };

  const openEditor = (template, exercises) => {
    setEditingTemplate(template);
    setSnapshot(exercises ?? null);
    setError("");
    setView("edit");
  };

  const handleLoad = (template) => {
    onLoadTemplate(template.exercises);
    setOpen(false);
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete ${template.name}?`)) return;
    try {
      await deleteTemplate(template.id);
      setTemplates(templates.filter((t) => t.id !== template.id));
    } catch {
      setError("Could not delete the workout.");
    }
  };

  const handleEditorSave = async (name, exercises) => {
    try {
      const saved = editingTemplate
        ? await updateTemplate(editingTemplate.id, { name, exercises })
        : await createTemplate(name, exercises);
      setTemplates(
        (editingTemplate
          ? templates.map((t) => (t.id === saved.id ? saved : t))
          : templates.concat(saved)
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      setError("");
      setView("list");
    } catch (err) {
      setError(err.message || "Could not save the workout.");
    }
  };

  const saveTodaySnapshot = () =>
    dayExercises.map(({ name, weight, sets, reps, notes }) => ({
      name,
      weight,
      sets,
      reps,
      notes,
    }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Workouts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        {view === "list" ? (
          <>
            <DialogHeader>
              <DialogTitle>Saved Workouts</DialogTitle>
              <DialogDescription>
                Load a workout into the selected day, or save a new one
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-destructive text-sm">{error}</p>}
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved workouts yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{t.name}</span>
                        {t.isSample && <Badge variant="secondary">Sample</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t.exercises.length}{" "}
                        {t.exercises.length === 1 ? "exercise" : "exercises"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => handleLoad(t)}>
                        Load
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditor(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(t)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                <Button type="button" onClick={() => openEditor(null)}>
                  New workout
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={dayExercises.length === 0}
                  onClick={() => openEditor(null, saveTodaySnapshot())}
                >
                  Save today as workout
                </Button>
              </div>
              {dayExercises.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add exercises to the selected day to save it as a workout.
                </p>
              )}
            </div>
          </>
        ) : (
          <TemplateEditor
            key={editingTemplate?.id ?? "new"}
            initialName={editingTemplate?.name ?? ""}
            initialExercises={editingTemplate?.exercises ?? snapshot ?? []}
            error={error}
            onSave={handleEditorSave}
            onCancel={() => {
              setError("");
              setView("list");
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
