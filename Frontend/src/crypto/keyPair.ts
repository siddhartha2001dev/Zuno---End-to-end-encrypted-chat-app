import { loadKeyPair, saveKeyPair } from "./keyStorage";

/**
 * Generates an ECDH P-256 key pair using the browser's native Web Crypto API.
 * The public key is exported as a serialized JWK string suitable for server registration.
 */
export async function generateEcdhKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  publicKeyJwk: string;
}> {
  if (!window.crypto?.subtle) {
    throw new Error("Web Crypto API is not supported in this browser environment");
  }

  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // Must be extractable so the public key can be exported to JWK
    ["deriveKey", "deriveBits"]
  );

  // Export only the public key as JWK string for registration
  const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const publicKeyJwk = JSON.stringify(jwk);

  return { keyPair, publicKeyJwk };
}

/**
 * Checks client-side IndexedDB storage for an existing key pair.
 * If none exists, generates a new key pair and stores it locally.
 */
export async function getOrInitializeKeyPair(userId: string): Promise<{
  keyPair: CryptoKeyPair;
  publicKeyJwk: string;
  isNew: boolean;
}> {
  if (!userId) {
    throw new Error("User ID is required to retrieve or initialize E2EE keys");
  }

  // 1. Check local IndexedDB storage
  const existing = await loadKeyPair(userId);
  if (existing) {
    return {
      keyPair: existing.keyPair,
      publicKeyJwk: existing.publicKeyJwk,
      isNew: false,
    };
  }

  // 2. Generate fresh key pair
  const { keyPair, publicKeyJwk } = await generateEcdhKeyPair();

  // 3. Persist locally in IndexedDB
  await saveKeyPair(userId, keyPair, publicKeyJwk);

  return {
    keyPair,
    publicKeyJwk,
    isNew: true,
  };
}
