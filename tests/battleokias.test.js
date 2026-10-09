import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkDeck, sharesSignet, fitsDeck } from "../src/engine/cards.js";
import { checkDecks } from "../src/engine/cardCheck.js";
import { inPromotionLine } from "../src/engine/engine.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = (id) => cards.find((c) => c.id === id);

test("the Students are Battle'O'Kias cards with their new names", () => {
  assert.deepEqual(["ARM-010", "ARM-011", "ARM-012"].map((id) => [byId(id).name, byId(id).signets]), [
    ["Student, First Year", ["battleokias"]],
    ["Student, Second Year", ["battleokias"]],
    ["Student, Graduate", ["battleokias"]],
  ]);
});

test("Battle'O'Kias cards fit every deck, but it isn't a deck Signet itself", () => {
  for (const s of ["martial", "mystic", "alchemy"]) assert.equal(fitsDeck(byId("ARM-010"), s), true);
  assert.deepEqual(checkDeck([byId("ARM-010")], "mystic"), []);
  assert.deepEqual(checkDecks({ battleokias: Array(60).fill("ARM-010") }, cards), ['The battleokias deck: unknown Signet "battleokias".']);
});

test("placeholder: Battle'O'Kias shares a Signet with any card, and any Grade 4 can promote a Student, Graduate", () => {
  assert.equal(sharesSignet(byId("EQP-001"), byId("ARM-010")), true);
  assert.equal(sharesSignet({ signets: ["mystic"] }, { signets: ["martial"] }), false);
  assert.equal(inPromotionLine(byId("ARM-012"), byId("ARM-SEN-001")), true);
  assert.equal(inPromotionLine(byId("ARM-012"), { grade: 4, signets: ["mystic"] }), true);
  assert.equal(inPromotionLine(byId("ARM-010"), byId("ARM-012")), false); // promotesFrom still holds the Student line
});
