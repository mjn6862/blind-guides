import { useEffect, useState } from "react";
import type { GameAction } from "@blind-guides/shared";
import { GameScreen } from "./GameScreen.js";
import { HomeScreen } from "./HomeScreen.js";
import { LobbyScreen } from "./LobbyScreen.js";
import { useGameSocket } from "./useGameSocket.js";

type Session = {
  gameId: string;
  playerId: string;
  sessionToken: string;
  displayName: string;
  inviteCode?: string;
};

const SESSION_KEY = "blind-guides-session";

function loadSession(): Session | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null): void {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const { connectionState, lobby, view, error, setError, send } = useGameSocket(
    session?.sessionToken ?? null,
  );

  useEffect(() => {
    saveSession(session);
  }, [session]);

  if (!session) {
    return (
      <HomeScreen
        onCreated={(data) =>
          setSession({
            gameId: data.gameId,
            playerId: data.playerId,
            sessionToken: data.sessionToken,
            displayName: data.displayName,
            inviteCode: data.inviteCode,
          })
        }
        onJoined={(data) =>
          setSession({
            gameId: data.gameId,
            playerId: data.playerId,
            sessionToken: data.sessionToken,
            displayName: data.displayName,
            inviteCode: data.inviteCode,
          })
        }
      />
    );
  }

  const leave = () => {
    setSession(null);
  };

  if (view) {
    return (
      <GameScreen
        view={view}
        sessionToken={session.sessionToken}
        connectionState={connectionState}
        error={error}
        onClearError={() => setError(null)}
        onAction={(action: GameAction) => send({ type: "ACTION", action })}
        onSaveNotes={(notes) => send({ type: "SAVE_NOTES", notes })}
        onLeave={leave}
      />
    );
  }

  return (
    <LobbyScreen
      session={session}
      lobby={lobby}
      connectionState={connectionState}
      error={error}
      onLeave={leave}
      onStarted={() => {
        /* state arrives via websocket */
      }}
    />
  );
}
