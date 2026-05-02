import { Request, Response } from "express";
import axios from "axios";
import { cacheService } from "../services/redis.service";
import { config } from "../config/env";
import { pgPool } from "../config/database";
import { detectCitationStyleFromTemplate } from "../services/citationStyleDetector.service";
import { formatBibliography, formatInText, type CitationSource } from "../services/citationFormatter.service";

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

/**
 * POST /api/citations/add
 * Body: { projectId, source, template? }
 * - Detect style from template
 * - Insert citation row (dedupe per project+paper_id)
 * - Return { citationId, style, inText, bibliographyEntry, bibliography }
 */
export async function addCitation(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, source, template } = req.body as {
      projectId?: string;
      source?: CitationSource;
      template?: string;
    };

    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }
    if (!source?.paper_id || !source?.title) {
      res.status(400).json({ error: "source.paper_id and source.title are required" });
      return;
    }

    // Adjust this depending on how authMiddleware sets user
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const style = detectCitationStyleFromTemplate(template);

    // Insert or reuse existing citation for (project, paper_id)
    const inserted = await pgPool.query(
      `
      INSERT INTO citations (project_id, user_id, paper_id, title, authors, year, venue, doi, citation_count)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1)
      ON CONFLICT (project_id, paper_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        authors = EXCLUDED.authors,
        year = EXCLUDED.year,
        venue = EXCLUDED.venue,
        doi = EXCLUDED.doi,
        citation_count = citations.citation_count + 1
        RETURNING id
        `,
      [
        projectId,
        userId,
        source.paper_id,
        source.title,
        source.authors ?? null,
        source.year ?? null,
        source.venue ?? null,
        source.doi ?? null,
      ]
    );

    const citationId = inserted.rows[0]?.id;

    // Fetch current citations for bibliography (order matters for IEEE)
    const rows = await pgPool.query(
      `SELECT id, paper_id, title, authors, year, venue, doi, inserted_at
       FROM citations
       WHERE project_id = $1
       ORDER BY inserted_at ASC`,
      [projectId]
    );

    // Build bibliography and locate index for this citation
    const bibliography = rows.rows.map((r: any, idx: number) => {
      const s: CitationSource = {
        paper_id: r.paper_id,
        title: r.title,
        authors: r.authors ?? [],
        year: r.year ?? undefined,
        venue: r.venue ?? undefined,
        doi: r.doi ?? undefined,
      };
      const ieeeIndex = idx + 1;
      const entry = formatBibliography(style, s, ieeeIndex);
      return { citationId: r.id, entry, ieeeIndex };
    });

    const me = bibliography.find((b: any) => b.citationId === citationId);
    const myIeeeIndex = me?.ieeeIndex;

    const inText = formatInText(style, source, myIeeeIndex);
    const bibliographyEntry = formatBibliography(style, source, myIeeeIndex);

    res.json({
      citationId,
      style,
      inText,
      bibliographyEntry,
      bibliography, // full list so frontend can render/export
    });
  } catch (err) {
    console.error("addCitation error:", err);
    res.status(500).json({ error: "Failed to add citation" });
  }
}

/**
 * GET /api/citations/project/:projectId?template=...
 * Returns detected style + bibliography entries
 */
export async function getProjectBibliography(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const template = (req.query.template as string) || undefined;

    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }

    const style = detectCitationStyleFromTemplate(template);

    const rows = await pgPool.query(
      `SELECT id, paper_id, title, authors, year, venue, doi, inserted_at
       FROM citations
       WHERE project_id = $1
       ORDER BY inserted_at ASC`,
      [projectId]
    );

    const bibliography = rows.rows.map((r: any, idx: number) => {
      const s: CitationSource = {
        paper_id: r.paper_id,
        title: r.title,
        authors: r.authors ?? [],
        year: r.year ?? undefined,
        venue: r.venue ?? undefined,
        doi: r.doi ?? undefined,
      };
      return {
        citationId: r.id,
        entry: formatBibliography(style, s, idx + 1),
        ieeeIndex: idx + 1,
      };
    });

    res.json({ style, bibliography });
  } catch (err) {
    console.error("getProjectBibliography error:", err);
    res.status(500).json({ error: "Failed to fetch bibliography" });
  }
}