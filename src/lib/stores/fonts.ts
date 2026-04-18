/**
 * IndexedDB-backed font cache.
 *
 * Stores font blobs keyed by file name with a version tag so the cache
 * can be invalidated when the bundled fonts change.
 */

import { openDB, FONTS_STORE } from './db';

export interface CachedFont {
  /** Font file name (e.g. "SIMHEI.TTF") */
  name: string;
  /** Blob URL data */
  data: Uint8Array;
  /** Version tag used for invalidation */
  version: string;
  /** Whether this is a user-added custom font */
  custom?: boolean;
}

/** Get all cached fonts. */
export async function getAllFonts(): Promise<CachedFont[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONTS_STORE, 'readonly');
    const req = tx.objectStore(FONTS_STORE).getAll();
    req.onsuccess = () => resolve(req.result as CachedFont[]);
    req.onerror = () => reject(req.error);
  });
}

/** Get a single cached font by name. */
export async function getCachedFont(name: string): Promise<CachedFont | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONTS_STORE, 'readonly');
    const req = tx.objectStore(FONTS_STORE).get(name);
    req.onsuccess = () => resolve(req.result as CachedFont | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Store a font in the cache. */
export async function putFont(font: CachedFont): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONTS_STORE, 'readwrite');
    const req = tx.objectStore(FONTS_STORE).put(font);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Remove a font from the cache. */
export async function removeFont(name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONTS_STORE, 'readwrite');
    const req = tx.objectStore(FONTS_STORE).delete(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Clear all cached fonts. */
export async function clearFontCache(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONTS_STORE, 'readwrite');
    tx.objectStore(FONTS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load fonts with IndexedDB caching. Fetches from network only when the
 * cache is missing or the version tag doesn't match.
 */
export async function loadFontsWithCache(
  fonts: { name: string; url: string }[],
  version: string
): Promise<string[]> {
  const blobUrls: string[] = [];

  for (const font of fonts) {
    let data: Uint8Array | undefined;

    // Check cache
    const cached = await getCachedFont(font.name);
    if (cached && cached.version === version) {
      data = cached.data;
    } else {
      // Fetch and cache
      const res = await fetch(font.url);
      const buf = await res.arrayBuffer();
      data = new Uint8Array(buf);
      await putFont({ name: font.name, data, version });
    }

    const blob = new Blob([new Uint8Array(data)], { type: 'font/woff2' });
    blobUrls.push(URL.createObjectURL(blob));
  }

  return blobUrls;
}
