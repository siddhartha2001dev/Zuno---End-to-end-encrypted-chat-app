/**
 * Migration script: Assign chatId to existing users who don't have one.
 *
 * Generates a chatId from the user's name (lowercase, stripped of special chars)
 * plus a random 4-digit suffix to ensure uniqueness.
 *
 * Usage: npx ts-node --esm src/scripts/migrateChatId.ts
 *   or:  npx tsx src/scripts/migrateChatId.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserModel } from "../models/user.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || "";

function generateChatId(name: string): string {
  // Take the name, lowercase it, keep only letters and numbers, replace spaces with dots
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 20);

  // Ensure it starts with a letter
  const safeBase = /^[a-z]/.test(base) ? base : `user.${base}`;

  // Add a random numeric suffix
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${safeBase}${suffix}`;
}

async function migrate() {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI not found in environment variables");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected");

  // Find all users without a chatId
  const usersWithoutChatId = await UserModel.find({
    $or: [{ chatId: { $exists: false } }, { chatId: null }, { chatId: "" }],
  });

  console.log(`📋 Found ${usersWithoutChatId.length} users without a chatId`);

  if (usersWithoutChatId.length === 0) {
    console.log("✅ All users already have a chatId. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // Collect all existing chatIds to avoid collisions
  const existingChatIds = new Set(
    (await UserModel.find({ chatId: { $exists: true, $nin: [null, ""] } }).select("chatId")).map(
      (u) => u.chatId
    )
  );

  let updated = 0;
  for (const user of usersWithoutChatId) {
    let candidateId = generateChatId(user.name || "user");

    // Ensure uniqueness
    let attempts = 0;
    while (existingChatIds.has(candidateId) && attempts < 100) {
      candidateId = generateChatId(user.name || "user");
      attempts++;
    }

    if (existingChatIds.has(candidateId)) {
      // Fallback: use MongoDB _id suffix
      candidateId = `user.${user._id.toString().slice(-8)}`;
    }

    existingChatIds.add(candidateId);

    await UserModel.findByIdAndUpdate(user._id, { chatId: candidateId });
    console.log(`  ✅ ${user.email} → @${candidateId}`);
    updated++;
  }

  console.log(`\n🎉 Migration complete! Updated ${updated} users.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
