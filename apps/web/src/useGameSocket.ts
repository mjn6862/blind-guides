import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, LobbyView, PlayerGameView, ServerMessage } from "@blind-guides/shared";

type ConnectionState = "connecting" | "open" | "closed" | "reconnecting";

const MAX_RECONNECT_ATTEMPTS = 8;

export function useGameSocket(sessionToken: string | null) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("closed");
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [view, setView] = useState<PlayerGameView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalClose = useRef(false);

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!sessionToken) return;

    clearReconnectTimer();
    intentionalClose.current = false;

    if (socketRef.current) {
      socketRef.current.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws?sessionToken=${sessionToken}`,
    );
    socketRef.current = ws;
    setConnectionState(reconnectAttempts.current > 0 ? "reconnecting" : "connecting");

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setConnectionState("open");
      ws.send(JSON.stringify({ type: "RESUME" }));
    };

    ws.onclose = () => {
      setConnectionState("closed");
      if (intentionalClose.current || !sessionToken) {
        return;
      }
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        setError("Connection lost. Refresh the page to reconnect.");
        return;
      }
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 15000);
      reconnectAttempts.current += 1;
      setConnectionState("reconnecting");
      reconnectTimer.current = setTimeout(() => connect(), delay);
    };

    ws.onerror = () => {
      setError("WebSocket connection failed");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "LOBBY") {
          setLobby(message.lobby);
          setView(null);
        } else if (message.type === "GAME_STATE") {
          setView(message.view);
          setLobby(null);
        } else if (message.type === "ERROR") {
          setError(message.message);
        }
      } catch {
        setError("Received invalid message from server");
      }
    };
  }, [sessionToken]);

  useEffect(() => {
    reconnectAttempts.current = 0;
    connect();
    return () => {
      intentionalClose.current = true;
      clearReconnectTimer();
      socketRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      setError("Not connected — wait for reconnect or refresh the page.");
    }
  }, []);

  return { connectionState, lobby, view, error, setError, send, reconnect: connect };
}
