// Fire Arrow (RULES.md d751b3f): cast from hand in Preparation Phase I or II, or set face-down and
// activated on your own turn, including the turn it was set (Dyllan, 9 Oct).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, checkAction, legalActions, readySetSpells } from "../src/engine/engine.js";
import { chooseAction } from "../src/engine/bot.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
let n = 0;
const copy = (id) => ({ ...byId[id], cardId: id, id: `${id}#${++n}` });
const filler = () => Array.from({ length: 30 }, () => copy("ARM-010"));
const ok = (game, action) => assert.equal(applyAction(game, action).reason, undefined);
function start() {
  const game = newGame({ seed: 9, decks: [filler(), filler()], startingPlayer: 0 });
  game.players.forEach((p) => (p.energy = 10));
  return game;
}

test("Fire Arrow cast from hand deals 1 Damage Counter and goes to the Grave", () => {
  const game = start();
  const [me, them] = game.players;
  const arrow = copy("SPL-001");
  me.hand.push(arrow);
  ok(game, { type: "cast", player: 0, card: arrow.id });
  assert.equal(them.damage, 1);
  assert.equal(me.energy, 9);
  assert.equal(me.graveyard.at(-1).name, "Fire Arrow");
  assert.match(game.log.at(-1), /1 Damage Counter/);
  const other = copy("SPL-001");
  me.hand.push(other, copy("MAG-002"));
  game.phase = "battle";
  assert.match(checkAction(game, { type: "cast", player: 0, card: other.id }), /Preparation Phase/);
  game.phase = "prep2";
  assert.match(checkAction(game, { type: "cast", player: 0, card: me.hand.length - 1 }), /doesn't do anything yet/);
});

test("a set Fire Arrow can fire the turn it's set, and the End Phase waits while it's ready", () => {
  const game = start();
  const [me, them] = game.players;
  const arrow = copy("SPL-001");
  me.hand.push(arrow);
  game.phase = "prep2";
  ok(game, { type: "setTrap", player: 0, card: arrow.id, slot: 6 });
  assert.equal(checkAction(game, { type: "activateSet", player: 0, slot: 6 }), null);
  assert.deepEqual(readySetSpells(game, 0), [6]);
  ok(game, { type: "nextPhase", player: 0 });
  assert.equal(game.phase, "end"); // waits, because the Arrow is ready
  ok(game, { type: "activateSet", player: 0, slot: 6 });
  assert.equal(them.damage, 1);
  assert.equal(game.activePlayer, 1); // nothing left, so the turn moves on
});

test("a set Fire Arrow kept for later fires in your own phases; the Start Phase waits for it", () => {
  const game = start();
  const [me, them] = game.players;
  me.ups[6] = { ...copy("SPL-001"), faceDown: true, setTurn: 0 };
  ok(game, { type: "endTurn", player: 0 });
  assert.equal(game.activePlayer, 1);
  assert.match(checkAction(game, { type: "activateSet", player: 1, slot: 6 }), /no set card/); // not on their turn
  ok(game, { type: "endTurn", player: 1 });
  // Player 0's Start Phase stops, because the Arrow is ready.
  assert.equal(game.phase, "start");
  assert.deepEqual(readySetSpells(game, 0), [6]);
  assert.ok(legalActions(game).some((a) => a.type === "activateSet" && a.slot === 6));
  ok(game, { type: "activateSet", player: 0, slot: 6 });
  assert.equal(them.damage, 1);
  assert.equal(me.ups[6], null);
  assert.equal(me.graveyard.at(-1).setTurn, undefined);
  assert.equal(game.phase, "prep1"); // nothing left, so the turn moves on
});

test("the computer casts Fire Arrow and fires set ones", () => {
  const game = start();
  const me = game.players[0];
  me.hand = [copy("SPL-001")];
  me.formationZone = copy("FRM-001");
  assert.deepEqual(chooseAction(game), { type: "cast", player: 0, card: 0 });
  me.ups[7] = { ...copy("SPL-001"), faceDown: true, setTurn: 0 };
  assert.deepEqual(chooseAction(game), { type: "activateSet", player: 0, slot: 7 });
});
