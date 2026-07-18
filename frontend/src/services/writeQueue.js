// All workout writes run one at a time through a single promise chain, in
// call order, app-wide. Two invariants depend on this:
//  - saveDayForDate deletes rows missing from the list it was given, so a
//    save started with a stale list would delete rows a newer overlapping
//    save just inserted.
//  - the outbox flushes in enqueue order, so a brand-new session's saveDay
//    must be enqueued before the addDuration that credits time to it — a
//    timer stopped from any page relies on this.
let chain = Promise.resolve();

export function enqueueWrite(fn) {
  const run = chain.then(() => fn());
  // A rejected write must not wedge the chain; callers see the rejection
  // through the returned promise.
  chain = run.catch(() => {});
  return run;
}

// Test-only: drop any queued work between test cases.
export function _resetWriteQueue() {
  chain = Promise.resolve();
}
