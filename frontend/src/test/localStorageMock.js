// Minimal in-memory localStorage for Node-based tests. Call
// installLocalStorage() in beforeEach so every test starts with empty storage.
export function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  return globalThis.localStorage;
}
