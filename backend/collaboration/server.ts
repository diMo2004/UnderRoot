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
      // Allow anonymous sessions for development — persistence still works
      console.log("⚠️  No auth token provided, allowing anonymous session");
      return { userId: "anonymous" };
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
      return { userId: payload.userId };
    } catch {
      // Token is invalid/expired — still allow the session for dev
      console.log("⚠️  Invalid token, allowing anonymous session");
      return { userId: "anonymous" };
    }
  },

  async onConnect({ documentName }) {
    console.log(`📄 Document connected: ${documentName}`);
  },

  async onLoadDocument({ documentName }) {
    console.log(`🔍 Loading document: ${documentName}`);
    const project = await Project.findById(documentName);
    if (!project) {
      console.log(`❌ Project not found: ${documentName}`);
      return null;
    }
    // Return the stored Yjs state (Buffer) if it exists
    if (project.yjsState) {
      console.log(`✅ Loaded Yjs state for ${documentName} (${project.yjsState.length} bytes)`);
      return new Uint8Array(project.yjsState);
    }
    console.log(`ℹ️ No Yjs state found for ${documentName}, starting fresh.`);
    return null; 
  },

  async onStoreDocument({ documentName, document }) {
    const state = Y.encodeStateAsUpdate(document);
    const text = document.getText('default').toString();
    
    console.log(`💾 Storing document: ${documentName} (${state.length} bytes)`);
    
    await Project.findByIdAndUpdate(documentName, { 
      content: text,
      yjsState: Buffer.from(state),
      lastModified: new Date()
    });
  },
});

connectMongo().then(() => {
  server.listen().then(() => {
    console.log(`🤝 UnderRoot Collaboration server running on port ${config.collabPort}`);
  });
});
