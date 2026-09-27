import { arrayBufferToBase64, generateIv, utf8Encode } from "./cryptoUtils";
import { importPeerPublicKey } from "./keyExchange";
import type { EncryptedPayload } from "../types/crypto";

export interface TargetDevice {
  deviceId: string;
  publicKeyJwk: string;
}

export interface MultiDeviceEncryptedPayload {
  ciphertext: string;
  iv: string;
  senderPublicKey: string;
  recipientPublicKey?: string;
  deviceKeys: Record<string, { encryptedKey: string; iv: string }>;
}

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

/**
 * Multi-device hybrid encryption:
 * 1. Generates an ephemeral random 256-bit AES-GCM message key K_msg.
 * 2. Encrypts plaintext payload with K_msg.
 * 3. Encrypts K_msg for each target device (all authorized devices of sender & recipient)
 *    using ECDH(senderPrivateKey, targetDevicePublicKey).
 *
 * This allows all authorized active devices (Device A1, Device A2, Device B1, etc.)
 * to independently decrypt the identical ciphertext using their local private keys.
 */
export async function encryptMessageMultiDevice(
  plaintext: string,
  senderPrivateKey: CryptoKey,
  senderPublicKeyJwk: string,
  targetDevices: TargetDevice[],
  primaryRecipientPublicKeyJwk?: string
): Promise<MultiDeviceEncryptedPayload> {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty message");
  }

  // 1. Generate fresh 256-bit AES-GCM message key
  const msgKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt plaintext payload with message key
  const msgIv = generateIv();
  const encodedPlaintext = utf8Encode(plaintext);
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: msgIv as any,
    },
    msgKey,
    encodedPlaintext as any
  );

  // 3. Export raw key bytes of message key
  const rawMsgKey = await window.crypto.subtle.exportKey("raw", msgKey);

  // 4. Encrypt message key for each recipient/device
  const deviceKeys: Record<string, { encryptedKey: string; iv: string }> = {};

  for (const device of targetDevices) {
    if (!device.publicKeyJwk || !device.deviceId) continue;
    try {
      const devPub = await importPeerPublicKey(device.publicKeyJwk);
      const sharedDevKey = await window.crypto.subtle.deriveKey(
        {
          name: "ECDH",
          public: devPub,
        },
        senderPrivateKey,
        {
          name: "AES-GCM",
          length: 256,
        },
        false,
        ["encrypt"]
      );

      const devIv = generateIv();
      const encKeyBuffer = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: devIv as any,
        },
        sharedDevKey,
        rawMsgKey
      );

      deviceKeys[device.deviceId] = {
        encryptedKey: arrayBufferToBase64(encKeyBuffer),
        iv: arrayBufferToBase64(devIv),
      };
    } catch (err) {
      console.warn(`Failed to encrypt key for device ${device.deviceId}:`, err);
    }
  }

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(msgIv),
    senderPublicKey: senderPublicKeyJwk,
    recipientPublicKey: primaryRecipientPublicKeyJwk,
    deviceKeys,
  };
}

