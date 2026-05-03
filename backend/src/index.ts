import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { config } from "./config/env";
import { connectMongo } from "./config/database";
import citationRoutes from "./routes/citation.routes";
import plagiarismRoutes from "./routes/plagiarism.routes";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import exportRoutes from "./routes/export.routes";
import aiRoutes from "./routes/ai.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "underroot-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/citations", citationRoutes);
app.use("/api/plagiarism", plagiarismRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/ai", aiRoutes);

async function start() {
  await connectMongo();
  app.listen(config.port, () => {
    console.log(`🚀 UnderRoot Backend running on port ${config.port}`);
  });
}

start().catch(console.error);

export default app;