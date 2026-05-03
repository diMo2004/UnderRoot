import { Router } from "express";
import axios from "axios";

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://ai-service:8000";

// Proxy for plagiarism check
router.post("/plagiarism/check", async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/plagiarism/check`, req.body);
    const data = response.data;
    
    // Flatten sections into a single list of results for the Analysis Suite
    if (data.sections) {
      const flattened = data.sections.flatMap((section: any) => 
        section.matches.map((m: any) => ({
          sentence: m.sentence,
          score: Math.round(m.score * 100), // Convert 0-1 to 0-100
          source: m.source?.title || "Academic Source"
        }))
      );
      return res.json(flattened);
    }
    
    res.json(data);
  } catch (error: any) {
    console.error("AI Service Error (Plagiarism):", error.message);
    res.status(error.response?.status || 500).json({ error: "AI service unavailable" });
  }
});

// Proxy for mindmap (Mermaid)
router.post("/mindmap/generate", async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/mindmap/generate`, req.body);
    res.json(response.data);
  } catch (error: any) {
    console.error("AI Service Error (Mindmap):", error.message);
    res.status(error.response?.status || 500).json({ error: "AI service unavailable" });
  }
});

// Proxy for mindmap (JSON for Analysis Suite)
router.post("/mindmap/json", async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/mindmap/json`, req.body);
    res.json(response.data);
  } catch (error: any) {
    console.error("AI Service Error (Mindmap JSON):", error.message);
    res.status(error.response?.status || 500).json({ error: "AI service unavailable" });
  }
});

// Proxy for summary
router.post("/summary/generate", async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/summary/generate`, req.body);
    res.json(response.data);
  } catch (error: any) {
    console.error("AI Service Error (Summary):", error.message);
    res.status(error.response?.status || 500).json({ error: "AI service unavailable" });
  }
});

export default router;
