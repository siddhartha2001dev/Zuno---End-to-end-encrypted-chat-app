import { createServer } from "http";
import { createApp } from "./app.js";
import { initializeSocket } from "./sockets/socket.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";

async function bootstrap() {
  // 1. Connect to PostgreSQL via Prisma
  await connectDB();

  // 2. Initialize Express App
  const app = createApp();

  // 3. Create HTTP Server
  const httpServer = createServer(app);

  // 4. Initialize Socket.IO attached to HTTP Server
  const io = initializeSocket(httpServer);
  app.set("io", io);

  // 5. Start listening on configured port
  httpServer.listen(env.PORT, () => {
    console.log(`
🚀 ========================================== 🚀
   Real-Time Chat Server is running!
   REST API:   http://localhost:${env.PORT}
   Socket.IO:  ws://localhost:${env.PORT}
   Env:        ${env.NODE_ENV}
🚀 ========================================== 🚀
    `);
  });

  // 6. Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    httpServer.close(async () => {
      console.log("🔒 HTTP server closed.");
      io.close(() => {
        console.log("🔌 Socket.IO server closed.");
      });
      await disconnectDB();
      console.log("📦 PostgreSQL connection closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("❌ Fatal error during bootstrap:", err);
  process.exit(1);
});
