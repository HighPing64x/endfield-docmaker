/**
 * IndexedDB-backed file storage for user assets (images, etc.).
 *
 * Files are keyed per template and synchronised with Typst's VFS via mapShadow.
 */

import { openDB, FILES_STORE } from './db';

export interface StoredFile {
  /** Unique key: `${templateId}/${fileName}` */
  id: string;
  templateId: string;
  name: string;
  data: Uint8Array;
  mimeType: string;
}

function fileId(templateId: string, name: string): string {
  return `${templateId}/${name}`;
}

/** Get all files for a given template. */
export async function getFiles(templateId: string): Promise<StoredFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readonly');
    const store = tx.objectStore(FILES_STORE);
    const idx = store.index('templateId');
    const req = idx.getAll(templateId);
    req.onsuccess = () => resolve(req.result as StoredFile[]);
    req.onerror = () => reject(req.error);
  });
}

/** Add or overwrite a file. Returns the stored file record. */
export async function putFile(
  templateId: string,
  name: string,
  data: Uint8Array,
  mimeType: string
): Promise<StoredFile> {
  const db = await openDB();
  const file: StoredFile = { id: fileId(templateId, name), templateId, name, data, mimeType };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readwrite');
    const req = tx.objectStore(FILES_STORE).put(file);
    req.onsuccess = () => resolve(file);
    req.onerror = () => reject(req.error);
  });
}

/** Rename a file. Data is preserved. */
export async function renameFile(
  templateId: string,
  oldName: string,
  newName: string
): Promise<StoredFile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readwrite');
    const store = tx.objectStore(FILES_STORE);
    const getReq = store.get(fileId(templateId, oldName));
    getReq.onsuccess = () => {
      const existing = getReq.result as StoredFile | undefined;
      if (!existing) {
        resolve(null);
        return;
      }
      const delReq = store.delete(fileId(templateId, oldName));
      delReq.onsuccess = () => {
        const updated: StoredFile = {
          ...existing,
          id: fileId(templateId, newName),
          name: newName
        };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve(updated);
        putReq.onerror = () => reject(putReq.error);
      };
      delReq.onerror = () => reject(delReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Remove a file by name. */
export async function removeFile(templateId: string, name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readwrite');
    const req = tx.objectStore(FILES_STORE).delete(fileId(templateId, name));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
