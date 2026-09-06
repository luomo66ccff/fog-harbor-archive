import type { StateStorage } from "zustand/middleware";

export type SaveStorageStatus = "ready" | "unavailable" | "recovered";
type Backend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Keep the current investigation playable even when storage is blocked or full. */
export function createSaveStorage(getBackend: () => Backend, legacyKey?: string) {
  const memory = new Map<string, string>();
  const listeners = new Set<() => void>();
  let status: SaveStorageStatus = "ready";
  let protectedOriginal = false;
  let recovery: string | null = null;
  let activeKey: string | null = null;
  const notify = (next: SaveStorageStatus) => {
    if (status === next) return;
    status = next;
    listeners.forEach((listener) => listener());
  };
  const storage: StateStorage = {
    getItem(name) {
      activeKey = name;
      // The in-memory snapshot is newer if the last persistent write failed.
      if (memory.has(name)) return memory.get(name)!;
      let raw: string | null;
      try {
        const backend = getBackend();
        raw = backend.getItem(name);
        // Migration is copy-on-write. The v1 save is retained for rollback.
        if (raw === null && legacyKey && name !== legacyKey) raw = backend.getItem(legacyKey);
      } catch {
        // A failed read is not evidence that the disk is empty. Freeze writes for
        // this session so a later successful write cannot replace unseen progress.
        protectedOriginal = true;
        notify("unavailable");
        return memory.get(name) ?? null;
      }
      if (raw === null) return memory.get(name) ?? null;
      try {
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== "object" || !("state" in value)
          || !value.state || typeof value.state !== "object" || Array.isArray(value.state)) {
          throw new Error("Invalid save envelope");
        }
        memory.set(name, raw);
        return raw;
      } catch {
        recovery = raw;
        try {
          getBackend().setItem(`${name}-recovery`, raw);
          notify("recovered");
        } catch {
          // Never overwrite the only copy if a recovery copy cannot be retained.
          protectedOriginal = true;
          notify("unavailable");
        }
        return memory.get(name) ?? null;
      }
    },
    setItem(name, value) {
      memory.set(name, value);
      if (protectedOriginal) return;
      try {
        getBackend().setItem(name, value);
        if (status === "unavailable") notify("ready");
      } catch {
        notify("unavailable");
      }
    },
    removeItem(name) {
      memory.delete(name);
      if (protectedOriginal) return;
      try {
        getBackend().removeItem(name);
      } catch {
        notify("unavailable");
      }
    },
  };
  return {
    storage,
    getStatus: () => status,
    getRecovery: () => {
      if (recovery !== null || activeKey === null) return recovery;
      try { return getBackend().getItem(`${activeKey}-recovery`); } catch { return null; }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export const caseStorage = createSaveStorage(() => window.localStorage, "fog-harbor-save-v1");
