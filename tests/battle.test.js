// Summoning, phases and attacks (RULES.md placeholder rules for the Arms test game).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, legalActions, targetSlot } from "../src/engine/engine.js";

// A unit with the given Grade, attack and defense. Every copy gets its own instance id.
let n = 0;
const unit = (grade, attack, defense) => ({ id: `U-${++n}`, cardId: "U", name: `Unit${n}`, type: "unit", grade, attack, defense });
const deckOf = (make, size = 30) => Array.from({ length: size }, make);

// Player 0 starts. Both decks hold only Grade 1 100/100 units unless given others.
function start(decks) {
  return newGame({ seed: 7, decks: decks ?? [deckOf(() => unit(1, 100, 100)), deckOf(() => unit(1, 100, 100))], startingPlayer: 0 });
}
const act = (game, a) => applyAction(game, { player: game.activePlayer, ...a });
// Puts a unit straight onto a slot, ready to attack (skips summoning for setup).
function place(game, who, slot, u) {
  game.players[who].ups[slot] = { ...u, summonedThisTurn: false, hasAttacked: false };
}

test("summon pays Energy and moves the card from hand to the slot", () => {
  const game = start();
  const me = game.players[0];
  const card = me.hand[0];
  assert.deepEqual(act(game, { type: "summon", card: 0, slot: 4 }), { ok: true });
  assert.equal(me.ups[4].id, card.id);
  assert.equal(me.hand.length, 4);
  assert.equal(me.energy, 0);
});

test("summon also accepts the card's instance id", () => {
  const game = start();
  const id = game.players[0].hand[2].id;
  assert.equal(act(game, { type: "summon", card: id, slot: 0 }).ok, true);
  assert.equal(game.players[0].ups[0].id, id);
});

test("summon is refused with a reason when it isn't allowed", () => {
  const game = start([deckOf(() => unit(3, 100, 100)), deckOf(() => unit(1, 100, 100))]);
  assert.match(checkAction(game, { type: "summon", player: 0, card: 0, slot: 0 }), /costs 3 Energy and you have 1/);
  assert.match(checkAction(game, { type: "summon", player: 0, card: 99, slot: 0 }), /isn't in your hand/);
  assert.match(checkAction(game, { type: "summon", player: 0, card: 0, slot: 9 }), /Unit Position Slots/);
  game.players[0].hand.push({ id: "S#1", name: "Bolt", type: "spell", cost: 0 });
  assert.match(checkAction(game, { type: "summon", player: 0, card: "S#1", slot: 0 }), /Only units/);
  place(game, 0, 0, unit(1, 1, 1));
  game.players[0].hand.push(unit(0, 1, 1));
  assert.match(checkAction(game, { type: "summon", player: 0, card: game.players[0].hand.length - 1, slot: 0 }), /taken/);
  act(game, { type: "nextPhase" });
  assert.match(checkAction(game, { type: "summon", player: 0, card: 0, slot: 1 }), /Preparation Phase I/);
});

test("nextPhase goes Preparation Phase I, then Battle, then the other player's turn", () => {
  const game = start();
  assert.equal(game.phase, "prep1");
  act(game, { type: "nextPhase" });
  assert.equal(game.phase, "battle");
  act(game, { type: "nextPhase" });
  assert.equal(game.activePlayer, 1);
  assert.equal(game.phase, "prep1");
});

test("a unit can't attack the turn it's summoned, or twice in a turn", () => {
  const game = start();
  act(game, { type: "summon", card: 0, slot: 1 });
  assert.match(checkAction(game, { type: "attack", player: 0, slot: 1 }), /Battle Phase/);
  act(game, { type: "nextPhase" });
  assert.match(checkAction(game, { type: "attack", player: 0, slot: 1 }), /summoned this turn/);
  act(game, { type: "endTurn" });
  act(game, { type: "endTurn" }); // back to player 0
  act(game, { type: "nextPhase" });
  assert.equal(act(game, { type: "attack", slot: 1 }).ok, true);
  assert.match(checkAction(game, { type: "attack", player: 0, slot: 1 }), /already attacked/);
});

test("my column c faces the opponent's column 2 - c, front row first", () => {
  const game = start();
  place(game, 1, 6, unit(1, 1, 1)); // their back row, their column 0
  assert.equal(targetSlot(game, 0, 2), 6); // my column 2 faces their column 0
  assert.equal(targetSlot(game, 0, 0), null); // my column 0 faces their empty column 2
  place(game, 1, 3, unit(1, 1, 1)); // their middle row, same column
  assert.equal(targetSlot(game, 0, 8), 3); // nearer unit is hit first
});

test("attack beats Defense: the target goes to the Grave; otherwise nothing happens", () => {
  const game = start();
  place(game, 0, 0, unit(1, 200, 100));
  place(game, 0, 1, unit(1, 100, 100));
  place(game, 1, 2, unit(1, 50, 150)); // faces my column 0
  place(game, 1, 1, unit(1, 50, 100)); // faces my column 1
  act(game, { type: "nextPhase" });
  act(game, { type: "attack", slot: 1 }); // 100 vs 100: not greater, bounces
  assert.ok(game.players[1].ups[1]);
  act(game, { type: "attack", slot: 0 }); // 200 vs 150: destroyed
  assert.equal(game.players[1].ups[2], null);
  assert.equal(game.players[1].graveyard.length, 1);
  assert.equal(game.players[1].defense, 1000);
});

test("an empty column means the attack hits Defense, and 0 Defense wins", () => {
  const game = start();
  place(game, 0, 0, unit(1, 600, 100));
  place(game, 0, 3, unit(1, 400, 100));
  act(game, { type: "nextPhase" });
  act(game, { type: "attack", slot: 0 });
  assert.equal(game.players[1].defense, 400);
  assert.equal(game.winner, null);
  act(game, { type: "attack", slot: 3 });
  assert.equal(game.winner, 0);
  assert.equal(game.phase, "over");
  assert.match(checkAction(game, { type: "endTurn", player: 0 }), /over/);
});

test("random legal play always finishes with a winner", () => {
  for (let seed = 0; seed < 20; seed++) {
    const make = () => unit(1 + (n % 6), 100 + 50 * (n % 7), 50 + 50 * (n % 5));
    const game = newGame({ seed, decks: [deckOf(make), deckOf(make)] });
    for (let step = 0; step < 5000 && game.winner === null; step++) {
      const options = legalActions(game);
      // Prefer summons and attacks so games move along; end the turn otherwise.
      const busy = options.filter((a) => a.type === "summon" || a.type === "attack");
      const pick = busy.length ? busy[Math.floor(game.rng() * busy.length)] : options.find((a) => a.type === "nextPhase");
      assert.equal(applyAction(game, pick).ok, true);
    }
    assert.notEqual(game.winner, null);
  }
});
