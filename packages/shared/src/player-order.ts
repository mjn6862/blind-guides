import type { PlayerInfo } from "./types.js";

/** Order players by id list; appends any players missing from the list. */
export function orderPlayersByIds(
  players: PlayerInfo[],
  order: string[],
): PlayerInfo[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const ordered: PlayerInfo[] = [];
  const seen = new Set<string>();

  for (const id of order) {
    const player = byId.get(id);
    if (player) {
      ordered.push(player);
      seen.add(id);
    }
  }

  for (const player of players) {
    if (!seen.has(player.id)) {
      ordered.push(player);
    }
  }

  return ordered;
}

export function shufflePlayerIds(
  ids: string[],
  rng: () => number = Math.random,
): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/** Keep playerOrder aligned with current players (join order for new players). */
export function syncPlayerOrder(
  players: PlayerInfo[],
  playerOrder: string[],
  joinOrder: string[],
): { playerOrder: string[]; joinOrder: string[] } {
  const playerIds = new Set(players.map((p) => p.id));
  const nextJoin = joinOrder.filter((id) => playerIds.has(id));
  for (const player of players) {
    if (!nextJoin.includes(player.id)) {
      nextJoin.push(player.id);
    }
  }

  const nextOrder = playerOrder.filter((id) => playerIds.has(id));
  for (const player of players) {
    if (!nextOrder.includes(player.id)) {
      nextOrder.push(player.id);
    }
  }

  return { playerOrder: nextOrder, joinOrder: nextJoin };
}

export type PlayerOrderAction =
  | { type: "set"; order: string[] }
  | { type: "randomize" }
  | { type: "join_order" }
  | { type: "move"; playerId: string; direction: "up" | "down" };

export function applyPlayerOrderAction(
  players: PlayerInfo[],
  playerOrder: string[],
  joinOrder: string[],
  action: PlayerOrderAction,
  rng: () => number = Math.random,
): string[] {
  const synced = syncPlayerOrder(players, playerOrder, joinOrder);
  let order = [...synced.playerOrder];

  switch (action.type) {
    case "set": {
      const valid = action.order.filter((id) => players.some((p) => p.id === id));
      if (valid.length !== players.length) {
        throw new Error("Player order must include every player exactly once");
      }
      return orderPlayersByIds(players, valid).map((p) => p.id);
    }
    case "randomize":
      return shufflePlayerIds(order, rng);
    case "join_order":
      return [...synced.joinOrder];
    case "move": {
      const index = order.indexOf(action.playerId);
      if (index < 0) {
        throw new Error("Player not found in turn order");
      }
      const target =
        action.direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= order.length) {
        return order;
      }
      const next = [...order];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);
      return next;
    }
    default:
      return order;
  }
}
