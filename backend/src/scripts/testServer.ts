import { io as Client } from "socket.io-client";

const BASE_URL = "http://localhost:4000";

async function run() {
  console.log("🧪 Starting automated backend & Socket.IO test with MongoDB...");

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  console.log("1️⃣ Health check status:", healthRes.status, await healthRes.json());

  // 2. Register Alice
  const aliceEmail = `alice_${Date.now()}@test.com`;
  const regAliceRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Walker",
      email: aliceEmail,
      password: "password123",
    }),
  });
  const aliceData = (await regAliceRes.json()) as any;
  console.log("2️⃣ Alice registered:", aliceData.user.name, "(id:", aliceData.user.id, ")");

  // 3. Register Bob
  const bobEmail = `bob_${Date.now()}@test.com`;
  const regBobRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Bob Stone",
      email: bobEmail,
      password: "password123",
    }),
  });
  const bobData = (await regBobRes.json()) as any;
  console.log("3️⃣ Bob registered:", bobData.user.name, "(id:", bobData.user.id, ")");

  // 4. Create Direct Conversation between Alice and Bob
  const convRes = await fetch(`${BASE_URL}/api/conversations/direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aliceData.token}`,
    },
    body: JSON.stringify({
      participantId: bobData.user.id,
    }),
  });
  const convData = (await convRes.json()) as any;
  const conversationId = convData.conversation.id || convData.conversation._id;
  console.log("4️⃣ Conversation created in MongoDB:", conversationId);

  // 5. Connect Alice via Socket.IO
  const aliceSocket = Client(BASE_URL, {
    auth: { token: aliceData.token },
  });

  // 6. Connect Bob via Socket.IO
  const bobSocket = Client(BASE_URL, {
    auth: { token: bobData.token },
  });

  await new Promise<void>((resolve) => {
    let connectedCount = 0;
    const checkBoth = () => {
      connectedCount++;
      if (connectedCount === 2) resolve();
    };

    aliceSocket.on("socket:connected", (data) => {
      console.log("⚡ Alice socket connected:", data.socketId);
      checkBoth();
    });

    bobSocket.on("socket:connected", (data) => {
      console.log("⚡ Bob socket connected:", data.socketId);
      checkBoth();
    });
  });

  // 7. Join Conversation Room
  await new Promise<void>((resolve) => {
    bobSocket.emit("conversation:join", { conversationId }, (res: any) => {
      console.log("5️⃣ Bob joined conversation room:", res);
      aliceSocket.emit("conversation:join", { conversationId }, (res2: any) => {
        console.log("5️⃣ Alice joined conversation room:", res2);
        resolve();
      });
    });
  });

  // 8. Test Typing indicator: Alice starts typing, Bob should receive it
  const typingPromise = new Promise<void>((resolve) => {
    bobSocket.on("typing:start", (data) => {
      console.log("6️⃣ Bob received typing event from:", data.userName);
      resolve();
    });
  });

  aliceSocket.emit("typing:start", { conversationId });
  await typingPromise;

  // 9. Test Send Message: Alice sends message, Bob should receive "message:new"
  const messagePromise = new Promise<void>((resolve) => {
    bobSocket.on("message:new", (msg) => {
      console.log("7️⃣ Bob received real-time message:", msg.content, "(Authoritative MongoDB id:", msg.id || msg._id, ")");
      resolve();
    });
  });

  aliceSocket.emit(
    "message:send",
    {
      conversationId,
      content: "Hello Bob! MongoDB Mongoose real-time chat is working smoothly!",
      messageType: "text",
    },
    (ack: any) => {
      console.log("8️⃣ Alice received authoritative server ACK:", ack.success);
    }
  );

  await messagePromise;

  // 10. Clean up
  aliceSocket.disconnect();
  bobSocket.disconnect();
  console.log("🎉 All tests passed successfully with MongoDB & Mongoose!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
