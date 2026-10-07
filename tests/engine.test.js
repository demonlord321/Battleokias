// Run with: npm test   (or: node --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRng, shuffle } from "../src/engine/rng.js";
import { newGame, applyAction, checkAction, legalActions, spendEnergy } from "../src/engine/engine.js";

const deck = (prefix, n = 40) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }));
const start = (opts = {}) => newGame({ seed: 1, decks: [deck("a"), deck("b")], ...opts });

test("same seed gives the same shuffle", () => {
  const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.deepEqual(shuffle(cards, createRng(42)), shuffle(cards, createRng(42)));
  assert.notDeepEqual(shuffle(cards, createRng(42)), shuffle(cards, createRng(7)));
});

test("starting player begins Preparation Phase I with 5 cards, opponent holds 5", () => {
  for (const first of [0, 1]) {
    const game = start({ startingPlayer: first });
    assert.equal(game.activePlayer, first);
    assert.equal(game.phase, "prep1");
    assert.equal(game.turn, 1);
    assert.equal(game.players[first].hand.length, 5); // 4 dealt + 1 drawn
    assert.equal(game.players[1 - first].hand.length, 5); // 5 dealt, no draw yet
    assert.equal(game.players[first].deck.length, 35);
  }
});

test("opponent's first Draw Phase takes them to 6", () => {
  const game = start({ startingPlayer: 0 });
  applyAction(game, { type: "endTurn", player: 0 });
  assert.equal(game.activePlayer, 1);
  assert.equal(game.players[1].hand.length, 6);
  assert.equal(game.turn, 1); // still turn 1 until the starting player goes again
  applyAction(game, { type: "endTurn", player: 1 });
  assert.equal(game.turn, 2);
  assert.equal(game.players[0].hand.length, 6);
});

test("coin flip follows the seed and both outcomes happen", () => {
  assert.equal(start().startingPlayer, start().startingPlayer);
  const winners = new Set(Array.from({ length: 20 }, (_, s) => newGame({ seed: s, decks: [deck("a"), deck("b")] }).startingPlayer));
  assert.deepEqual([...winners].sort(), [0, 1]);
});

test("each player has a 3x3 grid, 4 Special Deck Zones, a Field Effect Zone and a Formation Zone", () => {
  const p = start().players[0];
  assert.equal(p.ups.length, 9);
  assert.equal(p.specialZones.length, 4);
  assert.equal(p.fieldEffect, null);
  assert.equal(p.formationZone, null);
});

test("a player who can't draw in their Draw Phase loses (placeholder)", () => {
  const game = newGame({ seed: 1, decks: [deck("a", 4), deck("b", 5)], startingPlayer: 0 });
  assert.equal(game.players[0].hand.length, 4);
  assert.equal(game.winner, 1);
  assert.equal(game.phase, "over");
});

test("illegal actions are refused with a reason", () => {
  const game = start({ startingPlayer: 0 });
  assert.equal(applyAction(game, { type: "endTurn", player: 1 }).ok, false);
  assert.equal(applyAction(game, { type: "fly" }).ok, false);
});

test("legal actions are all accepted", () => {
  for (const action of legalActions(start())) {
    assert.equal(applyAction(start(), action).ok, true);
  }
});

test("Energy: 1 on your first turn, +1 each of your turns, capped at 10", () => {
  const game = start({ startingPlayer: 0 });
  const [me, them] = game.players;
  assert.equal(me.maxEnergy, 1);
  assert.equal(me.energy, 1);
  assert.equal(them.maxEnergy, 0); // hasn't had a turn yet
  applyAction(game, { type: "endTurn", player: 0 });
  assert.equal(them.maxEnergy, 1);
  assert.equal(me.maxEnergy, 1); // only grows on your own turn
  for (let i = 0; i < 30; i++) applyAction(game, { type: "endTurn", player: game.activePlayer });
  assert.equal(me.maxEnergy, 10);
  assert.equal(them.maxEnergy, 10);
});

test("spent Energy refills to max at the start of your turn", () => {
  const game = start({ startingPlayer: 0 });
  const me = game.players[0];
  applyAction(game, { type: "endTurn", player: 0 });
  applyAction(game, { type: "endTurn", player: 1 }); // my turn 2: 2 / 2
  assert.equal(spendEnergy(me, 3), false);
  assert.equal(spendEnergy(me, 2), true);
  assert.equal(me.energy, 0);
  applyAction(game, { type: "endTurn", player: 0 });
  applyAction(game, { type: "endTurn", player: 1 }); // my turn 3: 3 / 3
  assert.equal(me.energy, 3);
  assert.equal(me.maxEnergy, 3);
});

test("both players start with 1000 Defense", () => {
  for (const p of start().players) assert.equal(p.defense, 1000);
});
