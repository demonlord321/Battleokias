// Blinding Beacon (RULES.md d6e060a), the first Artifact. Placeholders (Planner): the unit shares
// a Signet and has to be in the attacking Formation; cooldown 2 means used on turn 3, ready on turn 5;
// a blinded Formation counts as no Formation, so the hit lands for 1 counter and destroys nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, checkAction, legalActions, formationStats, attackPreview, destroyUnit } from "../src/engine/engine.js";
import { chooseAction } from "../src/engine/bot.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
let n = 0;
const copy = (id) => ({ ...byId[id], cardId: id, id: `${id}#${++n}` });
const filler = () => Array.from({ length: 30 }, () => copy("ARM-010"));
const ok = (game, action) => assert.equal(applyAction(game, action).reason, undefined);

// Player 0: Frontal Assault with Students (too weak to get through). Player 1: Frontal Assault with Graduates.
function board() {
  const game = newGame({ seed: 3, decks: [filler(), filler()], startingPlayer: 0 });
  game.players.forEach((p) => (p.energy = 10));
  const [me, them] = game.players;
  me.formationZone = copy("FRM-001");
  them.formationZone = copy("FRM-001");
  [0, 1, 2].forEach((s) => { me.ups[s] = copy("ARM-010"); them.ups[s] = copy("ARM-012"); });
  return game;
}
const beacon = (game, slot = 0) => {
  const card = copy("ART-001");
  game.players[0].hand.push(card);
  ok(game, { type: "attach", player: 0, card: card.id, slot });
  return card;
};

test("Blinding Beacon attaches to a unit with a shared Signet in a Preparation Phase, paying its cost", () => {
  const game = board();
  const me = game.players[0];
  beacon(game, 0);
  assert.equal(me.ups[0].artifact.name, "Blinding Beacon");
  assert.equal(me.ups[0].artifact.chargesLeft, 2);
  assert.equal(me.energy, 9);
  // One per unit, one per Formation, but another can go outside the Formation.
  const second = copy("ART-001");
  me.hand.push(second);
  assert.match(checkAction(game, { type: "attach", player: 0, card: second.id, slot: 0 }), /already has/);
  assert.match(checkAction(game, { type: "attach", player: 0, card: second.id, slot: 1 }), /Only one Blinding Beacon/);
  me.ups[4] = copy("ARM-010");
  ok(game, { type: "attach", player: 0, card: second.id, slot: 4 });
  assert.match(checkAction(game, { type: "move", player: 0, from: 4, to: 1 }), /Only one/);
  // Not on a unit without a shared Signet, and not in the Battle Phase.
  const third = copy("ART-001");
  me.hand.push(third);
  me.ups[5] = copy("MAG-001");
  assert.match(checkAction(game, { type: "attach", player: 0, card: third.id, slot: 5 }), /same Signet/);
  game.phase = "battle";
  assert.match(checkAction(game, { type: "attach", player: 0, card: third.id, slot: 3 }), /Preparation Phase/);
});

test("activating it on attack deactivates the opponent's Formation until their turn starts", () => {
  const game = board();
  const [me, them] = game.players;
  beacon(game, 1);
  game.phase = "battle";
  assert.equal(attackPreview(game, 0).hits, false);
  assert.equal(attackPreview(game, 0, { artifact: 1 }).hits, true);
  assert.deepEqual(legalActions(game).filter((a) => a.type === "attack"), [{ type: "attack", player: 0 }, { type: "attack", player: 0, artifact: 1 }]);
  assert.deepEqual(chooseAction(game), { type: "attack", player: 0, artifact: 1 });
  ok(game, { type: "attack", player: 0, artifact: 1 });
  assert.equal(them.blinded, true);
  assert.equal(formationStats(game, 1).complete, false);
  assert.equal(them.damage, 1);
  assert.deepEqual(them.ups.slice(0, 3).map((u) => u.name), Array(3).fill("Graduate of Arms")); // nothing destroyed
  assert.equal(me.ups[1].artifact.chargesLeft, 1);
  assert.equal(me.ups[1].artifact.readyOnTurn, game.turn + 2);
  ok(game, { type: "endTurn", player: 0 });
  assert.equal(them.blinded, undefined);
  assert.equal(formationStats(game, 1).complete, true);
});

test("two-turn cooldown, then the second activation sends it to the Grave", () => {
  const game = board();
  const me = game.players[0];
  beacon(game, 0);
  game.phase = "battle";
  const used = game.turn;
  ok(game, { type: "attack", player: 0, artifact: 0 });
  for (const turn of [used + 1, used + 2]) {
    ok(game, { type: "endTurn", player: 0 });
    ok(game, { type: "endTurn", player: 1 });
    game.phase = "battle";
    game.pending = null;
    assert.equal(game.turn, turn);
    if (turn === used + 1) assert.match(checkAction(game, { type: "attack", player: 0, artifact: 0 }), /cooling down until turn/);
  }
  ok(game, { type: "attack", player: 0, artifact: 0 });
  assert.equal(me.ups[0].artifact, undefined);
  assert.equal(me.graveyard.at(-1).name, "Blinding Beacon");
  assert.equal(me.graveyard.at(-1).chargesLeft, undefined);
});

test("it only works from a Formation unit, waits a turn when attached in Phase II, and goes to the Grave with its unit", () => {
  const game = board();
  const me = game.players[0];
  me.ups[4] = copy("ARM-010");
  beacon(game, 4);
  game.phase = "battle";
  assert.match(checkAction(game, { type: "attack", player: 0, artifact: 4 }), /has to be in your Formation/);
  game.phase = "prep2";
  beacon(game, 2);
  game.phase = "battle";
  assert.match(checkAction(game, { type: "attack", player: 0, artifact: 2 }), /takes effect next turn/);
  destroyUnit(game, 0, 2);
  assert.deepEqual(me.graveyard.slice(-2).map((c) => c.name), ["Student of Arms", "Blinding Beacon"]);
  assert.equal(me.graveyard.at(-1).readyNextTurn, undefined);
});

test("the Beacon stays on through promotion", () => {
  const game = board();
  const me = game.players[0];
  beacon(game, 0);
  const apprentice = copy("ARM-011");
  me.hand.push(apprentice);
  ok(game, { type: "promote", player: 0, card: apprentice.id, slot: 0 });
  assert.equal(me.ups[0].artifact.name, "Blinding Beacon");
  assert.equal(me.ups[0].under[0].artifact, undefined);
});
