import { useCallback, useRef, useState } from "react";

const STORAGE_KEY = "blind-guides-clue-list-state";

type ExpansionMap = Record<string, boolean>;

function loadForGame(gameId: string): ExpansionMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<string, ExpansionMap>;
    return all[gameId] ?? {};
  } catch {
    return {};
  }
}

function saveForGame(gameId: string, state: ExpansionMap): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, ExpansionMap>) : {};
    all[gameId] = state;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore quota / private mode
  }
}

function expansionKey(cardId: string, section: "matched" | "failed"): string {
  return `${cardId}:${section}`;
}

export function useClueListExpansion(gameId: string) {
  const gameIdRef = useRef(gameId);
  const stateRef = useRef<ExpansionMap>(loadForGame(gameId));
  const [, bump] = useState(0);

  if (gameIdRef.current !== gameId) {
    gameIdRef.current = gameId;
    stateRef.current = loadForGame(gameId);
  }

  const isOpen = useCallback((cardId: string, section: "matched" | "failed") => {
    const key = expansionKey(cardId, section);
    return stateRef.current[key] ?? true;
  }, []);

  const toggle = useCallback(
    (cardId: string, section: "matched" | "failed") => {
      const key = expansionKey(cardId, section);
      const current = stateRef.current[key] ?? true;
      stateRef.current = { ...stateRef.current, [key]: !current };
      saveForGame(gameIdRef.current, stateRef.current);
      bump((n) => n + 1);
    },
    [],
  );

  return { isOpen, toggle };
}
