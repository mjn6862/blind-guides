import { useEffect } from "react";
import type { GameRules } from "@blind-guides/shared";
import { buildRulesSummary } from "@blind-guides/shared";

type Props = {
  rules: GameRules;
  onClose: () => void;
};

export function RulesModal({ rules, onClose }: Props) {
  const summary = buildRulesSummary(rules);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal rules-modal"
        role="dialog"
        aria-labelledby="rules-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header row">
          <h2 id="rules-modal-title">Game rules</h2>
          <button type="button" onClick={onClose} aria-label="Close rules">
            Close
          </button>
        </header>

        <section className="rules-section">
          <h3>General</h3>
          <ul className="rules-list">
            {summary.global.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="rules-section">
          <h3>Colors</h3>
          <div className="rules-color-grid">
            {summary.colors.map((color) => (
              <article key={color.colorId} className="rules-color-card">
                <h4 className="rules-color-title">
                  <span
                    className="pile-swatch"
                    style={{ background: color.displayColor }}
                  />
                  {color.displayName}
                  {color.presetLabel ? (
                    <span className="muted rules-preset-label"> ({color.presetLabel})</span>
                  ) : null}
                </h4>
                <ul className="rules-list compact">
                  {color.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
