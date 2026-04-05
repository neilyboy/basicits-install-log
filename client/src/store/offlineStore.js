import { openDB } from 'idb';

const DB_NAME = 'basicits-offline';
const DB_VERSION = 1;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('queue')) {
          const store = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('created_at', 'created_at');
        }
        if (!db.objectStoreNames.contains('pending_photos')) {
          db.createObjectStore('pending_photos', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function addToOfflineQueue(operation) {
  const db = await getDb();
  return db.add('queue', { ...operation, created_at: Date.now() });
}

export async function getOfflineQueue() {
  const db = await getDb();
  return db.getAll('queue');
}

export async function removeFromOfflineQueue(id) {
  const db = await getDb();
  return db.delete('queue', id);
}

export async function clearOfflineQueue() {
  const db = await getDb();
  return db.clear('queue');
}

export async function addPendingPhotos(device_id, files) {
  const db = await getDb();
  const records = [];
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const id = await db.add('pending_photos', {
      device_id,
      name: file.name,
      type: file.type,
      data: buf,
      created_at: Date.now(),
    });
    records.push(id);
  }
  return records;
}

export async function getPendingPhotos(device_id) {
  const db = await getDb();
  const all = await db.getAll('pending_photos');
  return all.filter(p => p.device_id === device_id);
}

export async function removePendingPhoto(id) {
  const db = await getDb();
  return db.delete('pending_photos', id);
}

export async function getQueueCount() {
  const db = await getDb();
  return db.count('queue');
}
