// Checks the real data/cards.json, so `npm test` catches a bad card before it's pushed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkCards } from "../src/engine/cardCheck.js";

test("data/cards.json is valid JSON with no problems", () => {
  const text = readFileSync(new URL("../data/cards.json", import.meta.url), "utf8");
  let cards;
  assert.doesNotThrow(() => (cards = JSON.parse(text)), "data/cards.json isn't valid JSON (check for a trailing comma)");
  assert.deepEqual(checkCards(cards), []);
});

test("the checker catches common mistakes", () => {
  const good = { id: "ARM-009", name: "X", type: "spell", signets: ["martial"], cost: 1, text: "", image: "" };
  assert.deepEqual(checkCards([good]), []);
  assert.equal(checkCards([good, good]).length, 1); // duplicate id
  assert.equal(checkCards([{ ...good, signets: ["pirates"] }]).length, 1);
  assert.equal(checkCards([{ ...good, type: "unit" }]).length, 5); // 4 unit fields missing, plus cost instead of grade
  assert.equal(checkCards([{ ...good, cost: "2" }]).length, 1);
  const formation = { ...good, type: "formation", cost: 1, slots: [0, 1, 2], combine: "sum", damageGrade: 1, defenseGrade: 0 };
  assert.deepEqual(checkCards([formation]), []);
  assert.equal(checkCards([{ ...formation, slots: [0, 9] }]).length, 1);
  assert.equal(checkCards([{ ...formation, combine: "times" }]).length, 1);
  assert.equal(checkCards([{ ...formation, defenseGrade: -1 }]).length, 1);
  // Standard Formation cost (8 Oct): its Damage Grade.
  assert.equal(checkCards([{ ...formation, cost: 0 }]).length, 1);
  assert.deepEqual(checkCards([{ ...formation, cost: 1 }]), []);
  assert.deepEqual(checkCards([{ ...formation, damageGrade: 3, cost: 3 }]), []);
  assert.equal(checkCards([{ ...formation, damageGrade: 3, cost: 2 }]).length, 1);
});

test("data/decks.json decks are legal", async () => {
  const { checkDecks } = await import("../src/engine/cardCheck.js");
  const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
  assert.deepEqual(checkDecks(read("decks.json"), read("cards.json")), []);
});
