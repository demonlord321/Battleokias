// Player Grade (RULES.md a923370): the highest Grade on your field; you can't bring out a
// unit more than one Grade above it, however cheap it is.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyAction, checkAction, playerGrade } from "../src/engine/engine.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url)));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const copy = (id, k = 1) => ({ ...byId[id], cardId: id, id: `${id}#${k}` });
const filler = () => Array.from({ length: 30 }, (_, i) => copy("UNT-BOK-001", i + 10));

test("Player Grade is the highest Grade on the field, 0 when empty, and stored on the player", () => {
  const game = newGame({ seed: 4, decks: [filler(), filler()], startingPlayer: 0 });
  const p = game.players[0];
  assert.equal(p.playerGrade, 0);
  p.energy = 10;
  p.hand.push(copy("UNT-BOK-001", 1));
  applyAction(game, { type: "summon", player: 0, card: "UNT-BOK-001#1", slot: 0 });
  assert.equal(p.playerGrade, 1);
  p.ups[2] = copy("UNT-BOK-003");
  assert.equal(playerGrade(game, 0), 3);
});

test("even a cheap unit can't come out more than one Grade above your Player Grade", () => {
  const game = newGame({ seed: 4, decks: [filler(), filler()], startingPlayer: 0 });
  const p = game.players[0];
  p.energy = 10;
  p.ups[0] = copy("UNT-BOK-002"); // Grade 2
  p.hand.push({ ...copy("UNT-MAR-005"), cost: 1 }); // as if a spell made it cost 1
  assert.match(checkAction(game, { type: "summon", player: 0, card: "UNT-MAR-005#1", slot: 1 }), /Player Grade is 2, so you can only bring out units up to Grade 3/);
  p.ups[2] = copy("UNT-BOK-003"); // a Grade 3 raises it to 3
  assert.equal(checkAction(game, { type: "summon", player: 0, card: "UNT-MAR-005#1", slot: 1 }), null);
});

test("Player Grade never drops: lose your Grade 3 and you can still bring out a Grade 4", () => {
  const game = newGame({ seed: 4, decks: [filler(), filler()], startingPlayer: 0 });
  const p = game.players[0];
  p.energy = 10;
  p.ups[1] = copy("UNT-BOK-003");
  p.hand.push(copy("UNT-BOK-001", 1));
  assert.equal(applyAction(game, { type: "summon", player: 0, card: "UNT-BOK-001#1", slot: 0 }).ok, true);
  assert.equal(p.playerGrade, 3);
  assert.equal(applyAction(game, { type: "retire", player: 0, slot: 1 }).ok, true);
  assert.equal(p.playerGrade, 3);
  p.hand.push(copy("UNT-MAR-005"));
  assert.equal(checkAction(game, { type: "summon", player: 0, card: "UNT-MAR-005#1", slot: 1 }), null);
});
