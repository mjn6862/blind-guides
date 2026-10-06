/** Slot index 0 → A, 1 → B, … 25 → Z, 26 → AA, etc. */
export function slotLabel(index: number): string {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export function formatSlotList(labels: string[]): string {
  if (labels.length === 0) return "no cards";
  if (labels.length === 1) return `card ${labels[0]}`;
  if (labels.length === 2) return `cards ${labels[0]} and ${labels[1]}`;
  return `cards ${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}
