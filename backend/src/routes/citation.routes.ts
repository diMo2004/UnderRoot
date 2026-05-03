import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { citationLimiter } from "../middleware/rateLimiter";
import { addCitation, getProjectBibliography, suggestCitations } from "../controllers/citation.controller";

const router = Router();

router.post("/suggest", authMiddleware, citationLimiter, suggestCitations);
router.post("/add", authMiddleware, citationLimiter, addCitation);
router.get("/project/:projectId", authMiddleware, getProjectBibliography);

export default router;