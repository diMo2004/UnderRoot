import { Pool } from "pg";
import mongoose from "mongoose";
import { config } from "./env";

export const pgPool = new Pool({ connectionString: config.databaseUrl });

pgPool.on("connect", () => console.log("✅ PostgreSQL connected"));
pgPool.on("error", (err) => console.error("❌ PostgreSQL error:", err));

export async function connectMongo() {
  try {
    await mongoose.connect(config.mongodbUrl);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
