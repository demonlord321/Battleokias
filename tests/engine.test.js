// Run with: npm test   (or: node --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRng, shuffle } from "../src/engine/rng.js";
import { newGame, applyAction, legalActions } from "../src/engine/engine.js";

test("same seed gives the same shuffle", () => {
  const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.deepEqual(shuffle(cards, createRng(42)), shuffle(cards, createRng(42)));
  assert.notDeepEqual(shuffle(cards, createRng(42)), shuffle(cards, createRng(7)));
});

test("ending the turn passes play to the other player", () => {
  const game = newGame({ seed: 1, decks: [[], []] });
  assert.equal(game.activePlayer, 0);
  assert.deepEqual(applyAction(game, { type: "endTurn", player: 0 }), { ok: true });
  assert.equal(game.activePlayer, 1);
  applyAction(game, { type: "endTurn", player: 1 });
  assert.equal(game.turn, 2);
});

test("illegal actions are refused with a reason", () => {
  const game = newGame({ seed: 1, decks: [[], []] });
  assert.equal(applyAction(game, { type: "endTurn", player: 1 }).ok, false);
  assert.equal(applyAction(game, { type: "fly" }).ok, false);
});

test("legal actions are all accepted", () => {
  const game = newGame({ seed: 1, decks: [[], []] });
  for (const action of legalActions(game)) {
    assert.equal(applyAction(newGame({ seed: 1, decks: [[], []] }), action).ok, true);
  }
});
