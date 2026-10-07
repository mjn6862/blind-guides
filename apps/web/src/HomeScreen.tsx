import { useEffect, useState } from "react";
import { readInviteCodeFromUrl } from "./invite-link.js";

const HOST_PASSWORD_KEY = "blind-guides-host-password";

type Props = {
  onCreated: (data: {
    gameId: string;
    inviteCode: string;
    playerId: string;
    sessionToken: string;
    displayName: string;
  }) => void;
  onJoined: (data: {
    gameId: string;
    inviteCode?: string;
    playerId: string;
    sessionToken: string;
    displayName: string;
  }) => void;
};

export function HomeScreen({ onCreated, onJoined }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [hostPassword, setHostPassword] = useState(
    () => sessionStorage.getItem(HOST_PASSWORD_KEY) ?? "",
  );
  const [requireHostPassword, setRequireHostPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState(() => readInviteCodeFromUrl() ?? "");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl = readInviteCodeFromUrl();
    if (fromUrl) {
      setInviteCode(fromUrl);
    }
  }, []);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: { requireHostPassword?: boolean }) => {
        setRequireHostPassword(Boolean(data.requireHostPassword));
      })
      .catch(() => {
        setRequireHostPassword(false);
      });
  }, []);

  const createGame = async () => {
    if (!displayName.trim()) {
      setError("Enter your name");
      return;
    }
    if (requireHostPassword && !hostPassword.trim()) {
      setError("Enter the host password to create a game");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: { displayName: string; hostPassword?: string } = {
        displayName: displayName.trim(),
      };
      if (requireHostPassword) {
        body.hostPassword = hostPassword.trim();
      }
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create game");
      if (requireHostPassword && hostPassword.trim()) {
        sessionStorage.setItem(HOST_PASSWORD_KEY, hostPassword.trim());
      }
      onCreated({
        gameId: data.gameId,
        inviteCode: data.inviteCode,
        playerId: data.playerId,
        sessionToken: data.sessionToken,
        displayName: displayName.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!displayName.trim() || !inviteCode.trim()) {
      setError("Enter your name and invite code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/games/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          inviteCode: inviteCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join game");
      onJoined({
        gameId: data.gameId,
        playerId: data.playerId,
        sessionToken: data.sessionToken,
        displayName: displayName.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join game");
    } finally {
      setLoading(false);
    }
  };

  const importGame = async () => {
    if (!displayName.trim()) {
      setError("Enter your name");
      return;
    }
    if (!importFile) {
      setError("Choose a saved game file");
      return;
    }
    if (requireHostPassword && !hostPassword.trim()) {
      setError("Enter the host password to import a game");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const text = await importFile.text();
      const gameExport = JSON.parse(text) as unknown;
      const body: {
        displayName: string;
        hostPassword?: string;
        export: unknown;
      } = {
        displayName: displayName.trim(),
        export: gameExport,
      };
      if (requireHostPassword) {
        body.hostPassword = hostPassword.trim();
      }
      const res = await fetch("/api/games/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to import game");
      if (requireHostPassword && hostPassword.trim()) {
        sessionStorage.setItem(HOST_PASSWORD_KEY, hostPassword.trim());
      }
      onCreated({
        gameId: data.gameId,
        inviteCode: data.inviteCode,
        playerId: data.playerId,
        sessionToken: data.sessionToken,
        displayName: displayName.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Blind Guides</h1>
      <p className="muted">Blind Guides: the blind lead the blind in this cooperative card game.</p>

      <div className="panel">
        <label>
          Your name{" "}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
          />
        </label>
      </div>

      <div className="panel">
        <h2>Create a game</h2>
        {requireHostPassword && (
          <label className="host-password-field">
            Host password{" "}
            <input
              type="password"
              value={hostPassword}
              onChange={(e) => setHostPassword(e.target.value)}
              placeholder="Password required to host"
              autoComplete="current-password"
            />
            <span className="muted">
              Only people with this password can create games. Friends join with an invite code
              — they do not need the password.
            </span>
          </label>
        )}
        <button className="primary" disabled={loading} onClick={createGame}>
          Create game
        </button>
      </div>

      <div className="panel">
        <h2>Join with invite code</h2>
        <div className="row">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
          />
          <button disabled={loading} onClick={joinGame}>
            Join game
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Continue from saved game</h2>
        <p className="muted">
          Upload a game export file to pick up where you left off after a break. Use the same
          display name you had when the game was saved. Friends
          rejoin with the new invite code using their original names.
        </p>
        <label className="import-file-field">
          Saved game file{" "}
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button className="primary" disabled={loading || !importFile} onClick={importGame}>
          Import and continue
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
