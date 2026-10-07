import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDeck } from "../src/engine/cards.js";

const scout = { id: "ARM-001", name: "Goblin Scout", signets: ["arms", "alchemy"] };
const mage = { id: "MAG-001", name: "Apprentice", signets: ["magic"] };

test("a deck of cards that all carry its Signet is legal", () => {
  assert.deepEqual(checkDeck([scout, scout], "arms"), []);
  assert.deepEqual(checkDeck([scout], "alchemy"), []); // dual-Signet card fits both decks
});

test("a card without the deck's Signet is flagged", () => {
  const problems = checkDeck([scout, mage], "arms");
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Apprentice/);
});

test("an unknown Signet is flagged", () => {
  assert.equal(checkDeck([], "pirates").length, 1);
});
