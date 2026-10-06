import { useEffect, useRef, useState } from "react";
import type { ColorConfig, PlayerInfo, TurnRecord } from "@blind-guides/shared";
import {
  newHistoryAnimationSteps,
  type TurnAnimationStep,
} from "./turn-action-queue.js";

type Props = {
  turnHistory: TurnRecord[];
  players: PlayerInfo[];
  colors: ColorConfig[];
};

type Phase = "enter" | "reveal" | "fly" | "done";

export function TurnActionOverlay({ turnHistory, players, colors }: Props) {
  const seenLength = useRef(turnHistory.length);
  const initialized = useRef(false);
  const [queue, setQueue] = useState<TurnAnimationStep[]>([]);
  const [current, setCurrent] = useState<TurnAnimationStep | null>(null);
  const [phase, setPhase] = useState<Phase>("enter");

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      seenLength.current = turnHistory.length;
      return;
    }

    const steps = newHistoryAnimationSteps(
      seenLength.current,
      turnHistory,
      players,
      colors,
    );
    seenLength.current = turnHistory.length;

    if (steps.length > 0) {
      setQueue((prev) => [...prev, ...steps]);
    }
  }, [turnHistory, players, colors]);

  useEffect(() => {
    if (current || queue.length === 0) {
      return;
    }
    setCurrent(queue[0]!);
    setQueue((prev) => prev.slice(1));
    setPhase("enter");
  }, [queue, current]);

  useEffect(() => {
    if (!current) {
      return;
    }

    if (current.type === "card_action") {
      const revealTimer = window.setTimeout(() => setPhase("reveal"), 500);
      const flyTimer = window.setTimeout(() => setPhase("fly"), 1100);
      const doneTimer = window.setTimeout(() => {
        setCurrent(null);
        setPhase("enter");
      }, 1900);
      return () => {
        window.clearTimeout(revealTimer);
        window.clearTimeout(flyTimer);
        window.clearTimeout(doneTimer);
      };
    }

    const doneTimer = window.setTimeout(() => {
      setCurrent(null);
      setPhase("enter");
    }, 1200);
    return () => window.clearTimeout(doneTimer);
  }, [current]);

  if (!current) {
    return null;
  }

  if (current.type === "card_action") {
    const revealed = phase === "reveal" || phase === "fly" || phase === "done";
    const flying = phase === "fly";

    return (
      <div className="turn-action-overlay" aria-live="polite">
        <div className="turn-action-backdrop" />
        <div className={`turn-action-card-stage${flying ? " flying" : ""}`}>
          <p className="turn-action-headline">
            <strong>{current.playerName}</strong> {current.verb} card{" "}
            {current.slotLabel}
          </p>
          <div
            className={`turn-action-card${revealed ? " revealed" : ""}${flying ? ` fly-${current.destination}` : ""}`}
            style={{ borderColor: revealed ? current.colorHex : "#2d3748" }}
          >
            {revealed ? (
              <>
                <div className="card-color-label">
                  <span className="card-color-line">{current.colorDisplayName}</span>
                </div>
                <div className="card-number">{current.card.number}</div>
              </>
            ) : (
              <span className="turn-action-mystery">?</span>
            )}
          </div>
          {flying && (
            <p className="turn-action-destination">
              → {current.destination === "played" ? "Played pile" : "Discard pile"}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (current.type === "pointer_gained") {
    return (
      <div className="turn-action-overlay token-overlay" aria-live="polite">
        <div className="turn-action-backdrop light" />
        <div className="turn-action-token pointer-gained anim-pop">
          <span className="token-icon">👉</span>
          <span>
            Gained {current.amount} pointer{current.amount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    );
  }

  if (current.type === "pointer_spent") {
    return (
      <div className="turn-action-overlay token-overlay" aria-live="polite">
        <div className="turn-action-backdrop light" />
        <div className="turn-action-token pointer-spent anim-pop">
          <span className="token-icon">👉</span>
          <span>
            Spent {current.amount} pointer{current.amount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    );
  }

  if (current.type === "stumbled") {
    return (
      <div className="turn-action-overlay token-overlay" aria-live="polite">
        <div className="turn-action-backdrop light" />
        <div className="turn-action-token stumbled anim-pop">
          <span className="token-icon">⚠️</span>
          <span>
            {current.amount === 1 ? "Stumbled" : `Stumbled ${current.amount} times`}
          </span>
        </div>
      </div>
    );
  }

  if (current.type === "cards_drawn") {
    return (
      <div className="turn-action-overlay token-overlay" aria-live="polite">
        <div className="turn-action-backdrop light" />
        <div className="turn-action-token cards-drawn anim-pop">
          <span className="token-icon">🃏</span>
          <span>
            {current.playerName} drew {current.count} card
            {current.count === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="turn-action-overlay token-overlay" aria-live="polite">
      <div className="turn-action-backdrop light" />
      <div className="turn-action-token clue-given anim-pop">
        <span className="token-icon">💡</span>
        <span>
          {current.fromName} → {current.toName}: {current.clueText}
        </span>
      </div>
    </div>
  );
}
