// Special Decks and Preparation Phase II (RULES.md): four Special Decks, and at the
// start of Phase II you pick one and draw its top card.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, legalActions, unitStats } from "../src/engine/engine.js";

let n = 0;
const unit = () => ({ id: `U-${++n}`, name: `Unit${n}`, type: "unit", signets: ["arms"], grade: 1, attack: 500, defense: 500 });
const gear = () => ({ id: `EQP-001#${++n}`, cardId: "EQP-001", name: "Practice Gear", type: "equipment", signets: ["arms"], cost: 1, boost: { attack: 250, defense: 250 } });
const deckOf = () => Array.from({ length: 30 }, unit);
const specials = () => [{ type: "equipment", cards: Array.from({ length: 5 }, gear) }, null, { type: "spell", cards: [] }, null];

function start() {
  return newGame({ seed: 7, decks: [deckOf(), deckOf()], specialDecks: [specials(), specials()], startingPlayer: 0 });
}
const next = (game) => applyAction(game, { type: "nextPhase", player: game.activePlayer });

test("each player gets four Special Deck slots, shuffled, with empty ones as null", () => {
  const game = start();
  const p = game.players[0];
  assert.equal(p.specialDecks.length, 4);
  assert.equal(p.specialDecks[0].type, "equipment");
  assert.equal(p.specialDecks[0].cards.length, 5);
  assert.equal(p.specialDecks[1], null);
  assert.equal(p.specialDecks[3], null);
  assert.equal(newGame({ seed: 1, decks: [deckOf(), deckOf()] }).players[0].specialDecks.every((d) => d === null), true);
});

test("the player going first skips the Special draw on turn 1 (placeholder)", () => {
  const game = start();
  next(game);
  assert.equal(game.phase, "prep2");
  assert.equal(game.pending, null);
});

test("Phase II starts with a Special draw you must make, from a deck that still has cards", () => {
  const game = start();
  next(game);
  next(game);
  next(game); // player 2's turn 1
  assert.equal(game.activePlayer, 1);
  const p = game.players[1];
  const hand = p.hand.length;
  next(game);
  assert.equal(game.phase, "prep2");
  assert.deepEqual(game.pending, { type: "specialDraw", player: 1, decks: [0] });
  assert.deepEqual(legalActions(game), [{ type: "specialDraw", player: 1, deck: 0 }]);
  assert.match(checkAction(game, { type: "nextPhase", player: 1 }), /pick a Special Deck/);
  assert.match(checkAction(game, { type: "specialDraw", player: 1, deck: 2 }), /still has cards/);
  const top = p.specialDecks[0].cards.at(-1);
  assert.equal(applyAction(game, { type: "specialDraw", player: 1, deck: 0 }).ok, true);
  assert.equal(game.pending, null);
  assert.equal(p.hand.length, hand + 1);
  assert.equal(p.hand.at(-1), top);
  assert.equal(p.specialDecks[0].cards.length, 4);
  assert.match(checkAction(game, { type: "specialDraw", player: 1, deck: 0 }), /start of Preparation Phase II/);
});

test("Gear drawn in Phase II can be equipped right away, before the battle", () => {
  const game = start();
  next(game);
  next(game);
  next(game);
  const p = game.players[1];
  p.ups[0] = unit();
  next(game);
  applyAction(game, { type: "specialDraw", player: 1, deck: 0 });
  assert.equal(applyAction(game, { type: "equip", player: 1, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.deepEqual(unitStats(game, 1, 0), { attack: 750, defense: 750 });
  assert.match(checkAction(game, { type: "summon", player: 1, card: 0, slot: 1 }), /Preparation Phase I/);
});

test("no Special draw when every Special Deck is empty", () => {
  const game = newGame({ seed: 7, decks: [deckOf(), deckOf()], specialDecks: [[], [{ type: "spell", cards: [] }]], startingPlayer: 0 });
  next(game);
  next(game);
  next(game);
  next(game);
  assert.equal(game.phase, "prep2");
  assert.equal(game.pending, null);
});
