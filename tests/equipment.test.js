// Equipment (RULES.md): goes over a unit sharing one of its Signets; Practice Gear gives +250 Attack and +250 Defense (the tests use a +500 fixture).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, legalActions, unitStats, formationStats } from "../src/engine/engine.js";

let n = 0;
const unit = (grade, attack, defense, signet = "arms") => ({ id: `U-${++n}`, name: `Unit${n}`, type: "unit", signets: [signet], grade, attack, defense });
const gear = () => ({ id: `EQP-001#${++n}`, cardId: "EQP-001", name: "Practice Gear", type: "equipment", signets: ["arms"], cost: 1, boost: { attack: 500, defense: 500 } });
const pctGear = () => ({ ...gear(), name: "Percent Gear", boost: { attackPercent: 25, defensePercent: 25 } });
const deckOf = () => Array.from({ length: 30 }, () => unit(1, 500, 500));

function start() {
  const game = newGame({ seed: 5, decks: [deckOf(), deckOf()], startingPlayer: 0 });
  game.players[0].energy = 5;
  return game;
}
const lastCard = (game) => game.players[0].hand.length - 1;
const equip = (game, slot) => applyAction(game, { type: "equip", player: 0, card: lastCard(game), slot });

test("Practice Gear makes a Student 1000/1000 and costs 1 Energy", () => {
  const game = start();
  game.players[0].ups[0] = unit(1, 500, 500);
  game.players[0].hand.push(gear());
  assert.ok(legalActions(game).some((a) => a.type === "equip" && a.slot === 0));
  assert.equal(equip(game, 0).ok, true);
  assert.equal(game.players[0].ups[0].equipment.name, "Practice Gear");
  assert.deepEqual(unitStats(game, 0, 0), { attack: 1000, defense: 1000 });
  assert.equal(game.players[0].energy, 4);
  assert.equal(game.players[0].ups[0].attack, 500); // the card itself is unchanged
});

test("percent boosts round down: 1500/333 at +25% becomes 1875/416", () => {
  const game = start();
  game.players[0].ups[1] = unit(2, 1500, 333);
  game.players[0].hand.push(pctGear());
  equip(game, 1);
  assert.deepEqual(unitStats(game, 0, 1), { attack: 1875, defense: 416 });
});

test("needs a shared Signet, a unit, one Equipment per unit, Preparation Phase I and Energy", () => {
  const game = start();
  game.players[0].ups[0] = unit(1, 500, 500, "magic");
  game.players[0].ups[1] = unit(1, 500, 500);
  game.players[0].hand.push(gear());
  assert.match(checkAction(game, { type: "equip", player: 0, card: lastCard(game), slot: 0 }), /same Signet/);
  assert.match(checkAction(game, { type: "equip", player: 0, card: lastCard(game), slot: 5 }), /no unit/);
  assert.match(checkAction(game, { type: "equip", player: 0, card: 0, slot: 1 }), /isn't an Equipment/);
  equip(game, 1);
  game.players[0].hand.push(gear());
  assert.match(checkAction(game, { type: "equip", player: 0, card: lastCard(game), slot: 1 }), /already has Practice Gear/);
  game.players[0].ups[2] = unit(1, 500, 500);
  game.players[0].energy = 0;
  assert.match(checkAction(game, { type: "equip", player: 0, card: lastCard(game), slot: 2 }), /costs 1 Energy/);
  game.players[0].energy = 5;
  applyAction(game, { type: "nextPhase", player: 0 });
  assert.match(checkAction(game, { type: "equip", player: 0, card: lastCard(game), slot: 2 }), /Preparation Phase I/);
});

test("boosts count toward the Formation, before it adds up and scales", () => {
  const game = start();
  const p = game.players[0];
  p.formationZone = { name: "Frontal Assault", type: "formation", slots: [0, 1, 2], combine: "sum", damageGrade: 1, defenseGrade: 0 };
  [0, 1, 2].forEach((s) => (p.ups[s] = unit(1, 500, 500)));
  p.hand.push(gear());
  equip(game, 0);
  assert.equal(formationStats(game, 0).attack, 2000);
  assert.equal(formationStats(game, 0).defense, 2000);
  // Vanguard Charge: (1000 + 500 + 500 + 333) x 1.5 = 3499; 2333 / 1.5 = 1555, rounded down.
  p.formationZone = { name: "Vanguard Charge", type: "formation", slots: [0, 1, 2, 4], combine: "scaled", attackMultiplier: 1.5, defenseDivisor: 1.5, damageGrade: 2, defenseGrade: 0 };
  p.ups[4] = unit(1, 333, 333);
  assert.equal(formationStats(game, 0).attack, 3499);
  assert.equal(formationStats(game, 0).defense, 1555);
});

test("Equipment stays on through promotion and moves, and goes to the Grave with its unit", () => {
  const game = start();
  const p = game.players[0];
  p.ups[0] = unit(1, 500, 500);
  p.hand.push(gear());
  equip(game, 0);
  p.hand.push(unit(2, 1500, 1000));
  assert.equal(applyAction(game, { type: "promote", player: 0, card: lastCard(game), slot: 0 }).ok, true);
  assert.equal(p.ups[0].equipment.name, "Practice Gear");
  assert.equal(p.ups[0].under[0].equipment, undefined);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 2000, defense: 1500 });
  applyAction(game, { type: "move", player: 0, from: 0, to: 4 });
  assert.equal(p.ups[4].equipment.name, "Practice Gear");
  applyAction(game, { type: "retire", player: 0, slot: 4 });
  // The Grade 2, the Grade 1 under it, and the Gear: three separate cards.
  assert.deepEqual(p.graveyard.map((c) => c.type).sort(), ["equipment", "unit", "unit"]);
  assert.ok(p.graveyard.every((c) => !c.equipment && !c.under));
});
