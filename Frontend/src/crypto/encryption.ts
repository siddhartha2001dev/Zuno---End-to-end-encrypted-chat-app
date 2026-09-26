import { arrayBufferToBase64, generateIv, utf8Encode } from "./cryptoUtils";
import type { EncryptedPayload } from "../types/crypto";

/**
 * Encrypts a plaintext message using AES-GCM with a fresh 12-byte IV.
 * Returns base64-encoded ciphertext (including 128-bit authentication tag) and IV.
 */
export async function encryptMessage(
  plaintext: string,
  aesKey: CryptoKey
): Promise<EncryptedPayload> {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty message");
  }

  if (!aesKey) {
    throw new Error("Missing encryption key");
  }

  // 1. Generate fresh 12-byte random IV
  const iv = generateIv();

  // 2. Encode UTF-8 plaintext
  const encodedPlaintext = utf8Encode(plaintext);

  // 3. Encrypt with AES-GCM
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    aesKey,
    encodedPlaintext as any
  );

  // 4. Return transport-safe base64 strings
  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
  };
}
