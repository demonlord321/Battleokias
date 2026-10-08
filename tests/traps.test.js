// Stand Strong (RULES.md f190daa), the first Trap: set face-down in an empty Unit Position Slot in
// Preparation Phase I or II; on the opponent's attack it goes to the Grave instead of the unit
// that would be destroyed. Placeholders: the Damage Counters still count, and a Trap in a
// Formation slot leaves that Formation inactive.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, checkAction, legalActions, formationStats, playerGrade } from "../src/engine/engine.js";
import { chooseAction, playerView } from "../src/engine/bot.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
let n = 0;
const copy = (id) => ({ ...byId[id], cardId: id, id: `${id}#${++n}` });
const filler = () => Array.from({ length: 30 }, () => copy("ARM-010"));
const ok = (game, action) => assert.equal(applyAction(game, action).reason, undefined);

function start() {
  const game = newGame({ seed: 5, decks: [filler(), filler()], startingPlayer: 0 });
  game.players.forEach((p) => (p.energy = 10));
  return game;
}

// Player 1 has Frontal Assault with a Student and two Apprentices, a set Stand Strong in slot 4, and it's player 0's
// Battle Phase with Graduates in Frontal Assault, so the hit lands.
function attackReady() {
  const game = start();
  const [me, them] = game.players;
  me.formationZone = copy("FRM-001");
  them.formationZone = copy("FRM-001");
  // Their lowest Grade is the one Student in slot 0, so it's the only target.
  [0, 1, 2].forEach((s) => (me.ups[s] = copy("ARM-012")));
  them.ups[0] = copy("ARM-010");
  them.ups[1] = copy("ARM-011");
  them.ups[2] = copy("ARM-011");
  them.ups[4] = { ...copy("TRP-001"), faceDown: true };
  game.phase = "battle";
  return game;
}

test("Stand Strong is set face-down in an empty slot in either Preparation Phase, paying its cost", () => {
  const game = start();
  const p = game.players[0];
  const trap = copy("TRP-001");
  p.hand.push(trap);
  ok(game, { type: "setTrap", player: 0, card: trap.id, slot: 4 });
  assert.equal(p.ups[4].faceDown, true);
  assert.equal(p.ups[4].name, "Stand Strong");
  assert.equal(p.energy, 9);
  assert.match(game.log.at(-1), /sets a card face-down/);
  p.hand.push(copy("ARM-010"));
  assert.match(checkAction(game, { type: "summon", player: 0, card: p.hand.length - 1, slot: 4 }), /taken/);
  // It isn't a unit: no promoting, equipping, retiring, moving it, and it doesn't count for Player Grade.
  assert.match(checkAction(game, { type: "retire", player: 0, slot: 4 }), /no unit there/);
  assert.match(checkAction(game, { type: "move", player: 0, from: 4, to: 5 }), /no unit there/);
  assert.equal(playerGrade(game, 0), 0);
  const other = copy("TRP-001");
  p.hand.push(other);
  game.phase = "battle";
  assert.match(checkAction(game, { type: "setTrap", player: 0, card: other.id, slot: 5 }), /Preparation Phase/);
});

test("Spells are set face-down in a slot too, but Field Spells aren't", () => {
  const game = start();
  const p = game.players[0];
  const spell = copy("MAG-002");
  const field = copy("FLD-001");
  const unit = copy("ARM-010");
  p.hand.push(spell, field, unit);
  assert.match(checkAction(game, { type: "setTrap", player: 0, card: field.id, slot: 3 }), /Only Traps and Spells/);
  assert.match(checkAction(game, { type: "setTrap", player: 0, card: unit.id, slot: 3 }), /Only Traps and Spells/);
  ok(game, { type: "setTrap", player: 0, card: spell.id, slot: 3 });
  assert.equal(p.ups[3].faceDown, true);
  assert.equal(p.ups[3].name, "Arcane Bolt");
});

test("a Trap in a Formation slot leaves the Formation inactive", () => {
  const game = start();
  const p = game.players[0];
  p.formationZone = copy("FRM-001");
  p.ups[0] = copy("ARM-010");
  p.ups[1] = copy("ARM-010");
  p.ups[2] = { ...copy("TRP-001"), faceDown: true };
  assert.equal(formationStats(game, 0).complete, false);
  assert.equal(formationStats(game, 0).missing, 1);
});

test("on a landed hit the defender may respond; Stand Strong goes to the Grave instead of the unit", () => {
  const game = attackReady();
  const them = game.players[1];
  ok(game, { type: "attack", player: 0 });
  assert.deepEqual(game.pending, { type: "trapResponse", player: 1, slots: [4], targets: [0] });
  assert.equal(them.damage, 1); // the counters still land
  assert.match(checkAction(game, { type: "nextPhase", player: 0 }), /decide whether to respond/);
  assert.deepEqual(legalActions(game), [
    { type: "trapResponse", player: 1, slot: 4 },
    { type: "trapResponse", player: 1, slot: null },
  ]);
  ok(game, { type: "trapResponse", player: 1, slot: 4 });
  assert.equal(them.ups[0].name, "Student of Arms");
  assert.equal(them.ups[4], null);
  assert.equal(them.graveyard.at(-1).name, "Stand Strong");
  assert.equal(them.graveyard.at(-1).faceDown, undefined);
  assert.match(game.log.at(-1), /Student of Arms is saved/);
});

test("passing lets the unit be destroyed as usual", () => {
  const game = attackReady();
  const them = game.players[1];
  ok(game, { type: "attack", player: 0 });
  ok(game, { type: "trapResponse", player: 1, slot: null });
  assert.equal(them.ups[0], null);
  assert.equal(them.ups[4].faceDown, true); // still set for later
});

test("with tied targets, passing goes on to the attacker's choice", () => {
  const game = attackReady();
  const them = game.players[1];
  them.ups[1] = copy("ARM-010");
  ok(game, { type: "attack", player: 0 });
  assert.deepEqual(game.pending.targets, [0, 1]);
  ok(game, { type: "trapResponse", player: 1, slot: null });
  assert.deepEqual(game.pending, { type: "chooseLoss", player: 0, owner: 1, slots: [0, 1] });
});

test("the computer hides the opponent's set cards and always uses its Trap", () => {
  const game = attackReady();
  const view = playerView(game, 0);
  assert.deepEqual({ ...view.players[1].ups[4] }, { hidden: true, faceDown: true });
  ok(game, { type: "attack", player: 0 });
  assert.deepEqual(chooseAction(game), { type: "trapResponse", player: 1, slot: 4 });
});
