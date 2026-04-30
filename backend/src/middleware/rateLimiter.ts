import { Request, Response, NextFunction } from "express";
import redis from "../config/redis";

function createRateLimiter(limit: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `rate:${req.path}:${ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      if (count > limit) {
        res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        return;
      }
    } catch {
      // If Redis is unavailable, allow the request
    }
    next();
  };
}

const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_HOUR = 60 * 60;

export const citationLimiter = createRateLimiter(20, SECONDS_PER_DAY); // 20/day
export const plagiarismLimiter = createRateLimiter(10, SECONDS_PER_HOUR); // 10/hour
