// Arms Academy (RULES.md, Field Spells): enroll a Grade 1 Arms unit, and two of your
// turns later a Grade 3 Arms unit comes out for free while the Grade 1 goes to the Grave.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, legalActions, academyOf } from "../src/engine/engine.js";

let n = 0;
const unit = (grade, signet = "arms") => ({ id: `U-${++n}`, cardId: `G${grade}-${signet}`, name: `G${grade} ${signet}`, type: "unit", signets: [signet], grade, attack: 500 * grade, defense: 500 * grade });
// Student of Arms (ARM-010) goes in, Graduate of Arms (ARM-012) comes out.
const student = () => ({ ...unit(1), cardId: "ARM-010", name: "Student of Arms" });
const graduate = () => ({ ...unit(3), cardId: "ARM-012", name: "Graduate of Arms" });
const academy = () => ({
  id: `FLD-001#${++n}`, cardId: "FLD-001", name: "Arms Academy", type: "field_spell", signets: ["arms"], cost: 1,
  academy: { enroll: "ARM-010", enrollName: "Student of Arms", emerge: "ARM-012", turns: 2, capacity: 2 },
});
const filler = () => Array.from({ length: 30 }, () => unit(2));

// Player 0 starts with Arms Academy and two Students in hand; the deck holds one Graduate
// and one other Grade 3 Arms unit, which the Academy must not offer.
function start() {
  const deck = filler();
  deck.splice(5, 0, graduate(), unit(3));
  const game = newGame({ seed: 7, decks: [deck, filler()], startingPlayer: 0 });
  const p = game.players[0];
  p.hand.push(academy(), student(), student(), unit(1));
  p.energy = 5;
  return game;
}
const idx = (game, pred) => game.players[0].hand.findIndex(pred);
const playAcademy = (game) => applyAction(game, { type: "setField", player: 0, card: idx(game, (c) => c.type === "field_spell") });
const enrollOne = (game) => applyAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.cardId === "ARM-010") });
const passRound = (game) => {
  applyAction(game, { type: "endTurn", player: 0 });
  applyAction(game, { type: "endTurn", player: 1 });
};

test("Arms Academy costs 1 Energy and goes into the Field Effect Zone", () => {
  const game = start();
  assert.equal(playAcademy(game).ok, true);
  assert.equal(game.players[0].fieldEffect.name, "Arms Academy");
  assert.deepEqual(game.players[0].fieldEffect.enrolled, []);
  assert.equal(game.players[0].energy, 4);
});

test("enrolling costs the Student's Grade, takes only Student of Arms, and holds 2", () => {
  const game = start();
  assert.match(checkAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.cardId === "ARM-010") }), /need an Academy/);
  playAcademy(game);
  assert.match(checkAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.grade === 2) }), /Only Student of Arms/);
  // Another Grade 1 Arms unit isn't a Student of Arms.
  assert.match(checkAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.cardId === "G1-arms") }), /Only Student of Arms/);
  assert.equal(enrollOne(game).ok, true);
  assert.equal(enrollOne(game).ok, true);
  assert.equal(game.players[0].energy, 2);
  game.players[0].hand.push(student());
  assert.match(checkAction(game, { type: "enroll", player: 0, card: game.players[0].hand.length - 1 }), /full/);
});

test("only in Preparation Phase I, and only with enough Energy", () => {
  const game = start();
  playAcademy(game);
  game.players[0].energy = 0;
  assert.match(checkAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.cardId === "ARM-010") }), /costs 1 Energy/);
  applyAction(game, { type: "nextPhase", player: 0 });
  assert.match(checkAction(game, { type: "enroll", player: 0, card: 0 }), /Preparation Phase I/);
  assert.match(checkAction(game, { type: "setField", player: 0, card: 0 }), /Preparation Phase I/);
});

test("sent on turn 1, a Graduate of Arms comes out on turn 3 from the deck, free, and the Student goes to the Grave", () => {
  const game = start();
  playAcademy(game);
  enrollOne(game);
  const student = academyOf(game, 0).enrolled[0].card;
  assert.equal(academyOf(game, 0).enrolled[0].ready, 3);
  passRound(game); // turn 2: not yet
  assert.equal(game.turn, 2);
  assert.equal(game.pending, null);
  passRound(game); // turn 3: graduation
  assert.equal(game.turn, 3);
  assert.equal(game.pending.type, "graduate");
  assert.deepEqual(game.pending.slots, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(game.pending.cards.length, 1); // only the Graduate, not the other Grade 3
  const [choice] = game.pending.cards;
  assert.equal(choice.from, "deck");
  assert.equal(choice.name, "Graduate of Arms");
  // Nothing else can happen until the choice is made.
  assert.match(checkAction(game, { type: "endTurn", player: 0 }), /Academy/);
  assert.deepEqual(legalActions(game).map((a) => a.type), Array(9).fill("graduate"));
  const energy = game.players[0].energy;
  const deckSize = game.players[0].deck.length;
  assert.equal(applyAction(game, { type: "graduate", player: 0, card: choice.id, slot: 4 }).ok, true);
  assert.equal(game.players[0].ups[4].cardId, "ARM-012");
  assert.equal(game.players[0].energy, energy);
  assert.equal(game.players[0].deck.length, deckSize - 1);
  assert.ok(game.players[0].graveyard.some((c) => c.id === student.id));
  assert.deepEqual(academyOf(game, 0).enrolled, []);
  assert.equal(game.pending, null);
});

test("a Graduate in hand can be picked instead, and two Students graduate one after the other", () => {
  const game = start();
  playAcademy(game);
  enrollOne(game);
  enrollOne(game);
  game.players[0].hand.push(graduate());
  passRound(game);
  passRound(game);
  const fromHand = game.pending.cards.find((c) => c.from === "hand");
  assert.ok(fromHand);
  applyAction(game, { type: "graduate", player: 0, card: fromHand.id, slot: 0 });
  assert.equal(game.pending.type, "graduate"); // the second student
  assert.ok(!game.pending.slots.includes(0));
  const next = game.pending.cards[0];
  applyAction(game, { type: "graduate", player: 0, card: next.id, slot: 1 });
  assert.equal(game.pending, null);
  assert.equal(game.players[0].ups.filter(Boolean).length, 2);
  assert.equal(game.players[0].graveyard.filter((c) => c.grade === 1).length, 2);
});

test("with no Graduate anywhere (another Grade 3 doesn't count), the Student waits in the Academy (placeholder)", () => {
  const game = newGame({ seed: 7, decks: [filler(), filler()], startingPlayer: 0 });
  game.players[0].hand.push(academy(), student(), unit(3));
  game.players[0].energy = 5;
  playAcademy(game);
  enrollOne(game);
  passRound(game);
  passRound(game);
  assert.equal(game.pending, null);
  assert.equal(academyOf(game, 0).enrolled.length, 1);
  assert.match(game.log.at(-1), /stays in Arms Academy/);
});

test("a new Field Spell sends the old one and its students to the Grave (placeholder)", () => {
  const game = start();
  playAcademy(game);
  enrollOne(game);
  game.players[0].hand.push(academy());
  applyAction(game, { type: "setField", player: 0, card: game.players[0].hand.length - 1 });
  assert.deepEqual(academyOf(game, 0).enrolled, []);
  assert.equal(game.players[0].graveyard.length, 2);
});
