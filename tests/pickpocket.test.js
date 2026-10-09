// Sena, Mistress of the shadows: Pickpocket. When she's summoned, promotion included, she may destroy
// one Item, Artifact or Equipment on the opponent's side; it goes to their Grave.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, checkAction, legalActions, unitStats } from "../src/engine/engine.js";
import { chooseAction } from "../src/engine/bot.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const copy = (id, k = 1) => ({ ...byId[id], cardId: id, id: `${id}#${k}` });
const filler = () => Array.from({ length: 30 }, (_, i) => copy("UNT-BOK-001", i + 10));

// Player 0 can bring out Sena; player 1 has a unit with Practice Gear and a Blinding Beacon.
function start() {
  const game = newGame({ seed: 2, decks: [filler(), filler()], startingPlayer: 0 });
  const [me, them] = game.players;
  me.energy = 10;
  me.ups[1] = copy("UNT-BOK-003");
  them.ups[0] = { ...copy("UNT-BOK-003", 2), equipment: copy("EQP-MAR-001"), artifact: { ...copy("ART-MAR-001"), chargesLeft: 2, readyOnTurn: 0 } };
  return game;
}
const summonSena = (game) => {
  const p = game.players[0];
  p.hand.push(copy("UNT-MAR-003"));
  return applyAction(game, { type: "summon", player: 0, card: p.hand.length - 1, slot: 0 });
};

test("summoning Sena asks what to pickpocket, and only that answer is allowed", () => {
  const game = start();
  assert.equal(summonSena(game).ok, true);
  assert.deepEqual(game.pending, { type: "pickpocket", player: 0, targets: [{ slot: 0, kind: "equipment" }, { slot: 0, kind: "artifact" }] });
  assert.deepEqual(legalActions(game), [
    { type: "pickpocket", player: 0, slot: 0, kind: "equipment" },
    { type: "pickpocket", player: 0, slot: 0, kind: "artifact" },
    { type: "pickpocket", player: 0, slot: null },
  ]);
  assert.match(checkAction(game, { type: "nextPhase", player: 0 }), /pickpocket/);
  assert.match(checkAction(game, { type: "pickpocket", player: 1, slot: 0, kind: "equipment" }), /choice/);
  assert.match(checkAction(game, { type: "pickpocket", player: 0, slot: 0, kind: "item" }), /highlighted/);
});

test("the Equipment goes to the opponent's Grave, cleaned, and the unit loses its bonus", () => {
  const game = start();
  summonSena(game);
  game.players[1].ups[0].equipment.readyNextTurn = true;
  assert.equal(applyAction(game, { type: "pickpocket", player: 0, slot: 0, kind: "equipment" }).ok, true);
  const them = game.players[1];
  assert.equal(game.pending, null);
  assert.equal(them.ups[0].equipment, undefined);
  assert.ok(them.ups[0].artifact);
  assert.deepEqual(unitStats(game, 1, 0), { attack: 2000, defense: 1500 });
  assert.equal(them.graveyard.at(-1).id, "EQP-MAR-001#1");
  assert.equal(them.graveyard.at(-1).readyNextTurn, undefined);
});

test("an Artifact goes to the Grave without its charges; skipping leaves everything", () => {
  const game = start();
  summonSena(game);
  assert.equal(applyAction(game, { type: "pickpocket", player: 0, slot: 0, kind: "artifact" }).ok, true);
  const grave = game.players[1].graveyard.at(-1);
  assert.equal(grave.id, "ART-MAR-001#1");
  assert.equal(grave.chargesLeft, undefined);
  assert.equal(game.players[1].ups[0].artifact, undefined);

  const other = start();
  summonSena(other);
  assert.equal(applyAction(other, { type: "pickpocket", player: 0, slot: null }).ok, true);
  assert.equal(other.pending, null);
  assert.ok(other.players[1].ups[0].equipment && other.players[1].ups[0].artifact);
});

test("an Item card in a slot can be taken too", () => {
  const game = start();
  game.players[1].ups[0] = null;
  game.players[1].ups[4] = { id: "ITM-001#1", name: "Test Item", type: "item" };
  summonSena(game);
  assert.deepEqual(game.pending.targets, [{ slot: 4, kind: "item" }]);
  assert.equal(applyAction(game, { type: "pickpocket", player: 0, slot: 4, kind: "item" }).ok, true);
  assert.equal(game.players[1].ups[4], null);
  assert.equal(game.players[1].graveyard.at(-1).name, "Test Item");
});

test("no targets: no Pickpocket", () => {
  const game = start();
  game.players[1].ups[0] = copy("UNT-BOK-003", 2);
  summonSena(game);
  assert.equal(game.pending, null);
});

test("promoting into Sena counts as a summon, so Pickpocket triggers too", () => {
  const promo = start();
  const p = promo.players[0];
  p.hand.push(copy("UNT-MAR-003"));
  assert.equal(applyAction(promo, { type: "promote", player: 0, card: p.hand.length - 1, slot: 1 }).ok, true);
  assert.equal(promo.pending?.type, "pickpocket");
  assert.equal(promo.pending.targets.length, 2);
});

test("the computer takes the Artifact first", () => {
  const game = start();
  summonSena(game);
  assert.deepEqual(chooseAction(game, 0), { type: "pickpocket", player: 0, slot: 0, kind: "artifact" });
});
