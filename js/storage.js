/**
 * storage.js
 * Local persistence using IndexedDB (if available) with a localStorage fallback.
 */

const DB_NAME = 'palette-studio';
const STORE_NAME = 'palettes';
let dbPromise = null;

function openDb() {
  if (!('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  return dbPromise;
}

async function useLocalStorageFallback(data) {
  localStorage.setItem(STORE_NAME, JSON.stringify(data));
}

async function readFallback() {
  const stored = localStorage.getItem(STORE_NAME);
  return stored ? JSON.parse(stored) : [];
}

export async function savePalette(palette) {
  const db = await openDb();
  const payload = { ...palette, lastModified: Date.now() };
  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload);
      tx.oncomplete = () => resolve(payload);
      tx.onerror = () => reject(tx.error);
    });
  }
  const existing = await readFallback();
  const index = existing.findIndex((item) => item.id === palette.id);
  if (index >= 0) {
    existing[index] = payload;
  } else {
    existing.push(payload);
  }
  await useLocalStorageFallback(existing);
  return payload;
}

export async function deletePalette(id) {
  const db = await openDb();
  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
  const existing = await readFallback();
  const filtered = existing.filter((item) => item.id !== id);
  await useLocalStorageFallback(filtered);
  return true;
}

export async function listPalettes() {
  const db = await openDb();
  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const items = request.result || [];
        items.sort((a, b) => b.lastModified - a.lastModified);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }
  const fallback = await readFallback();
  fallback.sort((a, b) => b.lastModified - a.lastModified);
  return fallback;
}

export async function filterPalettes({ query = '', tag = '' } = {}) {
  const palettes = await listPalettes();
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTag = tag.trim().toLowerCase();
  return palettes.filter((palette) => {
    const name = (palette.name || '').toLowerCase();
    const matchesQuery = !normalizedQuery ||
      name.includes(normalizedQuery) ||
      palette.colors.some((hex) => hex.toLowerCase().includes(normalizedQuery));
    const matchesTag = !normalizedTag || (palette.tags || []).some((t) => t.toLowerCase().includes(normalizedTag));
    return matchesQuery && matchesTag;
  });
}

export default {
  savePalette,
  deletePalette,
  listPalettes,
  filterPalettes,
};
