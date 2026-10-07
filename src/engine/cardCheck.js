// Checks the card list in data/cards.json for typos and missing fields.
// Used by `npm test` and `npm run check-cards`, so a bad card is caught before it's pushed.

import { SIGNETS } from "./cards.js";

// RULES.md card types. Monsters are parked until unit attacks are designed.
export const CARD_TYPES = ["unit", "spell", "field_spell", "trap", "equipment", "artifact", "monster", "formation"];

// Fields every card needs, and the extra ones each type needs.
const COMMON = { id: "string", name: "string", type: "string", signets: "array", text: "string", image: "string" };
// Units have a Grade (their Energy cost and rarity in one number); other cards have a cost.
const BY_TYPE = {
  unit: { grade: "number", attack: "number", defense: "number", formation: "string" },
  // slots: the Unit Position Slots (0 to 8, front row 0-2) the Formation draws from.
  formation: { cost: "number", slots: "array", combine: "string", damageGrade: "number", defenseGrade: "number" },
};
// How a Formation adds up its units. Only "sum" (Frontal Assault) so far.
export const COMBINE_RULES = ["sum"];
const DEFAULT_FIELDS = { cost: "number" };

// IDs look like ARM-001, or ARM-ALC-001 for a card with more than one Signet.
const ID_PATTERN = /^[A-Z]{3}(-[A-Z]{3})*-\d{3}$/;

function typeOf(value) {
  return Array.isArray(value) ? "array" : typeof value;
}

// Returns a list of readable problems; an empty list means every card is fine.
export function checkCards(cards) {
  if (!Array.isArray(cards)) return ["cards.json should be a list of cards, starting with [ and ending with ]."];
  const problems = [];
  const seen = new Set();
  cards.forEach((card, i) => {
    const where = `Card ${i + 1}${card?.id ? ` (${card.id})` : ""}`;
    if (typeOf(card) !== "object") return problems.push(`${where}: should be an object in { }.`);

    const fields = { ...COMMON, ...(BY_TYPE[card.type] ?? DEFAULT_FIELDS) };
    for (const [field, kind] of Object.entries(fields)) {
      if (!(field in card)) problems.push(`${where}: missing "${field}".`);
      else if (typeOf(card[field]) !== kind) problems.push(`${where}: "${field}" should be a ${kind}, not ${typeOf(card[field])}.`);
    }

    if (typeof card.id === "string") {
      if (!ID_PATTERN.test(card.id)) problems.push(`${where}: id should look like ARM-001.`);
      if (seen.has(card.id)) problems.push(`${where}: id ${card.id} is used more than once.`);
      seen.add(card.id);
    }
    if (typeof card.type === "string" && !CARD_TYPES.includes(card.type)) {
      problems.push(`${where}: unknown type "${card.type}". Use one of: ${CARD_TYPES.join(", ")}.`);
    }
    if (Array.isArray(card.signets)) {
      if (card.signets.length === 0) problems.push(`${where}: needs at least one Signet.`);
      for (const s of card.signets) {
        if (!SIGNETS.includes(s)) problems.push(`${where}: unknown Signet "${s}". Use one of: ${SIGNETS.join(", ")}.`);
      }
    }
    if (card.type === "unit") {
      for (const old of ["cost", "level"]) if (old in card) problems.push(`${where}: units use "grade" instead of "${old}".`);
      if (typeof card.grade === "number" && (card.grade < 1 || card.grade > 10 || !Number.isInteger(card.grade))) {
        problems.push(`${where}: grade should be a whole number from 1 to 10.`);
      }
    } else if (card.type === "formation" && Array.isArray(card.slots)) {
      const ok = card.slots.every((n) => Number.isInteger(n) && n >= 0 && n <= 8);
      if (!ok || card.slots.length === 0 || new Set(card.slots).size !== card.slots.length) {
        problems.push(`${where}: slots should list different slot numbers from 0 to 8 (front row is 0, 1, 2).`);
      }
      for (const g of ["damageGrade", "defenseGrade"]) {
        if (typeof card[g] === "number" && (card[g] < 0 || !Number.isInteger(card[g]))) problems.push(`${where}: ${g} should be a whole number, 0 or more.`);
      }
      if (typeof card.combine === "string" && !COMBINE_RULES.includes(card.combine)) {
        problems.push(`${where}: unknown combine "${card.combine}". Use one of: ${COMBINE_RULES.join(", ")}.`);
      }
    }
    if (card.type === "field_spell" && "unlimitedPromotions" in card && !SIGNETS.includes(card.unlimitedPromotions)) {
      problems.push(`${where}: unlimitedPromotions should be one of: ${SIGNETS.join(", ")}.`);
    }
    if (card.type === "field_spell" && "academy" in card) {
      // An Academy Field Spell (Arms Academy): which card enrolls, which card comes out, after how many turns, and how many fit.
      const a = card.academy;
      if (typeOf(a) !== "object") problems.push(`${where}: "academy" should be an object in { }.`);
      else {
        const ids = new Set(cards.map((c) => c?.id));
        for (const k of ["enroll", "emerge"]) if (!ids.has(a[k])) problems.push(`${where}: academy.${k} should be the id of a card in the list.`);
        for (const k of ["turns", "capacity"]) {
          if (!Number.isInteger(a[k]) || a[k] < 1) problems.push(`${where}: academy.${k} should be a whole number, 1 or more.`);
        }
      }
    }
    if (card.type !== "unit" && typeof card.cost === "number" && (card.cost < 0 || card.cost > 10 || !Number.isInteger(card.cost))) {
      problems.push(`${where}: cost should be a whole number from 0 to 10.`);
    }
  });
  return problems;
}

// RULES.md placeholder deck rules, until Dyllan sets deck size and copy limits.
export const DECK_SIZE = 30;
export const MAX_COPIES = 3;

// Checks data/decks.json: { "<signet>": ["ARM-001", ...], ... }.
// Every id must exist in cards, carry that Signet, appear at most 3 times, and the deck must have 30 cards.
export function checkDecks(decks, cards) {
  if (typeof decks !== "object" || decks === null || Array.isArray(decks)) {
    return ['decks.json should be an object like { "arms": ["ARM-001", ...] }.'];
  }
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const problems = [];
  for (const [signet, list] of Object.entries(decks)) {
    const where = `The ${signet} deck`;
    if (!SIGNETS.includes(signet)) problems.push(`${where}: unknown Signet "${signet}".`);
    if (!Array.isArray(list)) {
      problems.push(`${where}: should be a list of card ids.`);
      continue;
    }
    if (list.length !== DECK_SIZE) problems.push(`${where}: has ${list.length} cards, needs ${DECK_SIZE}.`);
    const counts = {};
    for (const id of list) counts[id] = (counts[id] ?? 0) + 1;
    for (const [id, n] of Object.entries(counts)) {
      const card = byId[id];
      if (!card) problems.push(`${where}: unknown card "${id}".`);
      else if (!card.signets?.includes(signet)) problems.push(`${where}: ${id} doesn't carry the ${signet} Signet.`);
      if (n > MAX_COPIES) problems.push(`${where}: ${n} copies of ${id}, the limit is ${MAX_COPIES}.`);
    }
  }
  return problems;
}
