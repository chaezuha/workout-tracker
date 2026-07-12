// localStorage writes can fail (quota, private mode, eviction). The stores
// stay UI-free and announce failures with a window event, mirroring the
// sync:op-dropped pattern in services/sync.js; StorageWarningBanner listens.
export const STORAGE_WRITE_FAILED_EVENT = "storage:write-failed";

export function reportStorageWriteFailure() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORAGE_WRITE_FAILED_EVENT));
  }
}
