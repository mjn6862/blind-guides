import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { CardView, GameAction, PlayerGameView, TurnHistorySnapshot } from "@blind-guides/shared";
import {
  cardDiscardTooltip,
  cardDrawTooltip,
  cardPlayedTooltip,
  formatGameEvent,
  isDisplayableHistoryEvent,
} from "@blind-guides/shared";
import type { CardClueHistory, CardTurnInfo } from "@blind-guides/shared";
import { ColorRulesTooltip } from "./ColorRulesTooltip.js";
import { RulesModal } from "./RulesModal.js";
import { GameEndOverlay } from "./GameEndOverlay.js";
import { TurnActionOverlay } from "./TurnActionOverlay.js";
import { useClueListExpansion } from "./useClueListExpansion.js";
import { downloadGameExport } from "./game-export-io.js";
import { buildInviteClipboardText } from "./invite-link.js";

type Props = {
  view: PlayerGameView;
  sessionToken: string;
  connectionState: string;
  error: string | null;
  onClearError: () => void;
  onAction: (action: GameAction) => void;
  onSaveNotes: (notes: string) => void;
  onLeave: () => void;
};

function formatColorLabel(name: string): string[] {
  return name.replace(/_/g, " ").split(/\s+/).filter(Boolean);
}

function CardHoverTooltip({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  // The tooltip uses fixed positioning so scrolling containers (e.g. the hand)
  // can't clip it; its anchor point is measured when the wrapper is hovered.
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const show = (e: { currentTarget: HTMLElement }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const halfWidth = 104;
    const x = Math.min(
      Math.max(rect.left + rect.width / 2, halfWidth),
      Math.max(window.innerWidth - halfWidth, halfWidth),
    );
    setAnchor({ x, y: rect.top });
  };
  const hide = () => setAnchor(null);
  return (
    <div
      className="card-hover-tooltip-wrap"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {anchor && (
        <div
          className="card-hover-tooltip"
          role="tooltip"
          style={{ left: anchor.x, top: anchor.y }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function CardClueTags({
  clueHistory,
  isOpen,
  onToggle,
}: {
  clueHistory: CardClueHistory;
  isOpen: (section: "matched" | "failed") => boolean;
  onToggle: (section: "matched" | "failed") => void;
}) {
  const { matched, failed } = clueHistory;
  if (matched.length === 0 && failed.length === 0) {
    return null;
  }

  const handleToggle = (
    section: "matched" | "failed",
    event: MouseEvent,
  ) => {
    event.stopPropagation();
    onToggle(section);
  };

  return (
    <div className="card-clue-tags">
      {matched.length > 0 && (
        <div className="clue-list-section matched-section">
          <button
            type="button"
            className={`clue-list-summary${isOpen("matched") ? " open" : ""}`}
            onClick={(e) => handleToggle("matched", e)}
            aria-expanded={isOpen("matched")}
          >
            Matched ({matched.length})
          </button>
          {isOpen("matched") && (
            <div className="clue-list-body">
              {matched.map((label) => (
                <span key={label} className="clue-tag matched">{label}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {failed.length > 0 && (
        <div className="clue-list-section failed-section">
          <button
            type="button"
            className={`clue-list-summary${isOpen("failed") ? " open" : ""}`}
            onClick={(e) => handleToggle("failed", e)}
            aria-expanded={isOpen("failed")}
          >
            Not matched ({failed.length})
          </button>
          {isOpen("failed") && (
            <div className="clue-list-body">
              {failed.map((label) => (
                <span key={label} className="clue-tag failed">{label}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CardFace({
  card,
  colorHex,
  colorDisplayName,
  clueHistory,
  cardId,
  clueListExpansion,
}: {
  card: CardView;
  colorHex?: string;
  colorDisplayName?: string;
  clueHistory?: CardClueHistory;
  cardId?: string;
  clueListExpansion?: {
    isOpen: (cardId: string, section: "matched" | "failed") => boolean;
    toggle: (cardId: string, section: "matched" | "failed") => void;
  };
}) {
  const slotLabel = "slotLabel" in card && card.slotLabel ? card.slotLabel : null;

  if ("empty" in card && card.empty) {
    return (
      <div className="card-slot">
        {slotLabel ? <span className="slot-label">{slotLabel}</span> : null}
        <div className="card card-slot-empty" aria-label={`Empty slot ${slotLabel}`} />
      </div>
    );
  }
  if ("hidden" in card && card.hidden) {
    return (
      <div className="card-slot">
        {slotLabel ? <span className="slot-label">{slotLabel}</span> : null}
        <div className={`card hidden${card.highlighted ? " highlighted" : ""}`}>?</div>
        {clueHistory && cardId && clueListExpansion && (
          <CardClueTags
            clueHistory={clueHistory}
            isOpen={(section) => clueListExpansion.isOpen(cardId, section)}
            onToggle={(section) => clueListExpansion.toggle(cardId, section)}
          />
        )}
      </div>
    );
  }
  if (!("colorId" in card)) {
    return (
      <div className="card-slot">
        {slotLabel ? <span className="slot-label">{slotLabel}</span> : null}
        <div className="card hidden">?</div>
      </div>
    );
  }

  const labelLines = colorDisplayName
    ? formatColorLabel(colorDisplayName)
    : formatColorLabel(card.colorId);

  return (
    <div className="card-slot">
      {slotLabel ? <span className="slot-label">{slotLabel}</span> : null}
      <div
        className={`card${card.highlighted ? " highlighted" : ""}`}
        style={{ borderColor: colorHex ?? "#2d3748" }}
      >
        <div className="card-color-label">
          {labelLines.map((line, i) => (
            <span key={i} className="card-color-line">
              {line}
            </span>
          ))}
        </div>
        <div className="card-number">{card.number}</div>
      </div>
      {clueHistory && cardId && clueListExpansion && (
        <CardClueTags
          clueHistory={clueHistory}
          isOpen={(section) => clueListExpansion.isOpen(cardId, section)}
          onToggle={(section) => clueListExpansion.toggle(cardId, section)}
        />
      )}
    </div>
  );
}

function HandRow({
  label,
  cards,
  colorMap,
  colorNameMap,
  cardTurns,
  clueHistories,
  clueListExpansion,
  isCurrentTurn,
  selectable,
  selectedCardId,
  onSelectCard,
  actions,
}: {
  label: string;
  cards: CardView[];
  colorMap: Record<string, string>;
  colorNameMap: Record<string, string>;
  cardTurns: Record<string, CardTurnInfo>;
  clueHistories: Record<string, CardClueHistory>;
  clueListExpansion: {
    isOpen: (cardId: string, section: "matched" | "failed") => boolean;
    toggle: (cardId: string, section: "matched" | "failed") => void;
  };
  isCurrentTurn?: boolean;
  selectable?: boolean;
  selectedCardId?: string | null;
  onSelectCard?: (id: string) => void;
  actions?: ReactNode;
}) {
  return (
    <div className={`hand-row${isCurrentTurn ? " current-turn" : ""}`}>
      <div className="hand-row-main">
        <h3 className="hand-label">
          {label}
          {isCurrentTurn ? <span className="turn-chip">Current turn</span> : null}
        </h3>
        <div className="hand">
          {cards.map((card, i) => {
            if ("empty" in card && card.empty) {
              return <CardFace key={`empty-${i}`} card={card} />;
            }
            if (!("id" in card)) {
              return null;
            }
            const cardId = card.id;
            const displayName =
              "colorId" in card ? colorNameMap[card.colorId] : undefined;
            const inner = (
              <CardHoverTooltip text={cardDrawTooltip(cardTurns[cardId])}>
                <CardFace
                  card={card}
                  cardId={cardId}
                  colorHex={"colorId" in card ? colorMap[card.colorId] : undefined}
                  colorDisplayName={displayName}
                  clueHistory={clueHistories[cardId]}
                  clueListExpansion={clueListExpansion}
                />
              </CardHoverTooltip>
            );
            if (!selectable || !onSelectCard) {
              return <div key={cardId}>{inner}</div>;
            }
            return (
              <button
                key={cardId}
                type="button"
                className={`card-button${selectedCardId === cardId ? " selected" : ""}`}
                onClick={() => onSelectCard(cardId)}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </div>
      {actions ? <div className="hand-actions">{actions}</div> : null}
    </div>
  );
}

function ClueControls({
  targetPlayerId,
  targetName,
  view,
  onClue,
  onClearError,
}: {
  targetPlayerId: string;
  targetName: string;
  view: PlayerGameView;
  onClue: (targetId: string, kind: "color" | "number", value: string) => void;
  onClearError: () => void;
}) {
  const [clueKind, setClueKind] = useState<"color" | "number">("color");
  const [clueValue, setClueValue] = useState("");

  const submit = () => {
    if (!clueValue) return;
    onClue(targetPlayerId, clueKind, clueValue);
    setClueValue("");
    onClearError();
  };

  return (
    <div className="clue-controls">
      <span className="clue-target-label">Clue for {targetName}</span>
      <div className="row">
        <select
          value={clueKind}
          onChange={(e) => {
            setClueKind(e.target.value as "color" | "number");
            setClueValue("");
          }}
        >
          <option value="color">Color</option>
          <option value="number">Number</option>
        </select>
        {clueKind === "color" ? (
          <select value={clueValue} onChange={(e) => setClueValue(e.target.value)}>
            <option value="">Color</option>
            {view.rules.colors
              .filter((c) => c.canBeClued)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
          </select>
        ) : (
          <select value={clueValue} onChange={(e) => setClueValue(e.target.value)}>
            <option value="">Number</option>
            {[...new Set(view.rules.colors.flatMap((c) => c.numbers.map((n) => n.value)))]
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
          </select>
        )}
        <button
          disabled={!clueValue || view.pointers <= 0}
          onClick={submit}
        >
          Give clue
        </button>
      </div>
    </div>
  );
}

export function GameScreen({
  view,
  sessionToken,
  connectionState,
  error,
  onClearError,
  onAction,
  onSaveNotes,
  onLeave,
}: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [historySnapshot, setHistorySnapshot] = useState<TurnHistorySnapshot | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [notes, setNotes] = useState(view.privateNotes);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesFocused = useRef(false);
  const clueListExpansion = useClueListExpansion(view.gameId);

  useEffect(() => {
    if (historyIndex !== null && historyIndex >= view.turnHistory.length) {
      setHistoryIndex(null);
    }
  }, [historyIndex, view.turnHistory.length]);

  useEffect(() => {
    if (historyIndex === null) {
      setHistorySnapshot(null);
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    fetch(
      `/api/games/${view.gameId}/history/${historyIndex}?sessionToken=${encodeURIComponent(sessionToken)}`,
    )
      .then((response) => response.json())
      .then((data: TurnHistorySnapshot | { error?: string }) => {
        if (cancelled) return;
        if ("error" in data && data.error) {
          setHistoryError(data.error);
          setHistorySnapshot(null);
        } else {
          setHistorySnapshot(data as TurnHistorySnapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryError("Failed to load history snapshot");
          setHistorySnapshot(null);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [historyIndex, view.gameId, sessionToken]);

  const isReplayMode = historyIndex !== null && historySnapshot !== null;

  const colorMap = useMemo(
    () => Object.fromEntries(view.rules.colors.map((c) => [c.id, c.displayColor])),
    [view.rules.colors],
  );

  const colorNameMap = useMemo(
    () => Object.fromEntries(view.rules.colors.map((c) => [c.id, c.displayName])),
    [view.rules.colors],
  );

  const discardByColor = useMemo(() => {
    const discardCards = isReplayMode ? historySnapshot!.discard : view.discard;
    const groups = new Map<string, typeof view.discard>();
    for (const color of view.rules.colors) {
      groups.set(color.id, []);
    }
    for (const card of discardCards) {
      const list = groups.get(card.colorId) ?? [];
      list.push(card);
      groups.set(card.colorId, list);
    }
    for (const [, cards] of groups) {
      cards.sort((a, b) => a.number - b.number);
    }
    return groups;
  }, [isReplayMode, historySnapshot, view.discard, view.rules.colors]);

  const displayPointers = isReplayMode ? historySnapshot!.pointers : view.pointers;
  const displayStumbles = isReplayMode ? historySnapshot!.stumbles : view.stumbles;
  const displayDeckCount = isReplayMode ? historySnapshot!.deckCount : view.deckCount;
  const displayPlayed = isReplayMode ? historySnapshot!.played : view.played;
  const displayCardTurns = isReplayMode ? historySnapshot!.cardTurns : view.cardTurns;
  const displayPlayedTurns = isReplayMode ? historySnapshot!.playedTurns : view.playedTurns;
  const displayTurnOrder = isReplayMode ? historySnapshot!.turnOrder : view.turnOrder;
  const displayCurrentPlayerId = isReplayMode
    ? historySnapshot!.currentPlayerId
    : view.currentPlayerId;
  const displayTurnNumber = isReplayMode ? historySnapshot!.turnNumber : view.turnNumber;

  const historyRecord =
    historyIndex !== null
      ? view.turnHistory.find((t) => t.index === historyIndex)
      : null;

  const canAct =
    !isReplayMode && view.isYourTurn && view.phase === "playing" && !view.paused;

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => onSaveNotes(value), 500);
  };

  const doPlay = () => {
    if (!selectedCardId) return;
    onAction({ type: "PLAY_CARD", playerId: view.playerId, cardId: selectedCardId });
    setSelectedCardId(null);
    onClearError();
  };

  const doDiscard = () => {
    if (!selectedCardId) return;
    onAction({ type: "DISCARD_CARD", playerId: view.playerId, cardId: selectedCardId });
    setSelectedCardId(null);
    onClearError();
  };

  const doClue = (targetId: string, kind: "color" | "number", value: string) => {
    const clue =
      kind === "color"
        ? { kind: "color" as const, colorId: value }
        : { kind: "number" as const, number: Number(value) };
    onAction({
      type: "GIVE_CLUE",
      playerId: view.playerId,
      targetPlayerId: targetId,
      clue,
    });
    onClearError();
  };

  const recentTurns = view.recentTurns.filter((s) => s.lines.length > 0);

  const turnOrderText = displayTurnOrder
    .map((entry) => {
      const isCurrent = entry.playerId === displayCurrentPlayerId;
      return isCurrent ? `${entry.displayName} ★` : entry.displayName;
    })
    .join(" → ");

  function pileLabelStyle(colorId: string, displayColor: string): CSSProperties {
    if (colorId === "white") {
      return { color: "#2d3748" };
    }
    return { color: displayColor };
  }

  const doExport = async () => {
    setExporting(true);
    setExportMessage(null);
    try {
      await downloadGameExport(view.gameId, sessionToken);
      setExportMessage("Game saved — download started.");
    } catch (e) {
      setExportMessage(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportMessage(null), 4000);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(buildInviteClipboardText(view.inviteCode));
      setExportMessage("Invite link copied — share so friends can rejoin.");
    } catch {
      setExportMessage(`Invite code: ${view.inviteCode}`);
    }
    window.setTimeout(() => setExportMessage(null), 4000);
  };

  return (
    <div className={`game-screen${isReplayMode ? " replay-mode" : ""}`}>
      {!isReplayMode && (
        <TurnActionOverlay
          turnHistory={view.turnHistory}
          players={view.players}
          colors={view.rules.colors}
        />
      )}
      {!isReplayMode && (
        <GameEndOverlay phase={view.phase} lossReason={view.lossReason} />
      )}
      <header className="game-header row">
        <h1>Blind Guides</h1>
        <div className="header-actions row">
          <button type="button" onClick={() => setRulesOpen(true)}>
            Rules
          </button>
          <button type="button" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      {rulesOpen && (
        <RulesModal rules={view.rules} onClose={() => setRulesOpen(false)} />
      )}

      {isReplayMode && (
        <div className="history-replay-banner panel">
          <strong>
            Viewing turn {historySnapshot!.turnNumber} (history snapshot)
          </strong>
          <span className="muted">
            All hands and clue history shown as they were at this point.
          </span>
          <button type="button" onClick={() => setHistoryIndex(null)}>
            Back to current game
          </button>
        </div>
      )}

      {!isReplayMode && (
        <div
          className={`turn-banner${view.isYourTurn ? " your-turn" : ""}${view.paused ? " paused" : ""}`}
        >
          {view.phase === "won" && "Team wins!"}
          {view.phase === "lost" && `Team loses: ${view.lossReason}`}
          {view.phase === "playing" && view.paused && "Game paused"}
          {view.phase === "playing" &&
            !view.paused &&
            (view.isYourTurn
              ? "Your turn — choose an action"
              : `${view.currentPlayerName ?? "Someone"}'s turn`)}
        </div>
      )}

      {!isReplayMode && view.turnOrder.length > 1 && (
        <div className="turn-order-bar panel">
          <strong>Turn order:</strong> {turnOrderText}
        </div>
      )}

      {!isReplayMode && recentTurns.length > 0 && (
        <div className="recent-turns panel">
          <h2>Recent turns</h2>
          {recentTurns.map((turn) => (
            <div key={turn.playerId} className="recent-turn-entry">
              <strong>
                {turn.playerName}
                {turn.isInProgress ? " (in progress)" : ""}:
              </strong>
              <ul>
                {turn.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="muted game-meta">
        Connection:{" "}
        {connectionState === "reconnecting" ? "reconnecting…" : connectionState} · Turn{" "}
        {displayTurnNumber}
        {!isReplayMode && ` · Actions left: ${view.actionsRemaining}`}
        {isReplayMode && " · history view"}
      </p>

      {!isReplayMode && view.rules.openHand && (
        <p className="open-hand-notice">
          Open-hand mode (for beginners): you can see your own cards.
        </p>
      )}

      <div className="game-layout">
        <aside className="game-sidebar">
          <div className="panel tokens">
            <span>Pointers {displayPointers}/{view.rules.maxPointers}</span>
            <span>Stumbles {displayStumbles}/{view.rules.maxStumbles}</span>
            <span>Deck {displayDeckCount}</span>
          </div>

          <div className="panel">
            <h2>Played</h2>
            <div className="piles">
              {view.rules.colors.map((color) => (
                <ColorRulesTooltip
                  key={color.id}
                  color={color}
                  allColors={view.rules.colors}
                >
                  <div className="color-pile color-pile-hoverable">
                    <strong
                      className={color.id === "white" ? "pile-label-light" : undefined}
                      style={pileLabelStyle(color.id, color.displayColor)}
                    >
                      <span
                        className="pile-swatch"
                        style={{ background: color.displayColor }}
                      />
                      {color.displayName}
                    </strong>
                    <div className="played-numbers">
                      {(displayPlayed[color.id] ?? []).length === 0 ? (
                        "—"
                      ) : (
                        (displayPlayed[color.id] ?? []).map((num) => (
                          <CardHoverTooltip
                            key={num}
                            text={cardPlayedTooltip(
                              displayPlayedTurns[`${color.id}:${num}`],
                            )}
                          >
                            <span className="played-number-chip">{num}</span>
                          </CardHoverTooltip>
                        ))
                      )}
                    </div>
                  </div>
                </ColorRulesTooltip>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Discard</h2>
            <div className="discard-grid">
              {view.rules.colors.map((color) => {
                const cards = discardByColor.get(color.id) ?? [];
                if (cards.length === 0) return null;
                return (
                  <div key={color.id} className="discard-color-column">
                    <div className="discard-color-label" style={{ color: color.displayColor }}>
                      {color.displayName}
                    </div>
                    <div className="hand discard-hand">
                      {cards.map((c) => (
                        <CardHoverTooltip
                          key={c.id}
                          text={cardDiscardTooltip(displayCardTurns[c.id])}
                        >
                          <div
                            className="card"
                            style={{ borderColor: colorMap[c.colorId] }}
                          >
                            <div className="card-color-label">
                              {formatColorLabel(colorNameMap[c.colorId] ?? c.colorId).map(
                                (line, i) => (
                                  <span key={i} className="card-color-line">
                                    {line}
                                  </span>
                                ),
                              )}
                            </div>
                            <div className="card-number">{c.number}</div>
                          </div>
                        </CardHoverTooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </aside>

        <main className="game-main">
          <div className="panel hands-panel">
            <h2>Hands</h2>
            <div className={`hands-grid${view.players.length > 2 ? " many-players" : ""}`}>
              {displayTurnOrder.map((entry) => {
                const isMe = entry.playerId === view.playerId;
                const cards = isReplayMode
                  ? (historySnapshot!.hands[entry.playerId] ?? [])
                  : isMe
                    ? view.yourHand
                    : (view.otherHands[entry.playerId] ?? []);
                const label = isMe ? "Your hand" : entry.displayName;
                const clueHistories = isReplayMode
                  ? (historySnapshot!.handClueHistories[entry.playerId] ?? {})
                  : (view.handClueHistories[entry.playerId] ?? {});

                return (
                  <HandRow
                    key={entry.playerId}
                    label={label}
                    cards={cards}
                    colorMap={colorMap}
                    colorNameMap={colorNameMap}
                    cardTurns={displayCardTurns}
                    clueHistories={clueHistories}
                    clueListExpansion={clueListExpansion}
                    isCurrentTurn={displayCurrentPlayerId === entry.playerId}
                    selectable={isMe && canAct}
                    selectedCardId={isMe ? selectedCardId : undefined}
                    onSelectCard={
                      isMe && canAct ? (id) => setSelectedCardId(id) : undefined
                    }
                    actions={
                      isMe && canAct ? (
                        <div className="your-hand-actions">
                          <button
                            className="primary"
                            disabled={!selectedCardId}
                            onClick={doPlay}
                          >
                            Play selected
                          </button>
                          <button disabled={!selectedCardId} onClick={doDiscard}>
                            Discard selected
                          </button>
                          {view.actionsRemaining > 0 &&
                            view.actionsRemaining < view.rules.actionsPerTurn && (
                              <button
                                onClick={() =>
                                  onAction({ type: "END_TURN", playerId: view.playerId })
                                }
                              >
                                End turn early
                              </button>
                            )}
                        </div>
                      ) : !isMe && canAct ? (
                        <ClueControls
                          targetPlayerId={entry.playerId}
                          targetName={entry.displayName}
                          view={view}
                          onClue={doClue}
                          onClearError={onClearError}
                        />
                      ) : undefined
                    }
                  />
                );
              })}
            </div>

            {!isReplayMode && (
              <div className="private-notes">
                <label htmlFor="private-notes">
                  <strong>Private notes</strong>
                  <span className="muted"> — only you can see these</span>
                </label>
                <textarea
                  id="private-notes"
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onFocus={() => {
                    notesFocused.current = true;
                  }}
                  onBlur={() => {
                    notesFocused.current = false;
                  }}
                  placeholder="Track clues about your cards, e.g. 'B is red', 'D and E are not blue'…"
                  rows={4}
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {!isReplayMode && view.canUndo && (
            <div className="panel">
              <h2>Undo controls</h2>
              <p className="muted">
                Undo the last action if someone mis-clicked. Disabled if the host checked
                "Don't allow Undo Action" in game settings.
              </p>
              <button
                type="button"
                onClick={() => {
                  onAction({ type: "UNDO", playerId: view.playerId });
                  onClearError();
                }}
              >
                Undo last action
              </button>
            </div>
          )}

          {!isReplayMode && view.isHost && (
            <div className="panel">
              <h2>Host controls</h2>
              {view.phase === "playing" && (
                <div className="row">
                  {!view.paused ? (
                    <button onClick={() => onAction({ type: "PAUSE", playerId: view.playerId })}>
                      Pause game
                    </button>
                  ) : (
                    <button onClick={() => onAction({ type: "RESUME", playerId: view.playerId })}>
                      Resume game
                    </button>
                  )}
                </div>
              )}
              <p className="muted">
                Export the game before a long break so you can import it later if the server
                goes idle. After importing a saved game, share a fresh invite link — the code
                changes each time.
              </p>
              <div className="row">
                <button type="button" onClick={copyInviteLink}>
                  Copy invite link
                </button>
                <button type="button" disabled={exporting} onClick={doExport}>
                  {exporting ? "Exporting…" : "Export game"}
                </button>
              </div>
              {exportMessage && <p className="copy-feedback">{exportMessage}</p>}
            </div>
          )}
        </main>

        <aside className="game-history-panel panel history-panel">
          <h2>Turn history</h2>
          <select
            className="history-select"
            value={historyIndex ?? ""}
            onChange={(e) =>
              setHistoryIndex(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Current state</option>
            {view.turnHistory.map((record) => (
              <option key={record.index} value={record.index}>
                Turn {record.turnNumber}:{" "}
                {record.events.filter(isDisplayableHistoryEvent).length === 0
                  ? "snapshot"
                  : record.events
                      .filter(isDisplayableHistoryEvent)
                      .map((e) => formatGameEvent(e, view.players, view.rules.colors))
                      .join("; ")}
              </option>
            ))}
          </select>
          {historyLoading && <p className="muted">Loading snapshot…</p>}
          {historyError && <p className="error">{historyError}</p>}
          <ul className="history-list">
            {view.historyLines.map((line) => (
              <li key={line.index}>
                Turn {line.turnNumber}: {line.summary}
              </li>
            ))}
          </ul>
          {historyRecord && (
            <div className="history-detail">
              {historyRecord.events.filter(isDisplayableHistoryEvent).length === 0 ? (
                <p className="muted">Opening snapshot for turn {historyRecord.turnNumber}</p>
              ) : (
                historyRecord.events
                  .filter(isDisplayableHistoryEvent)
                  .map((event, i) => (
                    <p key={i}>{formatGameEvent(event, view.players, view.rules.colors)}</p>
                  ))
              )}
            </div>
          )}
        </aside>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
