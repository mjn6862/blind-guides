import { useState } from "react";
import type { GameRules, LobbyView } from "@blind-guides/shared";
import { buildInviteClipboardText, buildInviteUrl } from "./invite-link.js";
import { downloadGameExport } from "./game-export-io.js";
import { RuleConfigForm } from "./RuleConfigForm.js";
import { PlayerOrderControls } from "./PlayerOrderControls.js";
import { ThemeToggle } from "./ThemeToggle.js";
import type { ThemeMode } from "./useTheme.js";

type Session = {
  gameId: string;
  playerId: string;
  sessionToken: string;
  displayName: string;
  inviteCode?: string;
};

type Props = {
  session: Session;
  lobby: LobbyView | null;
  connectionState: string;
  error: string | null;
  onLeave: () => void;
  onStarted: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
};

export function LobbyScreen({
  session,
  lobby,
  connectionState,
  error,
  onLeave,
  onStarted,
  theme,
  onThemeChange,
}: Props) {
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const inviteCode = lobby?.inviteCode ?? session.inviteCode ?? "…";
  const players = lobby?.players ?? [{ id: session.playerId, displayName: session.displayName }];
  const isHost = lobby?.isHost ?? true;
  const rules = lobby?.rules;

  const saveRules = async (newRules: GameRules) => {
    const res = await fetch(`/api/games/${session.gameId}/rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: session.sessionToken, rules: newRules }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save rules");
  };

  const copyInviteLink = async () => {
    if (inviteCode === "…") return;
    try {
      await navigator.clipboard.writeText(buildInviteClipboardText(inviteCode));
      setCopyMessage("Invite link copied!");
    } catch {
      setCopyMessage("Could not copy — share the code manually.");
    }
    window.setTimeout(() => setCopyMessage(null), 2500);
  };

  const copyInviteCode = async () => {
    if (inviteCode === "…") return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopyMessage("Invite code copied!");
    } catch {
      setCopyMessage("Could not copy invite code.");
    }
    window.setTimeout(() => setCopyMessage(null), 2500);
  };

  const startGame = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`/api/games/${session.gameId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: session.sessionToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start");
      onStarted();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Failed to start game");
    } finally {
      setStarting(false);
    }
  };

  const exportGame = async () => {
    setExporting(true);
    setExportMessage(null);
    try {
      await downloadGameExport(session.gameId, session.sessionToken);
      setExportMessage("Lobby saved — download started.");
    } catch (e) {
      setExportMessage(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportMessage(null), 4000);
    }
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Lobby</h1>
        <div className="row">
          <ThemeToggle theme={theme} onChange={onThemeChange} />
          <button onClick={onLeave}>Leave</button>
        </div>
      </div>

      <p className="muted">Connection: {connectionState}</p>

      <div className="panel invite-panel">
        <h2>Invite friends</h2>
        <p style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.15em" }}>
          {inviteCode}
        </p>
        <div className="row invite-actions">
          <button type="button" className="primary" onClick={copyInviteLink}>
            Copy invite link
          </button>
          <button type="button" onClick={copyInviteCode}>
            Copy code only
          </button>
        </div>
        {inviteCode !== "…" && (
          <p className="muted invite-link-preview">
            Link: {buildInviteUrl(inviteCode)}
          </p>
        )}
        <p className="muted">
          Friends open the link (or enter the code on the home screen) in another browser or
          device.
        </p>
        {copyMessage && <p className="copy-feedback">{copyMessage}</p>}
      </div>

      <div className="panel">
        <h2>Turn order ({players.length}/10 players)</h2>
        {isHost ? (
          <PlayerOrderControls
            gameId={session.gameId}
            sessionToken={session.sessionToken}
            players={players}
          />
        ) : (
          <>
            <ol className="turn-order-list">
              {players.map((p, i) => (
                <li key={p.id}>
                  <strong>{i + 1}.</strong> {p.displayName}
                  {p.id === session.playerId ? " (you)" : ""}
                  {i === 0 ? " — goes first" : ""}
                </li>
              ))}
            </ol>
            <p className="muted">
              The host sets turn order before starting. Order is fixed for the
              whole game.
            </p>
          </>
        )}
      </div>

      {isHost ? (
        <div className="panel">
          <h2>Game rules</h2>
          <RuleConfigForm initialRules={rules} onSave={saveRules} />
        </div>
      ) : (
        rules && (
          <div className="panel">
            <h2>Game rules</h2>
            <p>
              Colors: {rules.colors.map((c) => c.displayName).join(", ")}
            </p>
            <p className="muted">
              Pointers {rules.maxPointers}/{rules.maxPointers} · Stumbles 0/{rules.maxStumbles} · Hand{" "}
              {rules.handSize} · Actions/turn {rules.actionsPerTurn}
              {rules.openHand ? " · Open hand" : ""}
              {rules.ranked ? " · Undo disabled" : ""}
            </p>
          </div>
        )
      )}

      {isHost && (
        <div className="panel">
          <h2>Save lobby</h2>
          <p className="muted">
            Export the lobby if you need to pause before starting. Import it later from the
            home screen.
          </p>
          <button type="button" disabled={exporting} onClick={exportGame}>
            {exporting ? "Exporting…" : "Export lobby"}
          </button>
          {exportMessage && <p className="copy-feedback">{exportMessage}</p>}
        </div>
      )}

      {isHost && (
        <div className="panel">
          <h2>Start game</h2>
          <p className="muted">Need at least 2 players.</p>
          <button className="primary" disabled={starting || players.length < 2} onClick={startGame}>
            Start game
          </button>
          {startError && <p className="error">{startError}</p>}
        </div>
      )}

      {!isHost && (
        <p className="muted">Waiting for the host to start the game…</p>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
