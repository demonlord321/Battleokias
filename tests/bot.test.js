// The computer player: always legal, finishes games, answers choices, and plays fair.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, checkAction } from "../src/engine/engine.js";
import { chooseAction, playerView, actingPlayer } from "../src/engine/bot.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const decks = JSON.parse(readFileSync(new URL("../data/decks.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const build = (ids) => ids.map((id, i) => ({ ...byId[id], cardId: id, id: `${id}#${i}` }));
const arms = () => build(decks.martial);
const special = () => [{ type: "equipment", cards: build(["EQP-001", "EQP-001", "EQP-001"]) }, null, null, null];

test("the computer plays whole games against itself with only legal moves", () => {
  for (let seed = 0; seed < 30; seed++) {
    const game = newGame({ seed, decks: [arms(), arms()], specialDecks: [special(), special()] });
    let steps = 0;
    while (game.winner === null && steps++ < 3000) {
      const action = chooseAction(game);
      assert.equal(checkAction(game, action), null, `seed ${seed}: ${JSON.stringify(action)}`);
      applyAction(game, action);
    }
    assert.notEqual(game.winner, null, `seed ${seed} didn't finish`);
  }
});

test("it only acts for the player who has to act", () => {
  const game = newGame({ seed: 3, decks: [arms(), arms()], startingPlayer: 0 });
  assert.equal(chooseAction(game, 1), null);
  assert.ok(chooseAction(game, 0));
  game.pending = { type: "chooseLoss", player: 1, owner: 0, slots: [0, 2] };
  game.players[0].ups[0] = { ...byId["ARM-010"], id: "x" };
  game.players[0].ups[2] = { ...byId["ARM-010"], id: "y", attack: byId["ARM-010"].attack + 500 };
  assert.equal(actingPlayer(game), 1);
  // The attacker takes out the stronger of the tied units.
  assert.deepEqual(chooseAction(game, 1), { type: "chooseLoss", player: 1, slot: 2 });
});

test("its view hides the opponent's hand, both decks' order and every Special Deck", () => {
  const game = newGame({ seed: 4, decks: [arms(), arms()], specialDecks: [special(), special()], startingPlayer: 0 });
  const view = playerView(game, 1);
  assert.equal(view.players[0].hand.length, game.players[0].hand.length);
  assert.ok(view.players[0].hand.every((c) => c.hidden));
  assert.ok(view.players[0].deck.every((c) => c.hidden));
  assert.ok(view.players[1].specialDecks[0].cards.every((c) => c.hidden));
  assert.deepEqual(view.players[1].hand, game.players[1].hand);
  assert.equal(view.rng, undefined);
  const ids = view.players[1].deck.map((c) => c.id);
  assert.deepEqual(ids, [...ids].sort());
  assert.ok(game.players[0].hand.every((c) => !c.hidden)); // the real game is untouched
});
