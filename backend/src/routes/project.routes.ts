import { Router } from "express";
import { 
  createProject, 
  listProjects, 
  getProject, 
  updateProject 
} from "../controllers/project.controller";

const router = Router();

router.post("/", createProject);
router.get("/", listProjects);
router.get("/:id", getProject);
router.put("/:id", updateProject);

export default router;
