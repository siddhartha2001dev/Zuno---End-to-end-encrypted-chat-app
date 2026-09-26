/**
 * Secure client-side persistence for ECDH CryptoKeyPairs using IndexedDB.
 * CryptoKey objects are stored natively using structured cloning without exposing
 * raw private key bytes to localStorage or JavaScript logs.
 */

const DB_NAME = "zuno_e2ee_db";
const DB_VERSION = 1;
const STORE_NAME = "identity_keys";

interface StoredKeyRecord {
  userId: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyJwk: string;
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this browser"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

export async function saveKeyPair(
  userId: string,
  keyPair: CryptoKeyPair,
  publicKeyJwk: string
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: StoredKeyRecord = {
      userId,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicKeyJwk,
      createdAt: Date.now(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to save keys to IndexedDB"));
  });
}

export async function loadKeyPair(
  userId: string
): Promise<{ keyPair: CryptoKeyPair; publicKeyJwk: string } | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(userId);

    request.onsuccess = () => {
      const record = request.result as StoredKeyRecord | undefined;
      if (!record || !record.privateKey || !record.publicKey) {
        return resolve(null);
      }

      resolve({
        keyPair: {
          privateKey: record.privateKey,
          publicKey: record.publicKey,
        },
        publicKeyJwk: record.publicKeyJwk,
      });
    };

    request.onerror = () => reject(request.error || new Error("Failed to load keys from IndexedDB"));
  });
}

export async function clearKeyPair(userId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Failed to delete key from IndexedDB"));
    });
  } catch (err) {
    console.warn("Could not clear key pair for user:", err);
  }
}
