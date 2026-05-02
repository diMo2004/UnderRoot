import { Router } from "express";
import { exportProject } from "../controllers/export.controller";

const router = Router();

router.post("/", exportProject);

export default router;
