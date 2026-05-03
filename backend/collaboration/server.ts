import { Server } from "@hocuspocus/server";
import jwt from "jsonwebtoken";
import { config } from "../src/config/env";
import * as Y from "yjs";
import { Project } from "../src/models/project.model";
import { connectMongo } from "../src/config/database";

const server = Server.configure({
  port: config.collabPort,

  async onAuthenticate({ token }) {
    if (!token) {
      throw new Error("Missing authentication token");
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
      return { userId: payload.userId };
    } catch {
      throw new Error("Invalid or expired token");
    }
  },

  async onConnect({ documentName }) {
    console.log(`📄 Document connected: ${documentName}`);
  },

  async onLoadDocument({ documentName }) {
    const project = await Project.findById(documentName);
    if (!project || !project.content) {
      return null;
    }
    // Convert base64 or buffer back to Uint8Array if stored as such
    // For now, let's assume we store the Yjs state in a new field 'yjsState'
    // But since the model only has 'content' (string), let's use that for now if it's a stringified Yjs state
    // Actually, it's better to store binary data.
    return null; 
  },

  async onStoreDocument({ documentName, document }) {
    const state = Y.encodeStateAsUpdate(document);
    // We should probably update the Project model to handle binary data
    // For now, let's just update the 'content' field with the text representation for simple preview
    const text = document.getText('default').toString();
    await Project.findByIdAndUpdate(documentName, { 
      content: text,
      lastModified: new Date()
    });
  },
});

connectMongo().then(() => {
  server.listen().then(() => {
    console.log(`🤝 UnderRoot Collaboration server running on port ${config.collabPort}`);
  });
});
