import { openDB } from 'idb';

export const SAVES_STORE = 'saves';
export const EXPORT_DRAFTS_STORE = 'export-drafts';

const DATABASE_NAME = 'tenna';
const DATABASE_VERSION = 3;

export const browserDatabase = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(SAVES_STORE)) {
      db.createObjectStore(SAVES_STORE);
    }
    if (!db.objectStoreNames.contains(EXPORT_DRAFTS_STORE)) {
      db.createObjectStore(EXPORT_DRAFTS_STORE);
    }
  },
});
