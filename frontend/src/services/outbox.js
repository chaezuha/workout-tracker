import { OUTBOX_KEY } from "@/lib/syncKeys";

// Persisted FIFO queue of the signed-in user's pending Supabase writes. Ops
// reference data ("day X changed"), not payloads: services/sync.js derives
// the payload from the cache mirror at flush time, so repeated offline edits
// coalesce into one push and the last local state wins.
//
// Coalescing happens in place — an op keeps its queue position — so the
// ordering invariant "a session's day-save flushes before its duration RPC"
// (see WorkoutPage's save queue) survives.

const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(ops, { silent = false } = {}) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
  } catch (err) {
    console.error("Failed to write sync outbox", err);
  }
  if (!silent) listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function list() {
  return read();
}

export function size() {
  return read().length;
}

export function clear() {
  write([]);
}

export function enqueue(op) {
  const ops = read();
  // rev marks coalesced re-edits: a flush that pushed rev N must not remove
  // an op that has advanced past N in the meantime.
  const bump = (existing) => {
    existing.rev = (existing.rev ?? 0) + 1;
    write(ops);
  };

  if (op.type === "saveDay") {
    const existing = ops.find(
      (o) => o.type === "saveDay" && o.dateKey === op.dateKey,
    );
    if (existing) return bump(existing);
  } else if (op.type === "addDuration") {
    const existing = ops.find(
      (o) => o.type === "addDuration" && o.sessionId === op.sessionId,
    );
    if (existing) {
      existing.seconds += op.seconds;
      return write(ops);
    }
  } else if (op.type === "checkin") {
    const existing = ops.find(
      (o) => o.type === "checkin" && o.dateKey === op.dateKey,
    );
    if (existing) {
      existing.present = op.present;
      return bump(existing);
    }
  } else if (op.type === "templateSave") {
    const existing = ops.find(
      (o) => o.type === "templateSave" && o.templateId === op.templateId,
    );
    if (existing) return bump(existing);
  } else if (op.type === "templateDelete") {
    // The delete supersedes any pending save; it still pushes, since
    // deleting a row that never reached the server is a no-op.
    const remaining = ops.filter(
      (o) => !(o.type === "templateSave" && o.templateId === op.templateId),
    );
    if (
      !remaining.some(
        (o) => o.type === "templateDelete" && o.templateId === op.templateId,
      )
    ) {
      remaining.push({ id: crypto.randomUUID(), rev: 0, ...op });
    }
    return write(remaining);
  }

  ops.push({ id: crypto.randomUUID(), rev: 0, ...op });
  write(ops);
}

// Called after an op's push succeeded. snapshot is what the flush actually
// sent ({ rev } or { seconds }); if the op was coalesced into while the push
// was in flight, the un-pushed remainder stays queued for the next pass.
export function complete(id, snapshot = {}) {
  const ops = read();
  const op = ops.find((o) => o.id === id);
  if (!op) return;
  if (op.type === "addDuration" && snapshot.seconds != null) {
    op.seconds -= snapshot.seconds;
    if (op.seconds > 0) return write(ops);
  } else if (snapshot.rev != null && (op.rev ?? 0) !== snapshot.rev) {
    return; // changed mid-flight; re-derive and re-push next pass
  }
  write(ops.filter((o) => o.id !== id));
}

export function drop(id) {
  write(read().filter((o) => o.id !== id));
}

// Returns the new attempt count. Silent so a failing flush doesn't retrigger
// itself through subscribers.
export function bumpAttempts(id) {
  const ops = read();
  const op = ops.find((o) => o.id === id);
  if (!op) return 0;
  op.attempts = (op.attempts ?? 0) + 1;
  write(ops, { silent: true });
  return op.attempts;
}

// Dates whose local copy has unsynced edits: reads must serve the mirror and
// hydration must not overwrite them.
export function dirtyDates() {
  const dates = new Set();
  for (const op of read()) {
    if (op.type === "saveDay" || op.type === "addDuration") {
      dates.add(op.dateKey);
    }
  }
  return dates;
}

export function pendingTemplateIds() {
  const ids = new Set();
  for (const op of read()) {
    if (op.type === "templateSave" || op.type === "templateDelete") {
      ids.add(op.templateId);
    }
  }
  return ids;
}

export function pendingCheckins() {
  return read()
    .filter((o) => o.type === "checkin")
    .map(({ dateKey, present }) => ({ dateKey, present }));
}
