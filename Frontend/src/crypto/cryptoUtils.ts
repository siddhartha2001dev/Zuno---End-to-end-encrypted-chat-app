/**
 * Utility functions for client-side cryptographic operations
 * using standard browser Web Crypto API and UTF-8 encoding.
 */

export function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * Generates a cryptographically secure 96-bit (12-byte) random initialization vector (IV)
 * recommended by NIST for AES-GCM.
 */
export function generateIv(): Uint8Array {
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  return iv;
}

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function utf8Decode(buffer: ArrayBuffer | ArrayBufferView): string {
  return new TextDecoder().decode(buffer);
}
