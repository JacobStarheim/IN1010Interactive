export type ProgressSnapshot = {
  version: 1;
  updatedAt: string;
  entries: Record<string, string>;
};

export const CLOUD_OWNER_STORAGE_KEY = "in1010:cloud-owner";
export const LOCAL_PROGRESS_CHANGE_EVENT = "in1010:local-progress-change";

export const createEmptyProgressSnapshot = (): ProgressSnapshot => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  entries: {},
});

export const isProgressEntryKey = (key: string) =>
  key.startsWith("in1010:") && key !== CLOUD_OWNER_STORAGE_KEY;

export const createLocalProgressSnapshot = (
  storage: Storage | null | undefined
): ProgressSnapshot => {
  if (!storage) {
    return createEmptyProgressSnapshot();
  }

  const entries: Record<string, string> = {};
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !isProgressEntryKey(key)) {
      continue;
    }

    const value = storage.getItem(key);
    if (value !== null) {
      entries[key] = value;
    }
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  };
};

export const applyProgressSnapshot = (
  storage: Storage | null | undefined,
  snapshot: ProgressSnapshot
) => {
  if (!storage) {
    return false;
  }

  const incomingEntries = snapshot.entries ?? {};
  const currentKeys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && isProgressEntryKey(key)) {
      currentKeys.push(key);
    }
  }

  let changed = false;
  currentKeys.forEach((key) => {
    if (!(key in incomingEntries)) {
      storage.removeItem(key);
      changed = true;
    }
  });

  Object.entries(incomingEntries).forEach(([key, value]) => {
    if (storage.getItem(key) !== value) {
      storage.setItem(key, value);
      changed = true;
    }
  });

  return changed;
};

export const mergeProgressSnapshots = (
  remote: ProgressSnapshot,
  local: ProgressSnapshot
): ProgressSnapshot => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  entries: {
    ...(remote.entries ?? {}),
    ...(local.entries ?? {}),
  },
});
