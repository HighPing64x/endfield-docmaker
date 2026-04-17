/**
 * Shared IndexedDB instance for the application.
 *
 * Stores:
 *  - `files`: per-template user assets (images, etc.)
 *  - `fonts`: cached font blobs for Typst
 */

const DB_NAME = 'endfield-docmaker';
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

/** Migrate from the old single-store DB (`endfield-docmaker-files`). */
export async function migrateOldDB(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.open('endfield-docmaker-files', 1);
    req.onsuccess = () => {
      const oldDb = req.result;
      if (!oldDb.objectStoreNames.contains('files')) {
        oldDb.close();
        resolve();
        return;
      }
      const tx = oldDb.transaction('files', 'readonly');
      const getAll = tx.objectStore('files').getAll();
      getAll.onsuccess = async () => {
        const records = getAll.result;
        oldDb.close();
        if (records.length > 0) {
          const db = await openDB();
          const writeTx = db.transaction(FILES_STORE, 'readwrite');
          const store = writeTx.objectStore(FILES_STORE);
          for (const rec of records) {
            store.put(rec);
          }
        }
        // Delete old DB
        indexedDB.deleteDatabase('endfield-docmaker-files');
        resolve();
      };
      getAll.onerror = () => {
        oldDb.close();
        resolve();
      };
    };
    req.onerror = () => resolve();
    req.onupgradeneeded = () => {
      // Old DB doesn't exist, nothing to migrate
      req.result.close();
      indexedDB.deleteDatabase('endfield-docmaker-files');
      resolve();
    };
  });
}

/** Clear all data from both IndexedDB stores. */
export async function clearAllStores(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([FILES_STORE, FONTS_STORE], 'readwrite');
  tx.objectStore(FILES_STORE).clear();
  tx.objectStore(FONTS_STORE).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
