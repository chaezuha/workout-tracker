import { createLocalStore } from "@/services/localStore";
import { CACHE_KEYS } from "@/lib/syncKeys";

// The signed-in user's local mirror of their Supabase data. Services write it
// first (local-first) and read it when offline; services/sync.js keeps it in
// step with the server.
export const cacheStore = createLocalStore(CACHE_KEYS);
