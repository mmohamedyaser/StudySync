import type { DocState, Chunk, Doc } from "./types";

// ponytail: module-level Map, lost on cold start. Single Promise chain mutex
// is enough because Node event loop is single-threaded and /api/* are stateless.

type Store = {
  docs: Map<string, DocState>;
  locks: Map<string, Promise<unknown>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __studysyncStore: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__studysyncStore) {
    globalThis.__studysyncStore = {
      docs: new Map(),
      locks: new Map(),
    };
  }
  return globalThis.__studysyncStore;
}

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const store = getStore();
  const prev = store.locks.get(key) ?? Promise.resolve();
  let release: () => void = () => {};
  const next = new Promise<void>((res) => (release = res));
  store.locks.set(key, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function addDoc(state: DocState): void {
  getStore().docs.set(state.doc.id, state);
}

export function removeDoc(id: string): void {
  getStore().docs.delete(id);
}

export function getDoc(id: string): DocState | undefined {
  return getStore().docs.get(id);
}

export function listDocs(): Doc[] {
  return Array.from(getStore().docs.values()).map((s) => s.doc);
}

export function getAllChunks(): Array<Chunk & { filename: string }> {
  const out: Array<Chunk & { filename: string }> = [];
  for (const state of getStore().docs.values()) {
    for (const chunk of state.chunks) {
      out.push({ ...chunk, filename: state.doc.filename });
    }
  }
  return out;
}

export function isEmpty(): boolean {
  return getStore().docs.size === 0;
}

export function size(): number {
  return getStore().docs.size;
}