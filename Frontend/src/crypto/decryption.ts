import { base64ToArrayBuffer, utf8Decode } from "./cryptoUtils";
import { importPeerPublicKey } from "./keyExchange";
import type { DecryptionResult } from "../types/crypto";

export const DECRYPTION_FAILED_PLACEHOLDER = "🔒 Unable to decrypt this message";

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

/**
 * Multi-device decryption:
 * Extracts the message key for this specific device from msg.deviceKeys,
 * decrypts it using ECDH(myPrivateKey, senderPublicKey), and uses the recovered
 * message key to decrypt the ciphertext.
 */
export async function decryptMessageMultiDevice(
  msg: {
    ciphertext?: string | null;
    iv?: string | null;
    senderPublicKey?: string | null;
    recipientPublicKey?: string | null;
    deviceKeys?: Record<string, { encryptedKey: string; iv: string }> | null;
  },
  myPrivateKey: CryptoKey,
  myDeviceId: string,
  senderPublicKeyJwk?: string | null
): Promise<DecryptionResult> {
  if (!msg.ciphertext || !msg.iv) {
    return {
      plaintext: DECRYPTION_FAILED_PLACEHOLDER,
      success: false,
      error: "Missing ciphertext or IV",
    };
  }

  const effectiveSenderPubKey = senderPublicKeyJwk || msg.senderPublicKey;

  if (msg.deviceKeys && effectiveSenderPubKey) {
    try {
      const senderPub = await importPeerPublicKey(effectiveSenderPubKey);
      const sharedKey = await window.crypto.subtle.deriveKey(
        {
          name: "ECDH",
          public: senderPub,
        },
        myPrivateKey,
        {
          name: "AES-GCM",
          length: 256,
        },
        false,
        ["decrypt"]
      );

      // Prioritize entry matching this device's deviceId
      const targetEntries: Array<{ encryptedKey: string; iv: string }> = [];
      if (myDeviceId && msg.deviceKeys[myDeviceId]) {
        targetEntries.push(msg.deviceKeys[myDeviceId]);
      }
      // Also iterate through remaining entries in case deviceId changed or was generated anew
      for (const [key, val] of Object.entries(msg.deviceKeys)) {
        if (key !== myDeviceId && val) {
          targetEntries.push(val);
        }
      }

      for (const entry of targetEntries) {
        try {
          const encKeyBuffer = base64ToArrayBuffer(entry.encryptedKey);
          const devIvBuffer = base64ToArrayBuffer(entry.iv);

          const decRawKey = await window.crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: new Uint8Array(devIvBuffer),
            },
            sharedKey,
            encKeyBuffer
          );

          // Import recovered raw 256-bit AES-GCM message key
          const importedMsgKey = await window.crypto.subtle.importKey(
            "raw",
            decRawKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
          );

          // Decrypt payload ciphertext
          const result = await decryptMessage(msg.ciphertext, msg.iv, importedMsgKey);
          if (result.success) {
            return result;
          }
        } catch (_) {
          // Authentication tag mismatch for this key entry — continue trying
        }
      }
    } catch (err: any) {
      console.warn("Multi-device decryption error:", err);
    }
  }

  return {
    plaintext: DECRYPTION_FAILED_PLACEHOLDER,
    success: false,
    error: "Multi-device decryption failed",
  };
}

