import { useState } from "react";
import type { PlayerInfo, PlayerOrderAction } from "@blind-guides/shared";

type Props = {
  gameId: string;
  sessionToken: string;
  players: PlayerInfo[];
  onUpdated?: () => void;
};

export function PlayerOrderControls({
  gameId,
  sessionToken,
  players,
  onUpdated,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendAction = async (action: PlayerOrderAction) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/player-order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update turn order");
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update turn order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="player-order-controls">
      <div className="row player-order-actions">
        <button
          type="button"
          disabled={busy || players.length < 2}
          onClick={() => sendAction({ type: "randomize" })}
        >
          Random order
        </button>
        <button
          type="button"
          disabled={busy || players.length < 2}
          onClick={() => sendAction({ type: "join_order" })}
        >
          Join order
        </button>
      </div>
      <ol className="turn-order-list player-order-list">
        {players.map((p, i) => (
          <li key={p.id} className="player-order-row">
            <span className="player-order-label">
              <strong>{i + 1}.</strong> {p.displayName}
              {i === 0 ? <span className="muted"> — goes first</span> : null}
            </span>
            <span className="player-order-buttons">
              <button
                type="button"
                className="order-nudge"
                disabled={busy || i === 0}
                aria-label={`Move ${p.displayName} earlier`}
                onClick={() =>
                  sendAction({ type: "move", playerId: p.id, direction: "up" })
                }
              >
                ↑
              </button>
              <button
                type="button"
                className="order-nudge"
                disabled={busy || i === players.length - 1}
                aria-label={`Move ${p.displayName} later`}
                onClick={() =>
                  sendAction({ type: "move", playerId: p.id, direction: "down" })
                }
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p className="muted">
        Turn order stays the same for the whole game. Use random order for a
        shuffled start, or move players with the arrows.
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
