// Promotion lines (Dyllan, 9 Oct): same main Signet or same Class, one Grade up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inPromotionLine } from "../src/engine/engine.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const unit = (signets, cls) => ({ type: "unit", signets, ...(cls ? { class: cls } : {}) });

test("the Instructor promotes any Martial Grade 4: the Practitioner, Galent or Sena", () => {
  for (const id of ["UNT-MAR-005", "UNT-MAR-002", "UNT-MAR-003"]) assert.equal(inPromotionLine(byId[id], byId["UNT-MAR-001"]), true, id);
});

test("the same Class works across Signets; sub-Signets and missing Classes don't count", () => {
  assert.equal(inPromotionLine(unit(["mystic"], "Swordsman"), byId["UNT-MAR-001"]), true);
  assert.equal(inPromotionLine(unit(["mystic"], "swordsman"), byId["UNT-MAR-001"]), true);
  assert.equal(inPromotionLine(unit(["mystic"], "Guardian"), byId["UNT-MAR-001"]), false);
  assert.equal(inPromotionLine(unit(["mystic", "martial"]), byId["UNT-MAR-001"]), false);
  assert.equal(inPromotionLine(unit(["mystic"]), unit(["alchemy"])), false);
});

test("the Students keep their own line, and any Grade 4 still promotes a Graduate", () => {
  assert.equal(inPromotionLine(byId["UNT-BOK-001"], byId["UNT-BOK-002"]), true);
  assert.equal(inPromotionLine(unit(["battleokias"], "Swordsman"), byId["UNT-BOK-002"]), false);
  assert.equal(inPromotionLine(byId["UNT-BOK-003"], byId["UNT-MAR-002"]), true);
});
