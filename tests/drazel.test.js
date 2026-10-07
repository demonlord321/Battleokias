// Drazel, Instructor of the Blade (RULES.md): Defense 1000 when summoned, or the
// printed Defense of the unit he promotes. Equipment bonuses stay on top.
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

test("summoned, Drazel has 4000 Attack and 1000 Defense", () => {
  const game = start();
  const p = game.players[0];
  p.hand.push(copy("ARM-MER-001"));
  assert.equal(applyAction(game, { type: "summon", player: 0, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 4000, defense: 1000 });
});

test("promoting a Graduate, he takes its printed 1500 Defense, and its Gear adds on top", () => {
  const game = start();
  const p = game.players[0];
  p.ups[0] = { ...copy("ARM-012"), equipment: { ...copy("EQP-001") } };
  assert.deepEqual(unitStats(game, 0, 0), { attack: 2250, defense: 1750 });
  p.hand.push(copy("ARM-MER-001"));
  assert.equal(applyAction(game, { type: "promote", player: 0, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.equal(p.ups[0].defense, 1500);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 4250, defense: 1750 });
  assert.equal(p.ups[0].under[0].name, "Graduate of Arms");
});

test("the card check accepts his empty Defense only with variableDefense", () => {
  assert.deepEqual(checkCards([byId["ARM-MER-001"]]), []);
  const { variableDefense, ...noRule } = byId["ARM-MER-001"];
  assert.ok(checkCards([noRule]).some((m) => /defense/.test(m)));
  assert.ok(checkCards([{ ...byId["ARM-MER-001"], defense: 1000 }]).some((m) => /"defense": null/.test(m)));
});
