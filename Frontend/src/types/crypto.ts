export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded ciphertext + auth tag
  iv: string;         // Base64 encoded 12-byte initialization vector
}

export interface DecryptionResult {
  plaintext: string;
  success: boolean;
  error?: string;
}

export interface StoredKeyPair {
  userId: string;
  keyPair: CryptoKeyPair;
  publicKeyJwk: string;
  createdAt: number;
}
