import { Router } from "express";
import axios from "axios";

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://ai-service:8000";

// Proxy for plagiarism check
router.post("/plagiarism/check", async (req, res) => {
  try {
    console.log(`Proxying plagiarism check to AI service (${AI_SERVICE_URL}). Body size: ${JSON.stringify(req.body).length}`);
    const response = await axios.post(`${AI_SERVICE_URL}/api/plagiarism/check`, req.body, {
      timeout: 120000 // 2 minutes
    });
    const data = response.data;
    console.log("AI Service response received. Sections count:", data.sections?.length);
    
    // Flatten sections into a single list of results for the Analysis Suite
    if (data.sections) {
      const flattened = data.sections.flatMap((section: any) => 
        section.matches.map((m: any) => ({
          sentence: m.matched_text || "Unidentified sentence",
          score: Math.round((m.similarity || 0) * 100), // Ensure no NaN
          source: m.source?.title || "Academic Source"
        }))
      );
      console.log("Flattened results count:", flattened.length);
      console.log("Sending JSON response to frontend...");
      res.json(flattened);
      console.log("JSON response sent successfully.");
      return;
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

// Proxy for rewrite (Reformat)
router.post("/reformat/rewrite", async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/summary/rewrite`, req.body, {
      timeout: 60000 // 1 minute
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("AI Service Error (Rewrite):", error.message);
    res.status(error.response?.status || 500).json({ error: "AI service unavailable" });
  }
});

// Proxy for proofread (Fix Copy-Paste)
router.post("/reformat/proofread", async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/summary/proofread`, req.body, {
      timeout: 60000 // 1 minute
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("AI Service Error (Proofread):", error.message);
    res.status(error.status || 500).json({ error: "AI service unavailable" });
  }
});

export default router;
