import { Library, Plus, Save } from "@/components/ui/icons";
import { OverflowMenu } from "@/components/ui/overflow-menu";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeaderBar,
  DialogHeaderClose,
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
        <Button type="button" variant="ghost" aria-label="Saved workouts" className="max-sm:w-11 max-sm:px-0">
          <Library aria-hidden />
          <span className="hidden sm:inline">Workouts</span>
        </Button>
      </DialogTrigger>
      <DialogContent headerbar className="sm:max-w-md">
        {view === "list" ? (
          <>
            <DialogHeaderBar title="Saved Workouts" end={<DialogHeaderClose />} />
            <DialogDescription>
              Load one into the selected day, or save a new one.
            </DialogDescription>
            {error && <p className="text-destructive text-sm">{error}</p>}
            {templates.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No saved workouts yet
              </p>
            ) : (
              <ul className="boxed-list">
                {templates.map((t) => (
                  <li key={t.id} className="row">
                    <div className="row-body">
                      <span className="row-title">{t.name}</span>
                      <span className="row-subtitle">
                        {t.exercises.length}{" "}
                        {t.exercises.length === 1 ? "exercise" : "exercises"}
                        {t.isSample && " · Sample"}
                      </span>
                    </div>
                    <div className="row-suffix">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleLoad(t)}>
                        Load
                      </Button>
                      <OverflowMenu label={`Actions for ${t.name}`} actions={[
                        { label: "Edit Workout", onSelect: () => openEditor(t) },
                        { label: "Delete Workout", onSelect: () => handleDelete(t) },
                      ]} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="boxed-list">
              <button type="button" className="row row-activatable" onClick={() => openEditor(null)}>
                <Plus className="size-4" aria-hidden />
                <span className="row-body">New Workout</span>
              </button>
              <button
                type="button"
                className="row row-activatable disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                disabled={dayExercises.length === 0}
                onClick={() => openEditor(null, saveTodaySnapshot())}
              >
                <Save className="size-4" aria-hidden />
                <span className="row-body">
                  <span className="row-title">Save Day as Workout</span>
                  {dayExercises.length === 0 && (
                    <span className="row-subtitle">Add exercises to this day first</span>
                  )}
                </span>
              </button>
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
