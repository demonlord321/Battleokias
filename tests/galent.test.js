// Galent, The Unbreakable Shield: Drazel's mirror image. Attack 1000 when summoned, or the
// Attack of the unit he promotes (its total when that unit's Equipment stays on).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, unitStats } from "../src/engine/engine.js";
import { checkCards } from "../src/engine/cardCheck.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const copy = (id, k = 1) => ({ ...byId[id], cardId: id, id: `${id}#${k}` });
const filler = () => Array.from({ length: 30 }, (_, i) => copy("ARM-010", i + 10));

function start() {
  const game = newGame({ seed: 2, decks: [filler(), filler()], startingPlayer: 0 });
  game.players[0].energy = 10;
  return game;
}

test("summoned, Galent has 1000 Attack and 4000 Defense", () => {
  const game = start();
  const p = game.players[0];
  p.ups[1] = copy("ARM-012");
  p.hand.push(copy("ARM-MER-002"));
  assert.equal(applyAction(game, { type: "summon", player: 0, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 1000, defense: 4000 });
});

test("promoting a Graduate, he takes its printed 2000 Attack", () => {
  const game = start();
  const p = game.players[0];
  p.ups[0] = { ...copy("ARM-012"), equipment: { ...copy("EQP-001") } }; // the Gear goes to the Grave at Grade 4
  p.hand.push(copy("ARM-MER-002"));
  assert.equal(applyAction(game, { type: "promote", player: 0, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 2000, defense: 4000 });
});

test("if the Equipment stays on, he takes the total Attack, and its Attack bonus isn't counted twice", () => {
  const game = start();
  const p = game.players[0];
  const armour = { ...copy("EQP-001"), id: "ARMOUR#1", maxGrade: undefined, boost: { attack: 300, defense: 400 } };
  p.ups[0] = { ...copy("ARM-012"), equipment: armour };
  p.hand.push(copy("ARM-MER-002"));
  assert.equal(applyAction(game, { type: "promote", player: 0, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.equal(p.ups[0].attack, 2300);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 2300, defense: 4400 });
  assert.equal(applyAction(game, { type: "retire", player: 0, slot: 0 }).ok, true);
  assert.equal(p.graveyard.find((c) => c.id === "ARMOUR#1").attackCopied, undefined);
});

test("the card check accepts his empty Attack only with variableAttack", () => {
  assert.deepEqual(checkCards([byId["ARM-MER-002"]]), []);
  const { variableAttack, ...noRule } = byId["ARM-MER-002"];
  assert.ok(checkCards([noRule]).some((m) => /attack/.test(m)));
  assert.ok(checkCards([{ ...byId["ARM-MER-002"], attack: 1000 }]).some((m) => /"attack": null/.test(m)));
});

test("Comment entries in cards.json are skipped", () => {
  assert.deepEqual(checkCards([{ Comment: "UNITS GRADE 1-3" }, byId["ARM-MER-002"]]), []);
});
