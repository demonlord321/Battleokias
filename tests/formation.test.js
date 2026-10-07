// Formations (RULES.md): Frontal Assault sums the Attack and Defense of the units in its slots.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, legalActions, formationStats, attackPreview } from "../src/engine/engine.js";

let n = 0;
const unit = (grade, attack, defense) => ({ id: `U-${++n}`, name: `Unit${n}`, type: "unit", grade, attack, defense });
const frontal = () => ({ id: `FRM-001#${++n}`, cardId: "FRM-001", name: "Frontal Assault", type: "formation", cost: 0, slots: [0, 1, 2], combine: "sum" });
const deckOf = (size = 30) => Array.from({ length: size }, () => unit(1, 500, 500));

function start() {
  const game = newGame({ seed: 3, decks: [deckOf(), deckOf()], startingPlayer: 0 });
  game.players[0].hand.push(frontal());
  return game;
}
const place = (game, who, slot, u) => (game.players[who].ups[slot] = { ...u });
const lastCard = (game) => game.players[0].hand.length - 1;

test("set a Formation from hand into the Formation Zone in Preparation Phase I", () => {
  const game = start();
  assert.equal(formationStats(game, 0), null);
  assert.equal(applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) }).ok, true);
  assert.equal(game.players[0].formationZone.name, "Frontal Assault");
});

test("only Formation cards, only in Preparation Phase I", () => {
  const game = start();
  assert.match(checkAction(game, { type: "setFormation", player: 0, card: 0 }), /isn't a Formation/);
  applyAction(game, { type: "nextPhase", player: 0 });
  assert.match(checkAction(game, { type: "setFormation", player: 0, card: lastCard(game) }), /Preparation Phase I/);
});

test("Frontal Assault sums the three front-row units and ignores the rest", () => {
  const game = start();
  applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) });
  place(game, 0, 0, unit(1, 500, 500)); // Student
  place(game, 0, 1, unit(2, 1500, 1000)); // Apprentice
  assert.deepEqual(formationStats(game, 0), { name: "Frontal Assault", attack: 2000, defense: 1500, missing: 1, complete: false, damageGrade: 1, defenseGrade: 0 });
  place(game, 0, 2, unit(1, 500, 500)); // Student
  place(game, 0, 4, unit(3, 2000, 1500)); // Graduate in the middle row doesn't count
  assert.deepEqual(formationStats(game, 0), { name: "Frontal Assault", attack: 2500, defense: 2000, missing: 0, complete: true, damageGrade: 1, defenseGrade: 0 });
});

test("a new Formation replaces the old one, which goes to the Grave (placeholder)", () => {
  const game = start();
  applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) });
  game.players[0].hand.push(frontal());
  applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) });
  assert.equal(game.players[0].graveyard.length, 1);
});

// Formation attacks (RULES.md): Attack >= the opponent's Formation Defense gives them a Damage Counter.
function battleReady(myStats, theirStats) {
  const game = start();
  const [p0, p1] = game.players;
  p0.formationZone = frontal();
  [0, 1, 2].forEach((slot) => place(game, 0, slot, unit(1, myStats[0], myStats[1])));
  if (theirStats) {
    p1.formationZone = frontal();
    [0, 1, 2].forEach((slot) => place(game, 1, slot, unit(1, theirStats[0], theirStats[1])));
  }
  applyAction(game, { type: "nextPhase", player: 0 });
  return game;
}
const attack = (game) => applyAction(game, { type: "attack", player: game.activePlayer });

test("you need a complete Formation, in the Battle Phase, to attack", () => {
  const game = start();
  assert.match(checkAction(game, { type: "attack", player: 0 }), /Battle Phase/);
  applyAction(game, { type: "nextPhase", player: 0 });
  assert.match(checkAction(game, { type: "attack", player: 0 }), /need a Formation set/);
  game.players[0].formationZone = frontal();
  place(game, 0, 0, unit(1, 500, 500));
  assert.match(checkAction(game, { type: "attack", player: 0 }), /needs 2 more units/);
});

test("Attack higher than their Defense gives them a Damage Counter", () => {
  const game = battleReady([600, 500], [500, 500]); // 1800 vs 1500
  assert.equal(attack(game).ok, true);
  assert.equal(game.players[1].damage, 1);
});

test("a tie goes through", () => {
  const game = battleReady([500, 500], [500, 500]); // 1500 vs 1500
  attack(game);
  assert.equal(game.players[1].damage, 1);
});

test("Attack lower than their Defense fails", () => {
  const game = battleReady([500, 500], [500, 600]); // 1500 vs 1800
  attack(game);
  assert.equal(game.players[1].damage, 0);
  assert.match(game.log.at(-1), /can't get through/);
});

test("an opponent with no complete Formation takes the hit (placeholder)", () => {
  const game = battleReady([100, 100]);
  game.players[1].formationZone = frontal(); // set, but no units in its slots
  attack(game);
  assert.equal(game.players[1].damage, 1);
});

test("one Formation attack per Battle Phase (placeholder)", () => {
  const game = battleReady([500, 500]);
  attack(game);
  assert.match(checkAction(game, { type: "attack", player: 0 }), /already attacked/);
});

test("10 Damage Counters loses the game", () => {
  const game = battleReady([500, 500]);
  game.players[1].damage = 9;
  attack(game);
  assert.equal(game.winner, 0);
  assert.equal(game.phase, "over");
});

test("random legal play always finishes with a winner", () => {
  for (let seed = 0; seed < 20; seed++) {
    const make = (_, i) => (i % 5 === 0 ? frontal() : unit(1 + (i % 3), 500 * (1 + (i % 4)), 500 * (1 + (i % 3))));
    const game = newGame({ seed, decks: [Array.from({ length: 30 }, make), Array.from({ length: 30 }, make)] });
    for (let step = 0; step < 5000 && game.winner === null; step++) {
      const options = legalActions(game);
      const busy = options.filter((a) => a.type !== "endTurn" && a.type !== "nextPhase");
      const pick = busy.length ? busy[Math.floor(game.rng() * busy.length)] : options.find((a) => a.type === "nextPhase");
      assert.equal(applyAction(game, pick).ok, true);
    }
    assert.notEqual(game.winner, null);
  }
});

// Damage Grade and Defense Grade (RULES.md).
test("a hit deals the attacker's Damage Grade minus the defender's Defense Grade", () => {
  const game = battleReady([600, 500], [500, 500]);
  game.players[0].formationZone.damageGrade = 3;
  game.players[1].formationZone.defenseGrade = 1;
  assert.equal(attackPreview(game).counters, 2);
  attack(game);
  assert.equal(game.players[1].damage, 2);
});

test("Defense Grade can take a hit down to 0 counters, not below (placeholder)", () => {
  const game = battleReady([600, 500], [500, 500]);
  game.players[1].formationZone.defenseGrade = 2;
  assert.deepEqual([attackPreview(game).hits, attackPreview(game).counters], [true, 0]);
  attack(game);
  assert.equal(game.players[1].damage, 0);
});

test("an incomplete Formation gives no Defense Grade (placeholder)", () => {
  const game = battleReady([100, 100]);
  game.players[1].formationZone = { ...frontal(), defenseGrade: 5 };
  attack(game);
  assert.equal(game.players[1].damage, 1);
});

test("a big Damage Grade can finish the game", () => {
  const game = battleReady([500, 500]);
  game.players[0].formationZone.damageGrade = 3;
  game.players[1].damage = 8;
  attack(game);
  assert.equal(game.winner, 0);
});
