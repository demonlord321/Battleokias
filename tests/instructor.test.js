// Drazel, Instructor of the Blade's summon effect (RULES.md, 9 Oct).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, checkAction, legalActions } from "../src/engine/engine.js";
import { chooseAction } from "../src/engine/bot.js";
import { checkCards } from "../src/engine/cardCheck.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const copy = (id, k = 1) => ({ ...byId[id], cardId: id, id: `${id}#${k}` });
const ok = (game, action) => { const r = applyAction(game, action); assert.equal(r.ok, true, r.reason); };
const deck = () => [...Array.from({ length: 20 }, (_, i) => copy("UNT-BOK-001", i + 10)), copy("UNT-BOK-003", 10), copy("UNT-BOK-003", 11)];

// A Practitioner already on the field since an earlier turn, an Instructor in hand.
function start({ institute = true, fresh = false } = {}) {
  const game = newGame({ seed: 5, decks: [deck(), deck()], startingPlayer: 0 });
  const p = game.players[0];
  p.energy = 10;
  if (institute) p.fieldEffect = { ...copy("FLD-MAR-001"), enrolled: [] };
  p.ups[0] = { ...copy("UNT-MAR-005"), defense: 1000, arrivedTurn: fresh ? game.turn : game.turn - 1 };
  p.hand.push(copy("UNT-MAR-001"));
  return game;
}
const promote = (game) => ok(game, { type: "promote", player: 0, card: "UNT-MAR-001#1", slot: 0 });

test("on top of a Practitioner who has been out a full turn, he costs nothing", () => {
  const game = start({ institute: false });
  const p = game.players[0];
  promote(game);
  assert.equal(p.energy, 10);
  assert.equal(p.ups[0].name, "Drazel, Instructor of the Blade");
  assert.equal(game.pending, null); // no Students without Military Institute
  assert.equal(game.promotionsLeft, 0); // still his one promotion
});

test("a Practitioner who arrived this turn, or another Grade 4, costs the usual 1 Energy", () => {
  const game = start({ institute: false, fresh: true });
  promote(game);
  assert.equal(game.players[0].energy, 9);
  const other = start({ institute: false });
  other.players[0].ups[0] = { ...copy("UNT-MAR-003"), arrivedTurn: other.turn - 1 };
  promote(other);
  assert.equal(other.players[0].energy, 9);
  assert.equal(other.pending, null);
  const broke = start({ institute: false, fresh: true });
  broke.players[0].energy = 0;
  assert.match(checkAction(broke, { type: "promote", player: 0, card: "UNT-MAR-001#1", slot: 0 }), /costs 1 Energy/);
  const free = start({ institute: false });
  free.players[0].energy = 0;
  assert.equal(checkAction(free, { type: "promote", player: 0, card: "UNT-MAR-001#1", slot: 0 }), null);
});

test("with Military Institute, he brings two First Years from hand or deck, one at a time", () => {
  const game = start();
  const p = game.players[0];
  p.hand.push(copy("UNT-BOK-001", 1), copy("UNT-BOK-002", 1));
  promote(game);
  const pend = game.pending;
  assert.equal(pend.type, "freeStudents");
  assert.equal(pend.left, 2);
  const fromHand = pend.choices.find((c) => c.from === "hand");
  assert.match(fromHand.card, /UNT-BOK-001/);
  assert.ok(pend.choices.some((c) => c.from === "deck" && /UNT-BOK-001/.test(c.card)));
  assert.ok(pend.choices.every((c) => /UNT-BOK-001/.test(c.card))); // First Years only
  assert.match(checkAction(game, { type: "freeStudents", player: 0, card: "UNT-BOK-002#1", from: "hand", slot: 1 }) ?? "", /./);
  assert.equal(pend.slots.includes(0), false);
  assert.match(checkAction(game, { type: "freeStudents", player: 0, card: fromHand.card, from: "hand", slot: 0 }), /empty slots/);
  const deckSize = p.deck.length;
  const fromDeck = pend.choices.find((c) => c.from === "deck");
  ok(game, { type: "freeStudents", player: 0, card: fromDeck.card, from: "deck", slot: 1 });
  assert.equal(p.ups[1].name, "Student, First Year");
  assert.equal(p.ups[1].arrivedTurn, game.turn);
  assert.equal(p.deck.length, deckSize - 1);
  assert.equal(game.pending.left, 1);
  ok(game, { type: "freeStudents", player: 0, card: fromHand.card, from: "hand", slot: 2 });
  assert.equal(p.ups[2].name, "Student, First Year");
  assert.equal(game.pending, null);
  assert.equal(p.energy, 10);
});

test("stopping early, a single empty slot, and the bot's pick", () => {
  const game = start();
  promote(game);
  assert.deepEqual(legalActions(game).at(-1), { type: "freeStudents", player: 0, done: true });
  const pick = chooseAction(game, 0);
  assert.match(pick.card, /UNT-BOK-001/); // only First Years on offer
  ok(game, { type: "freeStudents", player: 0, done: true });
  assert.equal(game.pending, null);

  const full = start();
  const p = full.players[0];
  for (let s = 1; s < p.ups.length; s++) p.ups[s] = copy("UNT-BOK-001", 50 + s);
  p.ups[4] = null;
  promote(full);
  assert.deepEqual(full.pending.slots, [4]);
  ok(full, { type: "freeStudents", player: 0, card: full.pending.choices[0].card, from: full.pending.choices[0].from, slot: 4 });
  assert.equal(full.pending, null);
});

test("the card check wants a real unit to promote from and a Field Spell for the Students", () => {
  assert.deepEqual(checkCards(cards), []);
  const bad = { ...byId["UNT-MAR-001"], freePromotion: { from: "FLD-MAR-001" } };
  assert.ok(checkCards([...cards.filter((c) => c.id !== "UNT-MAR-001"), bad]).some((m) => /freePromotion/.test(m)));
  const bad2 = { ...byId["UNT-MAR-001"], freePromotion: { from: "UNT-MAR-005", students: { field: "UNT-BOK-001", count: 2, cards: ["UNT-BOK-001"] } } };
  assert.ok(checkCards([...cards.filter((c) => c.id !== "UNT-MAR-001"), bad2]).some((m) => /students/.test(m)));
});
