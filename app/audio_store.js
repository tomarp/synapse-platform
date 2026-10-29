// Researchers' own soundscape files, kept in the browser (IndexedDB; audio is too large for localStorage).
// A protocol refers to them as "file:<name>"; the file itself must be uploaded in each browser that runs it.

const DB = 'synapse-audio';
const STORE = 'files';

function open() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const saveAudio = (name, blob) => tx('readwrite', (s) => s.put(blob, name));
export const deleteAudio = (name) => tx('readwrite', (s) => s.delete(name));
export const listAudio = () => tx('readonly', (s) => s.getAllKeys()).catch(() => []);

/** URL that an <audio> element can play, or null if the file is not in this browser. */
export async function audioUrl(ref) {
  if (!ref?.startsWith('file:')) return ref;
  const blob = await tx('readonly', (s) => s.get(ref.slice(5))).catch(() => null);
  return blob ? URL.createObjectURL(blob) : null;
}
