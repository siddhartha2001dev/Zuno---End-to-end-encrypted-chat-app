import { io as Client } from "socket.io-client";
import { webcrypto } from "crypto";

// Use Node's standard webcrypto (identical to browser Web Crypto API)
const crypto = webcrypto as any;

const BASE_URL = "http://localhost:4000";

// Helper: ECDH P-256 Key generation & export
async function generateUserKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return {
    keyPair,
    publicKeyJwk: JSON.stringify(jwk),
  };
}

// Helper: Import peer JWK public key
async function importPeerKey(jwkString: string): Promise<any> {
  const parsed = JSON.parse(jwkString);
  return crypto.subtle.importKey(
    "jwk",
    parsed,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

// Helper: ECDH AES-GCM Key derivation
async function deriveSharedKey(privateKey: any, peerPublicKeyJwk: string): Promise<any> {
  const peerKey = await importPeerKey(peerPublicKeyJwk);
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Helper: AES-GCM Encrypt
async function encrypt(plaintext: string, aesKey: any) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoded
  );
  return {
    ciphertext: Buffer.from(ciphertextBuffer).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
  };
}

// Helper: AES-GCM Decrypt
async function decrypt(ciphertextBase64: string, ivBase64: string, aesKey: any) {
  const ciphertextBuffer = Buffer.from(ciphertextBase64, "base64");
  const iv = Buffer.from(ivBase64, "base64");
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    aesKey,
    ciphertextBuffer
  );
  return new TextDecoder().decode(decryptedBuffer);
}

async function runTest() {
  console.log("🧪 STARTING FULL E2EE TEST FLOW VERIFICATION\n");

  // 1. Register Alice
  const timestamp = Date.now();
  const aliceRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Tester",
      email: `alice_${timestamp}@e2ee.com`,
      password: "password123",
    }),
  });
  const aliceData = (await aliceRes.json()) as any;
  console.log("1️⃣ Alice Registered:", aliceData.user.id);

  // 2. Register Bob
  const bobRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Bob Tester",
      email: `bob_${timestamp}@e2ee.com`,
      password: "password123",
    }),
  });
  const bobData = (await bobRes.json()) as any;
  console.log("2️⃣ Bob Registered:", bobData.user.id);

  // 3. Alice generates ECDH P-256 keys and uploads public key
  const aliceKeys = await generateUserKeyPair();
  const aliceKeyUploadRes = await fetch(`${BASE_URL}/api/users/public-key`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aliceData.token}`,
    },
    body: JSON.stringify({ publicKey: aliceKeys.publicKeyJwk }),
  });
  const aliceKeyResult = (await aliceKeyUploadRes.json()) as any;
  if (!aliceKeyResult.success) throw new Error("Failed to upload Alice public key");
  console.log("3️⃣ Alice Public Key Registered to DB");

  // 4. Bob generates ECDH P-256 keys and uploads public key
  const bobKeys = await generateUserKeyPair();
  const bobKeyUploadRes = await fetch(`${BASE_URL}/api/users/public-key`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bobData.token}`,
    },
    body: JSON.stringify({ publicKey: bobKeys.publicKeyJwk }),
  });
  const bobKeyResult = (await bobKeyUploadRes.json()) as any;
  if (!bobKeyResult.success) throw new Error("Failed to upload Bob public key");
  console.log("4️⃣ Bob Public Key Registered to DB");

  // 5. Create Direct Conversation between Alice and Bob
  const convRes = await fetch(`${BASE_URL}/api/conversations/direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aliceData.token}`,
    },
    body: JSON.stringify({ participantId: bobData.user.id }),
  });
  const convData = (await convRes.json()) as any;
  const conversation = convData.conversation;
  console.log("5️⃣ Conversation Created:", conversation.id);

  // Verify conversation members shape
  if (!Array.isArray(conversation.members) || conversation.members.length !== 2) {
    throw new Error("Conversation members invalid");
  }
  const bobMember = conversation.members.find((m: any) => m.userId === bobData.user.id);
  if (!bobMember || !bobMember.user?.publicKey) {
    throw new Error("Bob member or public key missing from created conversation");
  }
  console.log("   ✅ Member shape validated with user.publicKey populated");

  // 6. Connect Alice and Bob via Socket.IO
  const aliceSocket = Client(BASE_URL, { auth: { token: aliceData.token } });
  const bobSocket = Client(BASE_URL, { auth: { token: bobData.token } });

  await new Promise<void>((resolve) => {
    let connected = 0;
    aliceSocket.on("socket:connected", () => {
      connected++;
      if (connected === 2) resolve();
    });
    bobSocket.on("socket:connected", () => {
      connected++;
      if (connected === 2) resolve();
    });
  });
  console.log("6️⃣ Both Sockets Connected");

  // Join rooms
  await new Promise<void>((resolve) => {
    aliceSocket.emit("conversation:join", { conversationId: conversation.id }, () => {
      bobSocket.emit("conversation:join", { conversationId: conversation.id }, () => {
        resolve();
      });
    });
  });
  console.log("   ✅ Both Sockets Joined Room");

  // 7. Derive Shared Secret on both sides independently
  const aliceAesKey = await deriveSharedKey(aliceKeys.keyPair.privateKey, bobMember.user.publicKey);
  const bobAesKey = await deriveSharedKey(bobKeys.keyPair.privateKey, aliceKeys.publicKeyJwk);

  // 8. TEST 1 & 2: Alice sends E2EE message "Hello Bob! E2EE verified"
  const secretMessage1 = "Hello Bob! E2EE verified";
  const encrypted1 = await encrypt(secretMessage1, aliceAesKey);

  console.log("7️⃣ Alice Encrypted Message Locally:");
  console.log("   Ciphertext (Base64):", encrypted1.ciphertext.substring(0, 30) + "...");
  console.log("   IV (Base64):", encrypted1.iv);

  const bobReceivedPromise1 = new Promise<any>((resolve) => {
    bobSocket.on("message:new", (msg) => {
      resolve(msg);
    });
  });

  const ack = await new Promise<any>((resolve) => {
    aliceSocket.emit(
      "message:send",
      {
        conversationId: conversation.id,
        ciphertext: encrypted1.ciphertext,
        iv: encrypted1.iv,
        messageType: "text",
      },
      (res: any) => resolve(res)
    );
  });

  if (!ack.success) {
    throw new Error(`Server rejected encrypted message: ${ack.error}`);
  }
  console.log("8️⃣ Server Acknowledged Message Send: success =", ack.success);

  const bobReceived1 = await bobReceivedPromise1;
  console.log("9️⃣ Bob Received Real-Time Socket.IO message:new event");
  console.log("   Received ciphertext:", bobReceived1.ciphertext?.substring(0, 30) + "...");
  console.log("   Received plaintext content:", JSON.stringify(bobReceived1.content));

  if (bobReceived1.content !== "") {
    throw new Error(`SECURITY LEAK: Server returned non-empty plaintext content: "${bobReceived1.content}"`);
  }

  // Bob decrypts
  const decrypted1 = await decrypt(bobReceived1.ciphertext, bobReceived1.iv, bobAesKey);
  console.log("🔟 Bob Decrypted Message Locally:", JSON.stringify(decrypted1));
  if (decrypted1 !== secretMessage1) {
    throw new Error(`Decrypted message mismatch! Expected "${secretMessage1}", got "${decrypted1}"`);
  }
  console.log("   ✅ Plaintext matched perfectly!");

  // 9. TEST 6: Send second message with fresh random IV
  const secretMessage2 = "Second message with fresh IV!";
  const encrypted2 = await encrypt(secretMessage2, aliceAesKey);
  if (encrypted2.iv === encrypted1.iv) {
    throw new Error("SECURITY FAILURE: IV must be randomly generated for each message!");
  }
  console.log("1️⃣1️⃣ Second Message Fresh IV Verified (IV1 != IV2)");

  const bobReceivedPromise2 = new Promise<any>((resolve) => {
    bobSocket.once("message:new", (msg) => {
      resolve(msg);
    });
  });

  await new Promise<any>((resolve) => {
    aliceSocket.emit(
      "message:send",
      {
        conversationId: conversation.id,
        ciphertext: encrypted2.ciphertext,
        iv: encrypted2.iv,
        messageType: "text",
      },
      (res: any) => resolve(res)
    );
  });

  const bobReceived2 = await bobReceivedPromise2;
  const decrypted2 = await decrypt(bobReceived2.ciphertext, bobReceived2.iv, bobAesKey);
  if (decrypted2 !== secretMessage2) {
    throw new Error("Second message decryption failed!");
  }
  console.log("   ✅ Second message decrypted successfully!");

  // 10. TEST 5: REST History retrieval and decryption
  const historyRes = await fetch(`${BASE_URL}/api/conversations/${conversation.id}/messages`, {
    headers: { Authorization: `Bearer ${bobData.token}` },
  });
  const historyData = (await historyRes.json()) as any;
  console.log("1️⃣2️⃣ Retrieved Message History:", historyData.messages.length, "messages");
  for (const m of historyData.messages) {
    if (m.content !== "") {
      throw new Error("SECURITY LEAK: Historical message contains plaintext in DB!");
    }
    const dec = await decrypt(m.ciphertext, m.iv, bobAesKey);
    console.log(`   Decrypted history message id ${m.id}: "${dec}"`);
  }
  console.log("   ✅ All historical messages encrypted in DB and decrypted locally!");

  // Clean up
  aliceSocket.disconnect();
  bobSocket.disconnect();

  console.log("\n🎉 ALL E2EE TESTS PASSED SUCCESSFULLY! ZERO PLAINTEXT SENT OR STORED.");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ Full E2EE test failed:", err);
  process.exit(1);
});
