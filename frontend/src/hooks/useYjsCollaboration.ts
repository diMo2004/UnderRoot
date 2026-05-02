"use client";

import { useEffect, useState, useRef } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { createYjsProvider } from "@/lib/yjsProvider";

interface ConnectedUser {
  name: string;
  color: string;
  clientId: number;
}

export function useYjsCollaboration(
  projectId: string,
  userName: string,
  userColor: string
) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    const { ydoc, provider, persistence } = createYjsProvider(projectId, userName, userColor);
    ydocRef.current = ydoc;
    providerRef.current = provider;
    persistenceRef.current = persistence;

    provider.on("connect", () => setIsConnected(true));
    provider.on("disconnect", () => setIsConnected(false));

    provider.on("awarenessChange", () => {
      const states = provider.awareness?.getStates();
      if (!states) return;
      const users: ConnectedUser[] = [];
      states.forEach((state: { user?: { name: string; color: string } }, clientId: number) => {
        if (state.user) {
          users.push({ ...state.user, clientId });
        }
      });
      setConnectedUsers(users);
    });

    return () => {
      provider.destroy();
      persistence.destroy();
      ydoc.destroy();
    };
  }, [projectId, userName, userColor]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    isConnected,
    connectedUsers,
  };
}
