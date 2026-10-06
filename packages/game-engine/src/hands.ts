import { slotLabel } from "@blind-guides/shared";

export type HandSlots = (string | null)[];

export function createEmptyHand(handSize: number): HandSlots {
  return Array.from({ length: handSize }, () => null);
}

export function handContains(hand: HandSlots, cardId: string): boolean {
  return hand.some((id) => id === cardId);
}

export function removeCardFromSlots(
  hand: HandSlots,
  cardId: string,
): HandSlots {
  const next = [...hand];
  const index = next.indexOf(cardId);
  if (index !== -1) {
    next[index] = null;
  }
  return next;
}

export function fillVacatedSlots(
  hand: HandSlots,
  deck: string[],
  count: number,
): { hand: HandSlots; deck: string[]; drawnIds: string[] } {
  const nextHand = [...hand];
  const nextDeck = [...deck];
  const drawnIds: string[] = [];
  let remaining = count;

  for (let i = 0; i < nextHand.length && remaining > 0 && nextDeck.length > 0; i++) {
    if (nextHand[i] === null) {
      const cardId = nextDeck.pop()!;
      nextHand[i] = cardId;
      drawnIds.push(cardId);
      remaining--;
    }
  }

  return { hand: nextHand, deck: nextDeck, drawnIds };
}

export function iterHandCards(hand: HandSlots): string[] {
  return hand.filter((id): id is string => id !== null);
}

export function getSlotLabelForCard(
  hand: HandSlots,
  cardId: string,
): string | undefined {
  const index = hand.indexOf(cardId);
  return index === -1 ? undefined : slotLabel(index);
}

export function getSlotLabelsForCards(
  hand: HandSlots,
  cardIds: string[],
): string[] {
  return cardIds
    .map((id) => getSlotLabelForCard(hand, id))
    .filter((label): label is string => label !== undefined);
}
