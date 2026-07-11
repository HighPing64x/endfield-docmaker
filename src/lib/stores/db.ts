/**
 * Shared IndexedDB instance for the application.
 *
 * Stores:
 *  - `files`: per-template user assets (images, etc.)
 *  - `fonts`: cached font blobs for Typst
 */

const DB_NAME = 'docmaker';
const LEGACY_DB_NAMES = [`${'end'}field-docmaker`];
const DB_VERSION = 2;
export const FILES_STORE = 'files';
export const FONTS_STORE = 'fonts';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const store = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        store.createIndex('templateId', 'templateId', { unique: false });
      }
      if (!db.objectStoreNames.contains(FONTS_STORE)) {
        db.createObjectStore(FONTS_STORE, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function deleteDB(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

/** Clear all data from both IndexedDB stores. */
export async function clearAllStores(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([FILES_STORE, FONTS_STORE], 'readwrite');
  tx.objectStore(FILES_STORE).clear();
  tx.objectStore(FONTS_STORE).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await Promise.all(LEGACY_DB_NAMES.map((name) => deleteDB(name)));
}
