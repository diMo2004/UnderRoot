import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export function createYjsProvider(projectId: string, userName: string, userColor: string) {
  const ydoc = new Y.Doc();

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("underroot_token") || ""
      : "";

  const provider = new HocuspocusProvider({
    url: process.env.NEXT_PUBLIC_COLLAB_URL || "ws://localhost:4001",
    name: `underroot-project-${projectId}`,
    document: ydoc,
    token,
  });

  provider.setAwarenessField("user", {
    name: userName,
    color: userColor,
  });

  return { ydoc, provider };
}
