// Board layout, straight from RULES.md. Each half is a 5-column grid:
//
//   col:   1      2     3     4      5
//   row 1:       [SDZ] [SDZ] [SDZ] [SDZ]      Special Deck Zones (toward the centre)
//   row 2:       [UPS] [UPS] [UPS] [Grave]
//   row 3: [FRM] [UPS] [UPS] [UPS]            Formation Zone, above the FEZ
//   row 4: [FEZ] [UPS] [UPS] [UPS] [Draw]     Field Effect Zone sits bottom-left
//
// That's your half. The opponent's half is the same thing rotated 180 degrees
// across the table, so their Draw pile ends up top-left and their FEZ top-right.
// Change positions here and both halves follow.

export const COLS = 5;
export const ROWS = 4;

// zone: what the slot is, index: which one of that zone (0-based), row/col: where it sits on YOUR half.
export const PLAYER_SLOTS = [
  ...[0, 1, 2, 3].map((i) => ({ zone: "sdz", index: i, row: 1, col: 2 + i, label: "Special" })),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
    zone: "ups",
    // Matches the engine's ups[] (index = row * 3 + col): row 0 is the front row,
    // nearest the centre; col 0 is the left column as that player sees it.
    index: i,
    row: 2 + Math.floor(i / 3),
    col: 2 + (i % 3),
    label: "",
  })),
  { zone: "grave", index: 0, row: 2, col: 5, label: "Grave" },
  { zone: "draw", index: 0, row: 4, col: 5, label: "Draw" },
  { zone: "formation", index: 0, row: 3, col: 1, label: "Formation" },
  { zone: "fez", index: 0, row: 4, col: 1, label: "Field" },
];

// Rotate a slot 180 degrees for the opponent's half.
export function rotate(slot) {
  return { ...slot, row: ROWS + 1 - slot.row, col: COLS + 1 - slot.col };
}
