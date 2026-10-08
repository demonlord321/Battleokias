// Formations (RULES.md): Frontal Assault sums the Attack and Defense of the units in its slots.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, checkAction, legalActions, formationStats, attackPreview, lowestGradeSlots } from "../src/engine/engine.js";

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

test("only Formation cards, in either Preparation Phase, and a new one sends the old one to the Grave", () => {
  const game = start();
  assert.match(checkAction(game, { type: "setFormation", player: 0, card: 0 }), /isn't a Formation/);
  applyAction(game, { type: "nextPhase", player: 0 });
  assert.match(checkAction(game, { type: "setFormation", player: 0, card: lastCard(game) }), /Preparation Phase/);
  applyAction(game, { type: "nextPhase", player: 0 });
  game.pending = null; // no Special Deck draw in this test
  assert.equal(applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) }).ok, true);
  game.players[0].hand.push(frontal());
  assert.equal(applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) }).ok, true);
  assert.equal(game.players[0].graveyard.at(-1).name, "Frontal Assault");
});

test("Frontal Assault sums the three front-row units and ignores the rest", () => {
  const game = start();
  applyAction(game, { type: "setFormation", player: 0, card: lastCard(game) });
  place(game, 0, 0, unit(1, 500, 500)); // Student
  place(game, 0, 1, unit(2, 1500, 1000)); // Apprentice
  assert.deepEqual(formationStats(game, 0), { name: "Frontal Assault", slots: [0, 1, 2], attack: 2000, defense: 1500, missing: 1, blinded: false, complete: false, canAttack: true, damageGrade: 1, defenseGrade: 0 });
  place(game, 0, 2, unit(1, 500, 500)); // Student
  place(game, 0, 4, unit(3, 2000, 1500)); // Graduate in the middle row doesn't count
  assert.deepEqual(formationStats(game, 0), { name: "Frontal Assault", slots: [0, 1, 2], attack: 2500, defense: 2000, missing: 0, blinded: false, complete: true, canAttack: true, damageGrade: 1, defenseGrade: 0 });
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

test("an opponent with no complete Formation takes the hit", () => {
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

test("a hit that lands always deals at least 1 counter, whatever the Defense Grade", () => {
  const game = battleReady([600, 500], [500, 500]);
  game.players[1].formationZone.defenseGrade = 2;
  assert.deepEqual([attackPreview(game).hits, attackPreview(game).counters], [true, 1]);
  attack(game);
  assert.equal(game.players[1].damage, 1);
});

test("an incomplete Formation gives no Defense Grade (placeholder)", () => {
  const game = battleReady([100, 100]);
  game.players[1].formationZone = { ...frontal(), defenseGrade: 5 };
  attack(game);
  assert.equal(game.players[1].damage, 1);
});

test("a big Damage Grade can finish the game", () => {
  const game = battleReady([500, 500], [100, 100]);
  game.players[0].formationZone.damageGrade = 3;
  game.players[1].damage = 8;
  attack(game);
  assert.equal(game.winner, 0);
});

// The Grave (RULES.md): a landed hit destroys the defender's lowest-Grade unit in their Formation.
function gradedBattle(theirGrades) {
  const game = battleReady([1000, 1000], [100, 100]);
  theirGrades.forEach((grade, slot) => (game.players[1].ups[slot] = { ...unit(grade, 100, 100), name: `G${grade}-${slot}` }));
  return game;
}

test("a landed hit destroys the defender's lowest-Grade Formation unit", () => {
  const game = gradedBattle([2, 1, 3]);
  assert.deepEqual(attackPreview(game).destroys, [1]);
  attack(game);
  const them = game.players[1];
  assert.equal(them.ups[1], null);
  assert.equal(them.graveyard.at(-1).name, "G1-1");
  assert.equal(formationStats(game, 1).complete, false); // now inactive
});

test("units outside the Formation are never the ones destroyed", () => {
  const game = gradedBattle([2, 2, 3]);
  game.players[1].ups[4] = unit(1, 100, 100); // Grade 1, but in the middle row
  assert.deepEqual(lowestGradeSlots(game, 1), [0, 1]);
});

test("tied lowest Grades: the defender chooses, and nothing else can happen first", () => {
  const game = gradedBattle([1, 3, 1]);
  attack(game);
  assert.deepEqual(game.pending, { type: "chooseLoss", player: 1, slots: [0, 2] });
  assert.deepEqual(legalActions(game), [
    { type: "chooseLoss", player: 1, slot: 0 },
    { type: "chooseLoss", player: 1, slot: 2 },
  ]);
  assert.match(checkAction(game, { type: "nextPhase", player: 0 }), /has to choose/);
  assert.match(checkAction(game, { type: "chooseLoss", player: 0, slot: 0 }), /choice/);
  assert.match(checkAction(game, { type: "chooseLoss", player: 1, slot: 1 }), /highlighted/);
  assert.equal(applyAction(game, { type: "chooseLoss", player: 1, slot: 2 }).ok, true);
  assert.equal(game.players[1].ups[2], null);
  assert.ok(game.players[1].ups[0]);
  assert.equal(game.pending, null);
  assert.equal(applyAction(game, { type: "nextPhase", player: 0 }).ok, true);
});

test("against no active Formation: exactly 1 counter whatever the Damage Grade, nothing destroyed", () => {
  const game = battleReady([500, 500]);
  game.players[0].formationZone.damageGrade = 3;
  game.players[1].ups[0] = unit(1, 100, 100); // a lone unit with no Formation
  const preview = attackPreview(game);
  assert.deepEqual([preview.hits, preview.counters, preview.destroys], [true, 1, []]);
  attack(game);
  assert.equal(game.players[1].damage, 1);
  assert.ok(game.players[1].ups[0]);
});

test("an inactive Formation counts as no Formation", () => {
  const game = gradedBattle([1, 2, 3]);
  game.players[1].ups[2] = null;
  game.players[0].formationZone.damageGrade = 3;
  attack(game);
  assert.equal(game.players[1].damage, 1);
  assert.equal(game.players[1].graveyard.length, 0);
});

test("chooseLoss is refused when there's nothing to choose", () => {
  const game = start();
  assert.match(checkAction(game, { type: "chooseLoss", player: 0, slot: 0 }), /nothing to choose/);
});

test("from turn 3 with no Formation in hand or set, take one from the deck (deckFormation)", () => {
  const game = newGame({ seed: 3, decks: [[...deckOf(29), frontal()], deckOf()], startingPlayer: 0 });
  const p = game.players[0];
  const id = p.deck.find((c) => c.type === "formation")?.id ?? p.hand.find((c) => c.type === "formation").id;
  // Make sure it's in the deck, not the hand, for this test.
  if (!p.deck.some((c) => c.id === id)) p.deck.unshift(...p.hand.splice(p.hand.findIndex((c) => c.id === id), 1));
  const take = { type: "deckFormation", player: 0, card: id };
  assert.match(checkAction(game, take), /from turn 3/);
  for (let i = 0; i < 2; i++) {
    applyAction(game, { type: "endTurn", player: 0 });
    applyAction(game, { type: "endTurn", player: 1 });
  }
  assert.equal(game.turn, 3);
  // If the draws brought it into the hand, put it back on the bottom of the deck.
  if (!p.deck.some((c) => c.id === id)) p.deck.unshift(...p.hand.splice(p.hand.findIndex((c) => c.id === id), 1));
  assert.ok(legalActions(game).some((a) => a.type === "deckFormation" && a.card === id));
  const deckSize = p.deck.length;
  assert.equal(applyAction(game, take).ok, true);
  assert.equal(p.formationZone.id, id);
  assert.equal(p.deck.length, deckSize - 1);
  assert.match(checkAction(game, take), /already/);
  // Once per game: even with the Formation Zone empty again, it's not offered.
  p.formationZone = null;
  p.hand = p.hand.filter((c) => c.type !== "formation");
  p.deck.push(frontal());
  assert.match(checkAction(game, { type: "deckFormation", player: 0, card: p.deck.at(-1).id }), /already taken a Formation/);
  assert.ok(!legalActions(game).some((a) => a.type === "deckFormation"));
});

test("deckFormation isn't allowed with a Formation in hand, a non-Formation card, or outside Preparation Phase I", () => {
  const game = newGame({ seed: 3, decks: [[...deckOf(29), frontal()], deckOf()], startingPlayer: 0 });
  game.turn = 3;
  const p = game.players[0];
  p.hand = p.hand.filter((c) => c.type !== "formation");
  p.deck.push(frontal());
  const fid = p.deck.at(-1).id;
  assert.match(checkAction(game, { type: "deckFormation", player: 0, card: p.deck[0].type === "formation" ? "nope" : p.deck[0].id }), /Pick a Formation/);
  p.hand.push(frontal());
  assert.match(checkAction(game, { type: "deckFormation", player: 0, card: fid }), /in your hand/);
  p.hand.pop();
  applyAction(game, { type: "nextPhase", player: 0 });
  assert.match(checkAction(game, { type: "deckFormation", player: 0, card: fid }), /Preparation Phase I/);
});

test("Vanguard Charge: the front row plus middle centre, Attack x1.5 and Defense /1.5, rounded down", () => {
  const game = start();
  game.players[0].formationZone = {
    id: "FRM-002#1", cardId: "FRM-002", name: "Vanguard Charge", type: "formation", cost: 0,
    slots: [0, 1, 2, 4], combine: "scaled", attackMultiplier: 1.5, defenseDivisor: 1.5, damageGrade: 2, defenseGrade: 0,
  };
  place(game, 0, 0, unit(1, 500, 500)); // Student
  place(game, 0, 1, unit(2, 1500, 1000)); // Apprentice
  place(game, 0, 2, unit(3, 2000, 1500)); // Graduate
  assert.equal(formationStats(game, 0).complete, false);
  place(game, 0, 4, unit(1, 500, 500)); // Student, middle centre
  place(game, 0, 3, unit(3, 2000, 1500)); // middle left doesn't count
  // 4500 x 1.5 = 6750 Attack; 3500 / 1.5 = 2333.3, rounded down to 2333 Defense.
  assert.deepEqual(formationStats(game, 0), { name: "Vanguard Charge", slots: [0, 1, 2, 4], attack: 6750, defense: 2333, missing: 0, blinded: false, complete: true, canAttack: true, damageGrade: 2, defenseGrade: 0 });
});

// Line Defense (RULES.md d751b3f): any one full row, Attack 0, Defense = Attack + Defense of that row.
const lineDefense = () => ({ id: `FRM-003#${++n}`, cardId: "FRM-003", name: "Line Defense", type: "formation", cost: 2,
  slotOptions: [[0, 1, 2], [3, 4, 5], [6, 7, 8]], combine: "wall", damageGrade: 0, defenseGrade: 1 });
const vanguard = () => ({ id: `FRM-002#${++n}`, cardId: "FRM-002", name: "Vanguard Charge", type: "formation", cost: 1,
  slots: [0, 1, 2, 4], combine: "scaled", attackMultiplier: 1.5, defenseDivisor: 1.5, damageGrade: 2, defenseGrade: 0 });

test("Line Defense counts the strongest full row as a wall, can't attack, and its row takes the hit", () => {
  const game = start();
  const [me, them] = game.players;
  me.formationZone = lineDefense();
  [0, 1].forEach((s) => place(game, 0, s, unit(3, 2000, 1500))); // front row not full
  assert.equal(formationStats(game, 0).complete, false);
  [3, 4, 5].forEach((s) => place(game, 0, s, unit(1, 500, 500)));
  [6, 7, 8].forEach((s) => place(game, 0, s, unit(2, 1500, 1000)));
  const stats = formationStats(game, 0);
  assert.deepEqual(stats.slots, [6, 7, 8]); // 7500 beats the Students' 3000
  assert.equal(stats.attack, 0);
  assert.equal(stats.defense, 7500);
  assert.equal(stats.canAttack, false);
  game.phase = "battle";
  assert.match(checkAction(game, { type: "attack", player: 0 }), /can't attack/);
  assert.equal(attackPreview(game, 0).hits, false);
  // Vanguard with four Graduates: 12000 Attack gets through, 2 - 1 = 1 counter, and the lowest
  // Grade in the counted row is destroyed.
  them.formationZone = vanguard();
  [0, 1, 2, 4].forEach((s) => place(game, 1, s, unit(3, 2000, 1500)));
  const hit = attackPreview(game, 1);
  assert.equal(hit.hits, true);
  assert.equal(hit.counters, 1);
  assert.deepEqual(hit.destroys, [6, 7, 8]);
});
