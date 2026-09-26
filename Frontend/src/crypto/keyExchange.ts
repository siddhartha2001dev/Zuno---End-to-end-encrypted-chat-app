/**
 * ECDH Key Agreement and Derivation of AES-GCM 256-bit encryption keys.
 *
 * User A private key + User B public key -> ECDH -> Shared AES-GCM key
 * User B private key + User A public key -> ECDH -> Identical Shared AES-GCM key
 */

const derivedKeyCache = new Map<string, CryptoKey>();

/**
 * Imports a peer's serialized JWK public key into a Web Crypto CryptoKey.
 */
export async function importPeerPublicKey(publicKeyJwk: string): Promise<CryptoKey> {
  if (!publicKeyJwk || typeof publicKeyJwk !== "string") {
    throw new Error("Invalid peer public key: expected non-empty string");
  }

  let parsedJwk: JsonWebKey;
  try {
    parsedJwk = JSON.parse(publicKeyJwk);
  } catch {
    throw new Error("Failed to parse peer public key: malformed JWK JSON");
  }

  if (parsedJwk.kty !== "EC" || parsedJwk.crv !== "P-256" || !parsedJwk.x || !parsedJwk.y) {
    throw new Error("Invalid peer public key: must be an EC P-256 public key");
  }

  return window.crypto.subtle.importKey(
    "jwk",
    parsedJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

/**
 * Derives a 256-bit AES-GCM symmetric key using ECDH key agreement.
 * Uses an in-memory cache to avoid redundant derivations for the same peer.
 */
export async function deriveConversationKey(
  ownPrivateKey: CryptoKey,
  peerPublicKeyJwk: string,
  cacheIdentifier?: string
): Promise<CryptoKey> {
  // Ensure cache key ALWAYS includes the peer public key so key rotations never return stale AES keys
  const cacheKey = cacheIdentifier ? `${cacheIdentifier}:${peerPublicKeyJwk}` : peerPublicKeyJwk;
  if (derivedKeyCache.has(cacheKey)) {
    return derivedKeyCache.get(cacheKey)!;
  }

  const peerPublicKey = await importPeerPublicKey(peerPublicKeyJwk);

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: peerPublicKey,
    },
    ownPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // Non-extractable derived AES key
    ["encrypt", "decrypt"]
  );

  derivedKeyCache.set(cacheKey, derivedKey);
  return derivedKey;
}

export function clearDerivedKeyCache(): void {
  derivedKeyCache.clear();
}
