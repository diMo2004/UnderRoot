import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { citationLimiter } from "../middleware/rateLimiter";
import { suggestCitations } from "../controllers/citation.controller";

const router = Router();

router.post("/suggest", authMiddleware, citationLimiter, suggestCitations);

export default router;
