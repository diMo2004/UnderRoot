import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  collabPort: parseInt(process.env.COLLAB_PORT || "4001", 10),
  jwtSecret: process.env.JWT_SECRET || "underroot_dev_secret",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://underroot:underroot@localhost:5432/underroot",
  mongodbUrl:
    process.env.MONGODB_URL || "mongodb://localhost:27017/underroot",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
};