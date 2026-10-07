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

// Promotion (RULES.md): exactly one Grade up, costs the difference, one per turn.
function promoteSetup() {
  const game = start();
  const me = game.players[0];
  place(game, 0, 4, unit(1, 100, 100));
  place(game, 0, 5, unit(1, 100, 100));
  me.hand.push(unit(2, 200, 200), unit(2, 200, 200), unit(3, 300, 300));
  me.energy = me.maxEnergy = 5;
  return { game, me, g2: me.hand.length - 3, g3: me.hand.length - 1 };
}

test("promote: a Grade 2 on a Grade 1 costs 1 Energy and stacks the old unit under it", () => {
  const { game, me, g2 } = promoteSetup();
  const base = me.ups[4];
  const card = me.hand[g2];
  assert.equal(act(game, { type: "promote", card: g2, slot: 4 }).ok, true);
  assert.equal(me.energy, 4);
  assert.equal(me.ups[4].id, card.id);
  assert.deepEqual(me.ups[4].under.map((c) => c.id), [base.id]);
  assert.equal(me.ups[4].under[0].summonedThisTurn, undefined); // just the card, no field flags
});

test("promote: exactly one Grade up, one per turn, only in Preparation Phase I", () => {
  const { game, g2, g3 } = promoteSetup();
  assert.match(checkAction(game, { type: "promote", player: 0, card: g3, slot: 4 }), /only promote a Grade 2/);
  assert.match(checkAction(game, { type: "promote", player: 0, card: g2, slot: 0 }), /no unit there/);
  act(game, { type: "promote", card: g2, slot: 4 });
  assert.match(checkAction(game, { type: "promote", player: 0, card: g2, slot: 5 }), /already promoted this turn/);
  assert.equal(checkAction(game, { type: "promote", player: 0, card: g2 + 1, slot: 4 }), "You've already promoted this turn.");
  act(game, { type: "nextPhase" });
  assert.match(checkAction(game, { type: "promote", player: 0, card: g2, slot: 5 }), /Preparation Phase I/);
});

test("promote: the count resets next turn, and a Grade 3 can then promote the Grade 2", () => {
  const { game, me, g2 } = promoteSetup();
  act(game, { type: "promote", card: g2, slot: 4 });
  act(game, { type: "endTurn" });
  act(game, { type: "endTurn" });
  const g3 = me.hand.findIndex((c) => c.grade === 3);
  assert.equal(act(game, { type: "promote", card: g3, slot: 4 }).ok, true);
  assert.equal(me.ups[4].under.length, 2);
});

test("a promoted unit can attack if the unit beneath was already on the field, but not if it was just summoned", () => {
  const { game, me, g2 } = promoteSetup();
  act(game, { type: "promote", card: g2, slot: 4 }); // slot 4 was already there
  act(game, { type: "endTurn" });
  act(game, { type: "endTurn" });
  me.energy = 5;
  me.hand.push(unit(1, 100, 100), unit(2, 200, 200));
  act(game, { type: "summon", card: me.hand.length - 2, slot: 0 });
  act(game, { type: "promote", card: me.hand.length - 1, slot: 0 });
  act(game, { type: "nextPhase" });
  assert.match(checkAction(game, { type: "attack", player: 0, slot: 0 }), /summoned this turn/);
  assert.equal(checkAction(game, { type: "attack", player: 0, slot: 4 }), null);
});

test("a destroyed promoted unit takes its whole stack to the Grave", () => {
  const { game, g2 } = promoteSetup();
  act(game, { type: "promote", card: g2, slot: 4 });
  act(game, { type: "endTurn" });
  place(game, 1, 4, unit(1, 999, 100)); // their middle column faces my middle column
  act(game, { type: "nextPhase" });
  act(game, { type: "attack", slot: 4 });
  const grave = game.players[0].graveyard;
  assert.equal(grave.length, 2);
  assert.ok(grave.every((c) => c.under === undefined));
  assert.equal(game.players[0].ups[4], null);
});
