import { useEffect, useRef, useState } from "react";

type Props = {
  phase: "won" | "lost" | "playing" | null;
  lossReason?: string;
};

export function GameEndOverlay({ phase, lossReason }: Props) {
  const prevPhase = useRef(phase);
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const ended = phase === "won" || phase === "lost";
    const wasPlaying = prevPhase.current === "playing";
    prevPhase.current = phase;

    if (!ended) {
      setVisible(false);
      setAnimate(false);
      return;
    }

    const delay = wasPlaying ? 2200 : 400;
    const showTimer = window.setTimeout(() => {
      setVisible(true);
      window.requestAnimationFrame(() => setAnimate(true));
    }, delay);

    return () => window.clearTimeout(showTimer);
  }, [phase]);

  if (!visible || (phase !== "won" && phase !== "lost")) {
    return null;
  }

  const isWin = phase === "won";

  return (
    <div
      className={`game-end-overlay${isWin ? " win" : " loss"}${animate ? " animate" : ""}`}
      role="alertdialog"
      aria-labelledby="game-end-title"
      aria-describedby="game-end-desc"
    >
      <div className="game-end-backdrop" />
      {isWin && (
        <div className="game-end-confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className={`confetti-piece c${i % 6}`} />
          ))}
        </div>
      )}
      <div className={`game-end-panel${animate ? " panel-in" : ""}`}>
        <div className={`game-end-icon${isWin ? " win-icon" : " loss-icon"}`}>
          {isWin ? "★" : "✕"}
        </div>
        <h2 id="game-end-title" className="game-end-title">
          {isWin ? "Team wins!" : "Team loses"}
        </h2>
        <p id="game-end-desc" className="game-end-message">
          {isWin
            ? "Every card is on the table. Perfect teamwork!"
            : (lossReason ?? "The team stumbled into a pit, or the deck became impossible.")}
        </p>
        <button type="button" className="game-end-dismiss" onClick={() => setVisible(false)}>
          Continue
        </button>
      </div>
    </div>
  );
}
