import type { CardInstance, ColorConfig, GameRules } from "@blind-guides/shared";

let cardCounter = 0;

export function resetCardCounter(): void {
  cardCounter = 0;
}

function nextCardId(): string {
  cardCounter += 1;
  return `card-${cardCounter}`;
}

export function buildDeck(rules: GameRules): {
  deck: string[];
  cardById: Record<string, CardInstance>;
} {
  const cards: CardInstance[] = [];

  for (const color of rules.colors) {
    for (const entry of color.numbers) {
      if (entry.count <= 0) continue;
      for (let i = 0; i < entry.count; i++) {
        cards.push({
          id: nextCardId(),
          colorId: color.id,
          number: entry.value,
        });
      }
    }
  }

  const shuffled = shuffle(cards);
  const cardById: Record<string, CardInstance> = {};
  const deck: string[] = [];

  for (const card of shuffled) {
    cardById[card.id] = card;
    deck.push(card.id);
  }

  return { deck, cardById };
}

export function getColorConfig(
  rules: GameRules,
  colorId: string,
): ColorConfig | undefined {
  return rules.colors.find((c) => c.id === colorId);
}

export function getConfiguredNumbers(color: ColorConfig): number[] {
  return [...new Set(color.numbers.filter((n) => n.count > 0).map((n) => n.value))].sort(
    (a, b) => a - b,
  );
}

export function getTotalCopies(color: ColorConfig, number: number): number {
  return color.numbers.find((n) => n.value === number)?.count ?? 0;
}

/** Fisher–Yates shuffle (in-place on copy). */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Seeded shuffle for deterministic tests. */
export function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildDeckDeterministic(
  rules: GameRules,
  rng: () => number,
): { deck: string[]; cardById: Record<string, CardInstance> } {
  const cards: CardInstance[] = [];

  for (const color of rules.colors) {
    for (const entry of color.numbers) {
      if (entry.count <= 0) continue;
      for (let i = 0; i < entry.count; i++) {
        cards.push({
          id: nextCardId(),
          colorId: color.id,
          number: entry.value,
        });
      }
    }
  }

  const shuffled = shuffleWithRng(cards, rng);
  const cardById: Record<string, CardInstance> = {};
  const deck: string[] = [];

  for (const card of shuffled) {
    cardById[card.id] = card;
    deck.push(card.id);
  }

  return { deck, cardById };
}
