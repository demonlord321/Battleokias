// Arms Academy (RULES.md, Field Spells): enroll a Grade 1 Arms unit, and two of your
// turns later a Grade 3 Arms unit comes out for free while the Grade 1 goes to the Grave.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, legalActions, academyOf } from "../src/engine/engine.js";

let n = 0;
const unit = (grade, signet = "arms") => ({ id: `U-${++n}`, cardId: `G${grade}-${signet}`, name: `G${grade} ${signet}`, type: "unit", signets: [signet], grade, attack: 500 * grade, defense: 500 * grade });
const academy = () => ({
  id: `FLD-001#${++n}`, cardId: "FLD-001", name: "Arms Academy", type: "field_spell", signets: ["arms"], cost: 1,
  academy: { signet: "arms", enrollGrade: 1, emergeGrade: 3, turns: 2, capacity: 2 },
});
const filler = () => Array.from({ length: 30 }, () => unit(2));

// Player 0 starts with Arms Academy and two Grade 1s in hand; deck holds one Grade 3.
function start() {
  const deck = filler();
  deck.splice(5, 0, unit(3));
  const game = newGame({ seed: 7, decks: [deck, filler()], startingPlayer: 0 });
  const p = game.players[0];
  p.hand.push(academy(), unit(1), unit(1));
  p.energy = 5;
  return game;
}
const idx = (game, pred) => game.players[0].hand.findIndex(pred);
const playAcademy = (game) => applyAction(game, { type: "setField", player: 0, card: idx(game, (c) => c.type === "field_spell") });
const enrollOne = (game) => applyAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.grade === 1) });
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

test("enrolling costs the unit's Grade, needs a Grade 1 Arms unit, and holds 2", () => {
  const game = start();
  assert.match(checkAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.grade === 1) }), /need an Academy/);
  playAcademy(game);
  assert.match(checkAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.grade === 2) }), /Only Grade 1 arms/);
  game.players[0].hand.push(unit(1, "magic"));
  assert.match(checkAction(game, { type: "enroll", player: 0, card: game.players[0].hand.length - 1 }), /Only Grade 1 arms/);
  assert.equal(enrollOne(game).ok, true);
  assert.equal(enrollOne(game).ok, true);
  assert.equal(game.players[0].energy, 2);
  game.players[0].hand.push(unit(1));
  assert.match(checkAction(game, { type: "enroll", player: 0, card: game.players[0].hand.length - 1 }), /full/);
});

test("only in Preparation Phase I, and only with enough Energy", () => {
  const game = start();
  playAcademy(game);
  game.players[0].energy = 0;
  assert.match(checkAction(game, { type: "enroll", player: 0, card: idx(game, (c) => c.grade === 1) }), /costs 1 Energy/);
  applyAction(game, { type: "nextPhase", player: 0 });
  assert.match(checkAction(game, { type: "enroll", player: 0, card: 0 }), /Preparation Phase I/);
  assert.match(checkAction(game, { type: "setField", player: 0, card: 0 }), /Preparation Phase I/);
});

test("sent on turn 1, the Grade 3 comes out on turn 3 from the deck, free, and the Grade 1 goes to the Grave", () => {
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
  const [choice] = game.pending.cards;
  assert.equal(choice.from, "deck");
  // Nothing else can happen until the choice is made.
  assert.match(checkAction(game, { type: "endTurn", player: 0 }), /Academy/);
  assert.deepEqual(legalActions(game).map((a) => a.type), Array(9).fill("graduate"));
  const energy = game.players[0].energy;
  const deckSize = game.players[0].deck.length;
  assert.equal(applyAction(game, { type: "graduate", player: 0, card: choice.id, slot: 4 }).ok, true);
  assert.equal(game.players[0].ups[4].grade, 3);
  assert.equal(game.players[0].energy, energy);
  assert.equal(game.players[0].deck.length, deckSize - 1);
  assert.ok(game.players[0].graveyard.some((c) => c.id === student.id));
  assert.deepEqual(academyOf(game, 0).enrolled, []);
  assert.equal(game.pending, null);
});

test("a Grade 3 in hand can be picked instead, and two students graduate one after the other", () => {
  const game = start();
  playAcademy(game);
  enrollOne(game);
  enrollOne(game);
  game.players[0].hand.push(unit(3));
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

test("with no Grade 3 anywhere, the student waits in the Academy (placeholder)", () => {
  const game = newGame({ seed: 7, decks: [filler(), filler()], startingPlayer: 0 });
  game.players[0].hand.push(academy(), unit(1));
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
