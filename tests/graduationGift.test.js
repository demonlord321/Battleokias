// Drazel, Practitioner of the Blade's Graduation Gift (RULES.md, 9 Oct).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, legalActions, unitStats } from "../src/engine/engine.js";
import { checkCards } from "../src/engine/cardCheck.js";
import { chooseAction } from "../src/engine/bot.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const copy = (id, k = 1) => ({ ...byId[id], cardId: id, id: `${id}#${k}` });
const filler = () => Array.from({ length: 30 }, (_, i) => copy("UNT-BOK-001", i + 10));
const ok = (game, action) => assert.equal(applyAction(game, action).ok, true, JSON.stringify(applyAction(game, action)));

function start({ institute = true, katanas = 2 } = {}) {
  const special = katanas ? [{ type: "equipment", cards: Array.from({ length: katanas }, (_, i) => copy("EQP-MAR-002", i + 1)) }] : [];
  const game = newGame({ seed: 4, decks: [filler(), filler()], specialDecks: [special, []], startingPlayer: 0 });
  const p = game.players[0];
  p.energy = 10;
  if (institute) p.fieldEffect = { ...copy("FLD-MAR-001"), enrolled: [] };
  p.ups[0] = copy("UNT-BOK-003");
  p.hand.push(copy("UNT-MAR-005"));
  return game;
}
const promote = (game) => ok(game, { type: "promote", player: 0, card: "UNT-MAR-005#1", slot: 0 });

test("promoted with Military Institute in play, he may search the Equipment Special Deck for his Katana", () => {
  const game = start();
  promote(game);
  assert.equal(game.pending.type, "graduationGift");
  assert.equal(game.pending.player, 0);
  assert.match(game.pending.card, /^EQP-MAR-002#/);
  assert.deepEqual(legalActions(game).map((a) => a.accept), [true, true, false]); // equip now, keep in hand, decline
  ok(game, { type: "graduationGift", player: 0, accept: true });
  const p = game.players[0];
  assert.equal(game.pending, null);
  assert.equal(p.hand.at(-1).cardId, "EQP-MAR-002");
  assert.equal(p.specialDecks[0].cards.length, 1);
  // Equipped in Preparation Phase I as usual: +500 Attack straight away.
  ok(game, { type: "equip", player: 0, card: p.hand.at(-1).id, slot: 0 });
  assert.deepEqual(unitStats(game, 0, 0), { attack: 4500, defense: 1500 });
});

test("declining leaves the Katana in the Special Deck", () => {
  const game = start();
  promote(game);
  ok(game, { type: "graduationGift", player: 0, accept: false });
  assert.equal(game.pending, null);
  assert.equal(game.players[0].specialDecks[0].cards.length, 2);
  assert.ok(!game.players[0].hand.some((c) => c.cardId === "EQP-MAR-002"));
});

test("no Gift without Military Institute, without a Katana to find, or on a normal summon", () => {
  for (const opts of [{ institute: false }, { katanas: 0 }]) {
    const game = start(opts);
    promote(game);
    assert.equal(game.pending, null);
  }
  const game = start();
  ok(game, { type: "summon", player: 0, card: "UNT-MAR-005#1", slot: 1 });
  assert.equal(game.pending, null);
});

test("the Katana goes on any Drazel card and stays on when the Practitioner becomes the Instructor", () => {
  const game = start();
  promote(game);
  ok(game, { type: "graduationGift", player: 0, accept: true });
  const p = game.players[0];
  ok(game, { type: "equip", player: 0, card: p.hand.at(-1).id, slot: 0 });
  game.promotionsLeft = 1;
  p.hand.push(copy("UNT-MAR-001"));
  ok(game, { type: "promote", player: 0, card: "UNT-MAR-001#1", slot: 0 });
  assert.equal(p.ups[0].name, "Drazel, Instructor of the Blade");
  assert.equal(p.ups[0].equipment.cardId, "EQP-MAR-002");
});

test("the bot takes the Gift, and the card check wants a real Field Spell and Equipment", () => {
  const game = start();
  promote(game);
  assert.deepEqual(chooseAction(game, 0), { type: "graduationGift", player: 0, accept: true, equip: 0 });
  const broken = { ...byId["UNT-MAR-005"], gift: { field: "FLD-MAR-001", card: "UNT-BOK-001" } };
  assert.ok(checkCards([...cards.filter((c) => c.id !== "UNT-MAR-005"), broken]).some((m) => /gift/.test(m)));
});

test("the Gift can equip the Katana on him straight away, at its usual cost", () => {
  const game = start();
  promote(game);
  assert.equal(game.pending.slot, 0);
  assert.deepEqual(legalActions(game).map((a) => [a.accept, a.equip]), [[true, 0], [true, undefined], [false, undefined]]);
  assert.match(applyAction(game, { type: "graduationGift", player: 0, accept: true, equip: 3 }).reason ?? "", /found it/);
  assert.deepEqual(chooseAction(game, 0), { type: "graduationGift", player: 0, accept: true, equip: 0 });
  const p = game.players[0];
  const energy = p.energy;
  ok(game, { type: "graduationGift", player: 0, accept: true, equip: 0 });
  assert.equal(p.ups[0].equipment.cardId, "EQP-MAR-002");
  assert.equal(p.energy, energy - 3);
  assert.ok(!p.hand.some((c) => c.cardId === "EQP-MAR-002"));
  assert.deepEqual(unitStats(game, 0, 0), { attack: 4500, defense: 1500 });
});

test("without the Energy to equip it, only taking it to hand or declining is offered", () => {
  const game = start();
  promote(game);
  game.players[0].energy = 2;
  assert.deepEqual(legalActions(game).map((a) => [a.accept, a.equip]), [[true, undefined], [false, undefined]]);
  assert.match(applyAction(game, { type: "graduationGift", player: 0, accept: true, equip: 0 }).reason ?? "", /Energy/);
});
