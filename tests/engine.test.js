// Run with: npm test   (or: node --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRng, shuffle } from "../src/engine/rng.js";
import { newGame, applyAction, legalActions } from "../src/engine/engine.js";

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

test("each player has a 3x3 grid, 4 Special Deck Zones and a Field Effect Zone", () => {
  const p = start().players[0];
  assert.equal(p.ups.length, 9);
  assert.equal(p.specialZones.length, 4);
  assert.equal(p.fieldEffect, null);
});

test("drawing from an empty pile doesn't crash", () => {
  const game = newGame({ seed: 1, decks: [deck("a", 4), deck("b", 5)], startingPlayer: 0 });
  assert.equal(game.players[0].hand.length, 4);
  assert.match(game.log.at(-1), /no cards left/);
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
