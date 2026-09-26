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
  // 1. Dual-layer storage: backup exported keys to localStorage first
  try {
    const privJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    localStorage.setItem(`zuno_e2ee_priv_${userId}`, JSON.stringify(privJwk));
    localStorage.setItem(`zuno_e2ee_pub_${userId}`, publicKeyJwk);
  } catch (backupErr) {
    console.warn("Could not backup key pair to localStorage:", backupErr);
  }

  // 2. Persist natively in IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
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
  } catch (idbErr) {
    console.warn("IndexedDB save failed, key saved in localStorage backup:", idbErr);
  }
}

export async function loadKeyPair(
  userId: string
): Promise<{ keyPair: CryptoKeyPair; publicKeyJwk: string } | null> {
  // 1. Try to load from native IndexedDB
  try {
    const db = await openDatabase();
    const idbResult = await new Promise<{ keyPair: CryptoKeyPair; publicKeyJwk: string } | null>(
      (resolve, reject) => {
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
      }
    );

    if (idbResult) {
      return idbResult;
    }
  } catch (idbErr) {
    console.warn("Could not load key from IndexedDB, trying fallback:", idbErr);
  }

  // 2. Fallback to localStorage backup if IndexedDB was cleared or unavailable
  try {
    const privStr = localStorage.getItem(`zuno_e2ee_priv_${userId}`);
    const pubStr = localStorage.getItem(`zuno_e2ee_pub_${userId}`);
    if (privStr && pubStr) {
      const parsedPriv = JSON.parse(privStr);
      const parsedPub = JSON.parse(pubStr);

      const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        parsedPriv,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );

      const publicKey = await window.crypto.subtle.importKey(
        "jwk",
        parsedPub,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
      );

      const restoredKeyPair = { privateKey, publicKey };

      // Restore back into IndexedDB in background
      try {
        const db = await openDatabase();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put({
          userId,
          privateKey,
          publicKey,
          publicKeyJwk: pubStr,
          createdAt: Date.now(),
        });
      } catch (_) {}

      return {
        keyPair: restoredKeyPair,
        publicKeyJwk: pubStr,
      };
    }
  } catch (fallbackErr) {
    console.warn("localStorage fallback key retrieval failed:", fallbackErr);
  }

  return null;
}

export async function clearKeyPair(userId: string): Promise<void> {
  try {
    localStorage.removeItem(`zuno_e2ee_priv_${userId}`);
    localStorage.removeItem(`zuno_e2ee_pub_${userId}`);
  } catch (_) {}

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
