import { Request, Response } from "express";
import { Project } from "../models/project.model";

export const createProject = async (req: Request, res: Response) => {
  try {
    const { title, ownerId, metadata } = req.body;
    const project = new Project({
      title,
      ownerId: ownerId || "anonymous", // Fallback for demonstration
      metadata,
    });
    await project.save();
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const listProjects = async (req: Request, res: Response) => {
  try {
    const projects = await Project.find().sort({ lastModified: -1 });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModified: new Date() },
      { new: true }
    );
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
