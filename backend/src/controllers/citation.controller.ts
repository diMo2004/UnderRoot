import { Request, Response } from "express";
import axios from "axios";
import { cacheService } from "../services/redis.service";
import { config } from "../config/env";

const CACHE_TTL = 86400; // 24 hours

export async function suggestCitations(req: Request, res: Response): Promise<void> {
  try {
    const { text, projectId } = req.body;
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const cacheKey = cacheService.generateKey("citations", Buffer.from(text).toString("base64").slice(0, 64));
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const aiResponse = await axios.post(`${config.aiServiceUrl}/api/citations/suggest`, {
      text,
      project_id: projectId,
    });

    await cacheService.set(cacheKey, aiResponse.data, CACHE_TTL);
    res.json(aiResponse.data);
  } catch (err) {
    console.error("Citation controller error:", err);
    res.status(500).json({ error: "Failed to fetch citation suggestions" });
  }
}
