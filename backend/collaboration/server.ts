import { Server } from "@hocuspocus/server";
import jwt from "jsonwebtoken";
import { config } from "../src/config/env";

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
});

server.listen().then(() => {
  console.log(`🤝 UnderRoot Collaboration server running on port ${config.collabPort}`);
});
