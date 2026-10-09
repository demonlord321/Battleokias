import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDeck } from "../src/engine/cards.js";

const scout = { id: "ARM-001", name: "Goblin Scout", signets: ["martial", "alchemy"] };
const mage = { id: "MAG-001", name: "Apprentice", signets: ["mystic"] };

test("a deck of cards that all carry its Signet is legal", () => {
  assert.deepEqual(checkDeck([scout, scout], "martial"), []);
  assert.deepEqual(checkDeck([scout], "alchemy"), []); // dual-Signet card fits both decks
});

test("a card without the deck's Signet is flagged", () => {
  const problems = checkDeck([scout, mage], "martial");
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Apprentice/);
});

test("an unknown Signet is flagged", () => {
  assert.equal(checkDeck([], "pirates").length, 1);
});
