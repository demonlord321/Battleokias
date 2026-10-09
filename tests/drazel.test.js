// Drazel, Instructor of the Blade (RULES.md): Defense 1000 when summoned, or the
// printed Defense of the unit he promotes, not any Equipment bonus.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, checkAction, attackPreview, unitStats } from "../src/engine/engine.js";
import { checkCards } from "../src/engine/cardCheck.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const copy = (id, k = 1) => ({ ...byId[id], cardId: id, id: `${id}#${k}` });
const filler = () => Array.from({ length: 30 }, (_, i) => copy("UNT-BOK-001", i + 10));

function start() {
  const game = newGame({ seed: 2, decks: [filler(), filler()], startingPlayer: 0 });
  game.players[0].energy = 10;
  return game;
}

test("summoned, Drazel has 4000 Attack and 1000 Defense", () => {
  const game = start();
  const p = game.players[0];
  p.ups[1] = copy("UNT-BOK-003"); // Player Grade 3, so a Grade 4 can come out
  p.hand.push(copy("UNT-MAR-001"));
  assert.equal(applyAction(game, { type: "summon", player: 0, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 4000, defense: 1000 });
});

test("promoting a Graduate, he takes its printed 1500 Defense, and its Practice Gear goes to the Grave", () => {
  const game = start();
  const p = game.players[0];
  p.ups[0] = { ...copy("UNT-BOK-003"), equipment: { ...copy("EQP-MAR-001") } };
  assert.deepEqual(unitStats(game, 0, 0), { attack: 1750, defense: 1750 });
  p.hand.push(copy("UNT-MAR-001"));
  assert.equal(applyAction(game, { type: "promote", player: 0, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.equal(p.ups[0].defense, 1500);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 4000, defense: 1500 });
  assert.equal(p.ups[0].under[0].name, "Student, Graduate");
});

test("the card check accepts his empty Defense only with variableDefense", () => {
  assert.deepEqual(checkCards([byId["UNT-MAR-001"]]), []);
  const { variableDefense, ...noRule } = byId["UNT-MAR-001"];
  assert.ok(checkCards([noRule]).some((m) => /defense/.test(m)));
  assert.ok(checkCards([{ ...byId["UNT-MAR-001"], defense: 1000 }]).some((m) => /"defense": null/.test(m)));
});

test("if the Equipment stays on, he takes the total Defense, and its Defense bonus isn't counted twice", () => {
  const game = start();
  const p = game.players[0];
  // An Equipment with no Grade limit, so it stays on through the promotion.
  const armour = { ...copy("EQP-MAR-001"), id: "ARMOUR#1", maxGrade: undefined, boost: { attack: 300, defense: 400 } };
  p.ups[0] = { ...copy("UNT-BOK-003"), equipment: armour };
  p.hand.push(copy("UNT-MAR-001"));
  assert.equal(applyAction(game, { type: "promote", player: 0, card: p.hand.length - 1, slot: 0 }).ok, true);
  assert.equal(p.ups[0].defense, 1900);
  assert.deepEqual(unitStats(game, 0, 0), { attack: 4300, defense: 1900 });
  // Back in the Grave, the Equipment is an ordinary card again.
  assert.equal(applyAction(game, { type: "retire", player: 0, slot: 0 }).ok, true);
  assert.equal(p.graveyard.find((c) => c.id === "ARMOUR#1").defenseCopied, undefined);
});

// Drazel's Katana (RULES.md 9c73e90): Drazel only, +500 Attack, and while he's in the attacking
// Formation a landed hit destroys the defender's unit with the highest Attack + Defense.
test("the Katana only goes on Drazel and gives him +500 Attack", () => {
  const game = start();
  const p = game.players[0];
  p.ups[0] = copy("UNT-BOK-003");
  p.ups[1] = { ...copy("UNT-MAR-001"), defense: 1000 }; // as if summoned
  p.hand.push(copy("EQP-MAR-002"));
  const k = p.hand.length - 1;
  assert.equal(checkAction(game, { type: "equip", player: 0, card: k, slot: 0 }), "Drazel's Katana can't go on Student, Graduate.");
  assert.equal(applyAction(game, { type: "equip", player: 0, card: k, slot: 1 }).ok, true);
  assert.deepEqual(unitStats(game, 0, 1), { attack: 4500, defense: 1000 });
});

test("with the Katana in the attacking Formation, a hit picks the highest Attack + Defense", () => {
  const game = start();
  const [me, them] = game.players;
  const formation = byId["FRM-MAR-001"];
  me.formationZone = formation;
  them.formationZone = formation;
  const slots = formation.slots;
  slots.forEach((s, i) => (me.ups[s] = i === 0 ? { ...copy("UNT-MAR-001"), defense: 1000 } : copy("UNT-BOK-003", i)));
  // Defender: Students everywhere except one Graduate, which is the strongest.
  slots.forEach((s, i) => (them.ups[s] = copy(i === 1 ? "UNT-BOK-003" : "UNT-BOK-001", i)));
  assert.equal(attackPreview(game, 0).hits, true);
  assert.equal(attackPreview(game, 0).destroys.length > 1, true); // lowest Grade: the Students
  me.ups[slots[0]].equipment = copy("EQP-MAR-002");
  assert.deepEqual(attackPreview(game, 0).destroys, [slots[1]]);
  // Set in Phase II, it isn't working yet.
  me.ups[slots[0]].equipment.readyNextTurn = true;
  assert.notDeepEqual(attackPreview(game, 0).destroys, [slots[1]]);
});

test("the card check rejects onlyOn ids that aren't units", () => {
  assert.ok(checkCards([{ ...byId["EQP-MAR-002"], onlyOn: ["NOPE-001"] }]).some((m) => /onlyOn/.test(m)));
});

test("a card's own maxCopies overrides the 3-copy limit", async () => {
  const { checkDecks, copyLimit } = await import("../src/engine/cardCheck.js");
  const one = cards.map((c) => (c.id === "EQP-MAR-002" ? { ...c, maxCopies: 1 } : c));
  assert.equal(copyLimit(one.find((c) => c.id === "EQP-MAR-002")), 1);
  const deck = [...Array(28).fill("UNT-BOK-001")];
  assert.ok(checkDecks({ martial: [...deck, "EQP-MAR-002", "EQP-MAR-002"] }, one).some((m) => /2 copies of EQP-MAR-002, the limit is 1/.test(m)));
  assert.ok(checkDecks({ martial: [...deck, "EQP-MAR-002", "EQP-MAR-002"] }, cards).every((m) => !/EQP-MAR-002/.test(m)));
});
