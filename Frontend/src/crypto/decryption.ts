import { base64ToArrayBuffer, utf8Decode } from "./cryptoUtils";
import type { DecryptionResult } from "../types/crypto";

const DECRYPTION_FAILED_PLACEHOLDER = "🔒 Unable to decrypt this message";

/**
 * Decrypts an AES-GCM encrypted payload using the provided CryptoKey.
 * Catches any cryptographic errors (bad tag, corrupted ciphertext, wrong key)
 * and returns a safe DecryptionResult without crashing the application.
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  aesKey: CryptoKey
): Promise<DecryptionResult> {
  if (!ciphertextBase64 || !ivBase64) {
    return {
      plaintext: DECRYPTION_FAILED_PLACEHOLDER,
      success: false,
      error: "Missing ciphertext or IV",
    };
  }

  if (!aesKey) {
    return {
      plaintext: DECRYPTION_FAILED_PLACEHOLDER,
      success: false,
      error: "Missing decryption key",
    };
  }

  try {
    const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64);
    const ivBuffer = base64ToArrayBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(ivBuffer),
      },
      aesKey,
      ciphertextBuffer
    );

    const plaintext = utf8Decode(decryptedBuffer);
    return {
      plaintext,
      success: true,
    };
  } catch (err: any) {
    // Web Crypto decrypt throws an OperationError if authentication tag fails or data is corrupted
    return {
      plaintext: DECRYPTION_FAILED_PLACEHOLDER,
      success: false,
      error: err?.message || "Decryption failed",
    };
  }
}
