// Summoning, phases and promotion (RULES.md). Formation attacks are in formation.test.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, destroyUnit } from "../src/engine/engine.js";

// A unit with the given Grade, attack and defense. Every copy gets its own instance id.
let n = 0;
const unit = (grade, attack, defense, signets = ["martial"]) => ({ id: `U-${++n}`, cardId: "U", name: `Unit${n}`, type: "unit", signets, grade, attack, defense });
const deckOf = (make, size = 30) => Array.from({ length: size }, make);

// Player 0 starts. Both decks hold only Grade 1 100/100 units unless given others.
function start(decks) {
  return newGame({ seed: 7, decks: decks ?? [deckOf(() => unit(1, 100, 100)), deckOf(() => unit(1, 100, 100))], startingPlayer: 0 });
}
const act = (game, a) => applyAction(game, { player: game.activePlayer, ...a });
// Puts a unit straight onto a slot (skips summoning for setup).
function place(game, who, slot, u) {
  game.players[who].ups[slot] = { ...u };
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
  assert.match(checkAction(game, { type: "summon", player: 0, card: 0, slot: 0 }), /Player Grade is 0, so you can only bring out units up to Grade 1/);
  place(game, 0, 4, unit(2, 1, 1));
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

test("nextPhase goes Preparation Phase I, Battle, Preparation Phase II, End, then the other player's turn", () => {
  const game = start();
  assert.equal(game.phase, "prep1");
  act(game, { type: "nextPhase" });
  assert.equal(game.phase, "battle");
  act(game, { type: "nextPhase" });
  assert.equal(game.phase, "prep2");
  act(game, { type: "nextPhase" }); // the End Phase passes on its own while there's nothing set to activate
  assert.equal(game.activePlayer, 1);
  assert.equal(game.phase, "prep1");
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

test("promote: only the next unit in the same promotion line (first Signet; promotesFrom when a card names it)", () => {
  const game = start();
  const me = game.players[0];
  me.energy = me.maxEnergy = 5;
  place(game, 0, 0, { ...unit(1, 100, 100), cardId: "ARM-001" }); // an Arms Grade 1 that isn't a Student
  place(game, 0, 1, { ...unit(1, 100, 100), cardId: "ARM-010" }); // Student of Arms
  place(game, 0, 2, unit(1, 100, 100, ["alchemy", "martial"])); // Arms only as a sub-Signet
  me.hand.push({ ...unit(2, 200, 200), cardId: "ARM-011", name: "Apprentice of Arms", promotesFrom: ["ARM-010"] });
  const apprentice = me.hand.length - 1;
  assert.match(checkAction(game, { type: "promote", player: 0, card: apprentice, slot: 0 }), /isn't next in .* promotion line/);
  assert.match(checkAction(game, { type: "promote", player: 0, card: apprentice, slot: 2 }), /promotion line/);
  assert.equal(checkAction(game, { type: "promote", player: 0, card: apprentice, slot: 1 }), null);
  me.hand.push(unit(2, 200, 200, ["martial", "alchemy"])); // no promotesFrom: any Arms-line Grade 1
  assert.equal(checkAction(game, { type: "promote", player: 0, card: me.hand.length - 1, slot: 0 }), null);
  assert.match(checkAction(game, { type: "promote", player: 0, card: me.hand.length - 1, slot: 2 }), /promotion line/);
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

test("a destroyed promoted unit takes its whole stack to the Grave", () => {
  const { game, g2 } = promoteSetup();
  act(game, { type: "promote", card: g2, slot: 4 });
  destroyUnit(game, 0, 4);
  const grave = game.players[0].graveyard;
  assert.equal(grave.length, 2);
  assert.ok(grave.every((c) => c.under === undefined));
  assert.equal(game.players[0].ups[4], null);
});

// Moving and retiring (RULES.md): free during Preparation Phase I.
test("move a unit to an empty slot, or swap it with another unit", () => {
  const game = start();
  const me = game.players[0];
  const a = unit(1, 100, 100);
  const b = unit(2, 200, 200);
  place(game, 0, 0, a);
  place(game, 0, 4, b);
  assert.equal(act(game, { type: "move", from: 0, to: 2 }).ok, true);
  assert.equal(me.ups[0], null);
  assert.equal(me.ups[2].id, a.id);
  assert.equal(act(game, { type: "move", from: 2, to: 4 }).ok, true);
  assert.equal(me.ups[4].id, a.id);
  assert.equal(me.ups[2].id, b.id);
  assert.equal(me.energy, 1); // free
});

test("move is refused with a reason when it isn't allowed", () => {
  const game = start();
  place(game, 0, 0, unit(1, 100, 100));
  assert.match(checkAction(game, { type: "move", player: 0, from: 1, to: 2 }), /no unit there/);
  assert.match(checkAction(game, { type: "move", player: 0, from: 0, to: 9 }), /Unit Position Slots/);
  assert.match(checkAction(game, { type: "move", player: 0, from: 0, to: 0 }), /already there/);
  act(game, { type: "nextPhase" });
  assert.match(checkAction(game, { type: "move", player: 0, from: 0, to: 1 }), /Preparation Phase I/);
});

test("retire sends a unit and its stack to the Grave and frees the slot", () => {
  const { game, me, g2 } = promoteSetup();
  act(game, { type: "promote", card: g2, slot: 4 });
  assert.equal(act(game, { type: "retire", slot: 4 }).ok, true);
  assert.equal(me.ups[4], null);
  assert.equal(me.graveyard.length, 2);
  assert.match(game.log.at(-1), /retires/);
  assert.match(checkAction(game, { type: "retire", player: 0, slot: 4 }), /no unit there/);
  act(game, { type: "nextPhase" });
  assert.match(checkAction(game, { type: "retire", player: 0, slot: 5 }), /Preparation Phase I/);
});
