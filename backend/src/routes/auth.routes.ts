import { Router } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config/env";
import { pgPool } from "../config/database";

const router = Router();

/**
 * Google ID token (credential) login
 * POST /api/auth/google
 * body: { credential: string }
 * returns: { token: string, user: { id, email, name, avatar_url, google_id } }
 */
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body as { credential?: string };

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ error: "Missing credential" });
    }

    if (!config.googleClientId) {
      return res.status(500).json({
        error: "Server misconfiguration: GOOGLE_CLIENT_ID is not set",
      });
    }

    const googleClient = new OAuth2Client(config.googleClientId);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || "User";
    const avatarUrl = payload.picture || null;

    if (!googleId) {
      return res.status(401).json({ error: "Google token missing sub" });
    }
    if (!email) {
      return res.status(400).json({ error: "Google account has no email" });
    }

    // Upsert by email; preserve existing google_id if already set.
    const result = await pgPool.query(
      `
      INSERT INTO users (email, name, avatar_url, google_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        google_id = COALESCE(users.google_id, EXCLUDED.google_id),
        updated_at = NOW()
      RETURNING id, email, name, avatar_url, google_id
      `,
      [email, name, avatarUrl, googleId]
    );

    const user = result.rows[0];

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return res.json({ token, user });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(401).json({ error: "Google authentication failed" });
  }
});

export default router;