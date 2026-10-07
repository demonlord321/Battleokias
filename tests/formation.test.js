// Formations (RULES.md): Frontal Assault sums the Attack and Defense of the units in its slots.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, formationStats } from "../src/engine/engine.js";

let n = 0;
const unit = (grade, attack, defense) => ({ id: `U-${++n}`, name: `Unit${n}`, type: "unit", grade, attack, defense });
const frontal = () => ({ id: `FRM-001#${++n}`, cardId: "FRM-001", name: "Frontal Assault", type: "formation", cost: 0, slots: [0, 1, 2], combine: "sum" });
const deckOf = (size = 30) => Array.from({ length: size }, () => unit(1, 500, 500));

function start() {
  const game = newGame({ seed: 3, decks: [deckOf(), deckOf()], startingPlayer: 0 });
  game.players[0].hand.push(frontal());
  return game;
}
const place = (game, who, slot, u) => (game.players[who].ups[slot] = { ...u, summonedThisTurn: false, hasAttacked: false });
const lastCard = (game) => game.players[0].hand.length - 1;

test("set a Formation from hand into the Formation Zone in Preparation Phase I", () => {
  const game = start();
  assert.equal(formationStats(game, 0), null);
  assert.equal(applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) }).ok, true);
  assert.equal(game.players[0].formationZone.name, "Frontal Assault");
});

test("only Formation cards, only in Preparation Phase I", () => {
  const game = start();
  assert.match(checkAction(game, { type: "setFormation", player: 0, card: 0 }), /isn't a Formation/);
  applyAction(game, { type: "nextPhase", player: 0 });
  assert.match(checkAction(game, { type: "setFormation", player: 0, card: lastCard(game) }), /Preparation Phase I/);
});

test("Frontal Assault sums the three front-row units and ignores the rest", () => {
  const game = start();
  applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) });
  place(game, 0, 0, unit(1, 500, 500)); // Student
  place(game, 0, 1, unit(2, 1500, 1000)); // Apprentice
  assert.deepEqual(formationStats(game, 0), { name: "Frontal Assault", attack: 2000, defense: 1500, missing: 1, complete: false });
  place(game, 0, 2, unit(1, 500, 500)); // Student
  place(game, 0, 4, unit(3, 2000, 1500)); // Graduate in the middle row doesn't count
  assert.deepEqual(formationStats(game, 0), { name: "Frontal Assault", attack: 2500, defense: 2000, missing: 0, complete: true });
});

test("a new Formation replaces the old one, which goes to the Grave (placeholder)", () => {
  const game = start();
  applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) });
  game.players[0].hand.push(frontal());
  applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) });
  assert.equal(game.players[0].graveyard.length, 1);
});
