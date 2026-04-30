import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { plagiarismLimiter } from "../middleware/rateLimiter";
import { checkPlagiarism } from "../controllers/plagiarism.controller";

const router = Router();

router.post("/check", authMiddleware, plagiarismLimiter, checkPlagiarism);

export default router;
