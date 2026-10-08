// The rules engine. Every move in the game is an "action", a small object like
//   { type: "endTurn", player: 0 }  or  { type: "summon", player: 0, card: 3, slot: 4 }
// and it all goes through applyAction(). The board UI, the test bots, the
// tutorial and the AI later all use this one function, so they all follow
// exactly the same rules. See RULES.md for the rules themselves.

import { createRng, shuffle } from "./rng.js";
import { createGame, createPlayer, MAX_ENERGY_CAP, MAX_DAMAGE } from "./state.js";

// Opening hands (RULES.md, Setup). Each player's first Draw Phase then takes
// the starting player to 5 cards and the opponent to 6.
export const STARTING_HAND = { first: 4, second: 5 };

// RULES.md, Promotion: one per turn unless a Field Spell allows more.
export const PROMOTIONS_PER_TURN = 1;

// RULES.md, Formations: from your own third turn, if you have no Formation in hand
// or in your Formation Zone, you can play one straight from your deck.
export const DECK_FORMATION_TURN = 3;

// RULES.md: a hit that lands always deals at least 1 Damage Counter, whatever the Defense Grade.
export const MIN_COUNTERS = 1;

// Moves the top card of a player's Draw Pile into their hand.
// Returns the card, or null if the pile is empty.
export function drawCard(game, playerIndex) {
  const p = game.players[playerIndex];
  const card = p.deck.pop() ?? null;
  if (card) p.hand.push(card);
  else game.log.push(`${p.name} has no cards left to draw.`);
  return card;
}

// Ends the game with a winner (a player index).
function win(game, playerIndex, why) {
  game.winner = playerIndex;
  game.phase = "over";
  game.log.push(`${game.players[playerIndex].name} wins: ${why}`);
}

// Removes a unit from the field. It, any cards stacked under it and its Equipment go to the Grave.
// Nothing destroys units yet; spells and effects will use this.
export function destroyUnit(game, playerIndex, slot, message = null) {
  const p = game.players[playerIndex];
  const unit = p.ups[slot];
  if (!unit) return null;
  const { under = [], equipment = null, artifact = null, ...card } = unit;
  p.ups[slot] = null;
  const { readyNextTurn, defenseCopied, attackCopied, ...gear } = equipment ?? {};
  p.graveyard.push(...under, card, ...(equipment ? [gear] : []), ...(artifact ? [cleanArtifact(artifact)] : []));
  game.log.push(message ?? `${unit.name} goes to the Grave.`);
  return unit;
}

// An Artifact as it goes back to the Grave, without its on-the-field state.
const cleanArtifact = ({ readyNextTurn, chargesLeft, readyOnTurn, ...card }) => card;

const isSlot = (p, slot) => Number.isInteger(slot) && slot >= 0 && slot < p.ups.length;
// A set Trap sits face-down in a Unit Position Slot as { ...card, faceDown: true } (RULES.md, Stand Strong).
// It fills the slot but isn't a unit: it has no stats, and a Formation slot holding it counts as empty.
export const unitAt = (p, slot) => (p.ups[slot] && !p.ups[slot].faceDown ? p.ups[slot] : null);

// The summon action names a hand card either by its hand index (a number) or by
// its instance id (a string like "ARM-001#2"). Returns the hand index, or -1.
// What a card costs to play: a unit's Grade, or another card's cost.
export function cardCost(card) {
  return card.grade ?? card.cost ?? 0;
}

// A unit's Attack and Defense with its Equipment (RULES.md, Equipment). A boost can be
// flat, like Practice Gear's { attack: 500, defense: 500 }, or a share of the unit's own
// numbers, like { attackPercent: 25 } (rounded down). Percent applies first, then flat.
// Returns null for an empty slot.
export function unitStats(game, playerIndex, slot) {
  const unit = unitAt(game.players[playerIndex], slot);
  if (!unit) return null;
  // Equipment set in Preparation Phase II (equipment.readyNextTurn) does nothing until your next Phase I.
  const boost = (!unit.equipment?.readyNextTurn && unit.equipment?.boost) || {};
  // Drazel copied a Defense that already counted this Equipment, so it isn't added twice.
  const defBoost = unit.equipment?.defenseCopied ? {} : boost;
  const atkBoost = unit.equipment?.attackCopied ? {} : boost; // Galent, the same way
  return {
    attack: Math.floor((unit.attack * (100 + (atkBoost.attackPercent ?? 0))) / 100) + (atkBoost.attack ?? 0),
    defense: Math.floor((unit.defense * (100 + (defBoost.defensePercent ?? 0))) / 100) + (defBoost.defense ?? 0),
  };
}

// The slots a player's Formation counts right now. Most Formations have fixed `slots`. One with
// `slotOptions` (Line Defense: any one full row) uses the option the player picked with
// chooseFormation (p.formationOption) while it's full (RULES.md a2392f0). Otherwise, placeholder
// (Planner): the strongest full option by its units' Attack + Defense, or if none is full, the one
// closest to full. Ties go to the first.
export function formationSlots(game, playerIndex) {
  const f = game.players[playerIndex].formationZone;
  if (!f) return [];
  if (!f.slotOptions) return f.slots ?? [];
  return f.slotOptions[formationOption(game, playerIndex)];
}

// Indexes into the Formation's slotOptions that are full right now ([] for fixed Formations).
export function fullFormationOptions(game, playerIndex) {
  const p = game.players[playerIndex];
  const options = p.formationZone?.slotOptions ?? [];
  return options.flatMap((slots, i) => (slots.every((s) => unitAt(p, s)) ? [i] : []));
}

// The slotOptions index in use (see formationSlots), or null for a Formation with fixed slots.
export function formationOption(game, playerIndex) {
  const p = game.players[playerIndex];
  const f = p.formationZone;
  if (!f?.slotOptions) return null;
  if (fullFormationOptions(game, playerIndex).includes(p.formationOption)) return p.formationOption;
  const score = (slots) => {
    const missing = slots.filter((s) => !unitAt(p, s)).length;
    const total = missing ? 0 : slots.reduce((t, s) => { const u = unitStats(game, playerIndex, s); return t + u.attack + u.defense; }, 0);
    return { missing, total };
  };
  let best = 0;
  let top = score(f.slotOptions[0]);
  f.slotOptions.forEach((slots, i) => {
    const sc = score(slots);
    if (sc.missing < top.missing || (sc.missing === top.missing && sc.total > top.total)) { best = i; top = sc; }
  });
  return best;
}

// Every slot a Formation card could count, whatever the board looks like.
export const anyFormationSlots = (f) => (f ? f.slots ?? [...new Set(f.slotOptions.flat())] : []);

// A player's set Formation, added up (RULES.md, Formations). Only the units in
// the Formation's own slots count. Frontal Assault ("sum") adds their Attack and
// Defense. Returns null if no Formation is set.
export function formationStats(game, playerIndex) {
  const p = game.players[playerIndex];
  const f = p.formationZone;
  if (!f) return null;
  // Each unit's Equipment boost is applied and rounded down first, then the Formation adds them up.
  const slots = formationSlots(game, playerIndex);
  const units = slots.filter((slot) => unitAt(p, slot)).map((slot) => unitStats(game, playerIndex, slot));
  const missing = slots.length - units.length;
  // Blinding Beacon: a blinded Formation is deactivated, so it counts as no active Formation.
  const blinded = !!p.blinded;
  let attack = units.reduce((total, u) => total + u.attack, 0);
  let defense = units.reduce((total, u) => total + u.defense, 0);
  // "scaled" (Vanguard Charge): Attack times attackMultiplier, Defense divided by
  // defenseDivisor, rounded down (placeholder until Dyllan confirms rounding).
  if (f.combine === "scaled") {
    attack = Math.floor(attack * (f.attackMultiplier ?? 1));
    defense = Math.floor(defense / (f.defenseDivisor ?? 1));
  }
  // "wall" (Line Defense): Attack 0, and Defense is the units' Attack and Defense added together.
  if (f.combine === "wall") {
    defense += attack;
    attack = 0;
  }
  const damageGrade = f.damageGrade ?? 1;
  return {
    name: f.name, slots, attack, defense, missing, blinded, complete: missing === 0 && !blinded,
    options: fullFormationOptions(game, playerIndex), // slotOptions indexes that are full right now
    option: formationOption(game, playerIndex), // the one in use (null for fixed slots)
    canAttack: damageGrade > 0, // Line Defense (Damage Grade 0) can't attack
    damageGrade, // Damage Counters dealt when its attack lands
    defenseGrade: f.defenseGrade ?? 0, // taken off an incoming attack's Damage Grade
  };
}

// What the active player's Formation attack would do right now, so the UI can
// show it before the click and the attack itself uses exactly the same numbers.
// RULES.md: an inactive Formation (any slot empty) counts as no Formation.
// - Against an active Formation: it lands if Attack >= their Defense, deals
//   Damage Grade minus their Defense Grade (at least 1), and destroys their
//   lowest-Grade unit in the Formation. `destroys` lists the tied candidates.
//   With Drazel's Katana (hitRule "highestTotal") working on a unit in the attacking
//   Formation, it destroys their unit with the highest Attack + Defense instead.
// - Against no active Formation: it always lands, deals exactly 1 counter, and destroys nothing.
// - { artifact: slot } previews the attack with that unit's Blinding Beacon activated.
export function attackPreview(game, playerIndex = game.activePlayer, { artifact = null } = {}) {
  const enemy = game.players[1 - playerIndex];
  const wasBlinded = enemy.blinded;
  if (artifact !== null && game.players[playerIndex].ups[artifact]?.artifact?.activate === "blindFormation") enemy.blinded = true;
  const mine = formationStats(game, playerIndex);
  const theirs = formationStats(game, 1 - playerIndex);
  enemy.blinded = wasBlinded;
  const guarded = !!theirs?.complete;
  const attack = mine?.complete ? mine.attack : 0;
  const defense = guarded ? theirs.defense : 0;
  const hits = !!mine?.complete && mine.canAttack && attack >= defense;
  let counters = 0;
  let destroys = [];
  if (hits && !guarded) counters = 1;
  if (hits && guarded) {
    counters = Math.max(MIN_COUNTERS, mine.damageGrade - theirs.defenseGrade);
    destroys = attackerHitRule(game, playerIndex) === "highestTotal" ? highestTotalSlots(game, 1 - playerIndex) : lowestGradeSlots(game, 1 - playerIndex);
  }
  return { attack, defense, hits, counters, destroys, mine, theirs: guarded ? theirs : null };
}

// A hit rule from working Equipment on a unit in the player's Formation (Drazel's Katana), or null.
// Placeholder (Planner): the unit has to be in the attacking Formation.
function attackerHitRule(game, playerIndex) {
  const p = game.players[playerIndex];
  for (const slot of formationSlots(game, playerIndex)) {
    const gear = p.ups[slot]?.equipment;
    if (gear?.hitRule && !gear.readyNextTurn) return gear.hitRule;
  }
  return null;
}

// The Formation slots holding the player's unit(s) with the highest Attack + Defense, Equipment included.
export function highestTotalSlots(game, playerIndex) {
  const p = game.players[playerIndex];
  const slots = formationSlots(game, playerIndex).filter((slot) => unitAt(p, slot));
  const total = (slot) => { const s = unitStats(game, playerIndex, slot); return s.attack + s.defense; };
  const top = Math.max(...slots.map(total));
  return slots.filter((slot) => total(slot) === top);
}

// The Formation slots holding the player's lowest-Grade unit(s).
// Set Traps of this player that can save a unit from an attack (Stand Strong: response "saveUnit").
function savingTraps(p) {
  return p.ups.flatMap((c, slot) => (c?.faceDown && c.type === "trap" && c.response === "saveUnit" ? [slot] : []));
}

// A landed hit's loss: one candidate is destroyed; tied candidates go to the defender's choice.
// Whether the player's Formation already holds this Artifact (by card id), ignoring `exceptSlot`.
// Attaching outside the Formation is always fine.
function formationHas(p, cardId, slot) {
  const slots = anyFormationSlots(p.formationZone);
  if (!slots.includes(slot)) return false;
  return slots.some((s) => s !== slot && p.ups[s]?.artifact && catalogueId(p.ups[s].artifact) === cardId);
}

// Why the Artifact on the unit in `slot` can't be activated with this attack, or null.
// Placeholder (Planner): the unit has to be in the attacking Formation. Cooldown counts your
// own turns: used on turn 3 with cooldown 2, it's ready again on turn 5.
function artifactProblem(game, playerIndex, slot) {
  const p = game.players[playerIndex];
  const unit = isSlot(p, slot) ? unitAt(p, slot) : null;
  const a = unit?.artifact;
  if (!a) return "There's no Artifact there.";
  if (!a.activate) return `${a.name} can't be activated.`;
  if (!formationSlots(game, playerIndex).includes(slot)) return `${unit.name} has to be in your Formation to use ${a.name}.`;
  if (a.readyNextTurn) return `${a.name} takes effect next turn.`;
  if (a.readyOnTurn > game.turn) return `${a.name} is cooling down until turn ${a.readyOnTurn}.`;
  return null;
}

// Activates the Artifact: Blinding Beacon ("blindFormation") deactivates the opponent's
// Formation until the start of their turn. It uses a charge, starts its cooldown, and after
// its last charge it goes to the Grave.
function useArtifact(game, playerIndex, slot) {
  const p = game.players[playerIndex];
  const unit = p.ups[slot];
  const a = unit.artifact;
  if (a.activate === "blindFormation") game.players[1 - playerIndex].blinded = true;
  a.chargesLeft -= 1;
  a.readyOnTurn = game.turn + (a.cooldown ?? 0);
  game.log.push(`${p.name} activates ${a.name}: ${game.players[1 - playerIndex].name}'s Formation is deactivated for this Battle Phase.`);
  if (a.chargesLeft <= 0) {
    delete unit.artifact;
    p.graveyard.push(cleanArtifact(a));
    game.log.push(`${a.name} is used up and goes to the Grave.`);
  } else game.log.push(`${a.name} has ${a.chargesLeft} charge${a.chargesLeft === 1 ? "" : "s"} left, ready again on turn ${a.readyOnTurn}.`);
}

function resolveLoss(game, playerIndex, slots) {
  if (slots.length === 1) return destroyUnit(game, playerIndex, slots[0]);
  // Placeholder: when candidates tie, the defender picks which unit goes.
  game.pending = { type: "chooseLoss", player: playerIndex, slots };
  game.log.push(`${game.players[playerIndex].name} chooses which unit goes to the Grave.`);
}

export function lowestGradeSlots(game, playerIndex) {
  const p = game.players[playerIndex];
  const slots = formationSlots(game, playerIndex).filter((slot) => unitAt(p, slot));
  const lowest = Math.min(...slots.map((slot) => p.ups[slot].grade));
  return slots.filter((slot) => p.ups[slot].grade === lowest);
}

// Arms Academy (RULES.md, Field Spells). An Academy Field Spell card carries
//   academy: { enroll, emerge, turns, capacity }
// where enroll and emerge are card ids (RULES.md: Student of Arms ARM-010 goes in,
// Graduate of Arms ARM-012 comes out; no other card and no other promotion).
// While it sits in your Field Effect Zone, fieldEffect.enrolled lists the units
// in it as { card, ready }, where ready is the turn number they graduate on
// (sent on your turn 3 with turns: 2 means ready on your turn 5).
export function academyOf(game, playerIndex) {
  const field = game.players[playerIndex].fieldEffect;
  return field?.academy ? field : null;
}

// RULES.md, Arms Academy: while it's in play, your units with its Signet on the
// field can promote as often as your Energy allows. The Field Spell card says
// which Signet with unlimitedPromotions: "arms". Every other promotion still
// counts toward the normal one per turn.
export function unlimitedPromotion(game, playerIndex, base) {
  const signet = game.players[playerIndex].fieldEffect?.unlimitedPromotions;
  return !!signet && (base?.signets ?? []).includes(signet);
}

// The catalogue id of a card (deck copies are "ARM-010#2" with cardId "ARM-010").
const catalogueId = (c) => c.cardId ?? c.id;

// Promotion lines (RULES.md): a unit's line is its first Signet; later Signets are
// sub-Signets and don't count. A card with "promotesFrom" (like Apprentice of Arms,
// promotesFrom ["ARM-010"]) only goes on those cards. Placeholder until Dyllan says how
// named units fit: a card without it goes on any unit one Grade lower in the same line.
export const promotionLine = (card) => card.signets?.[0] ?? null;

// Equipment with maxGrade (Practice Gear: 3) only goes on, and only stays on, units up to that Grade.
const fitsGrade = (equipment, unit) => !Number.isInteger(equipment.maxGrade) || unit.grade <= equipment.maxGrade;

// The Attack or Defense (stat) a unit has when it arrives on the field. Most use their printed
// number. A unit with variableDefense (Drazel) or variableAttack (Galent, his mirror image) has
// .summoned when summoned, and copies that stat of the unit it promotes: the printed number, or,
// when that unit's Equipment stays on (RULES.md f6fc20c), its total with the Equipment (baseTotal).
const VARIABLE = { attack: "variableAttack", defense: "variableDefense" };
function arrivingStat(card, stat, base = null, baseTotal = null) {
  const v = card[VARIABLE[stat]];
  if (!v) return card[stat];
  if (!base || v.promoted !== "base") return v.summoned;
  return baseTotal ?? base[stat];
}
// Both stats for a summoned unit.
const arriving = (card) => ({ attack: arrivingStat(card, "attack"), defense: arrivingStat(card, "defense") });

export function inPromotionLine(base, card) {
  if (card.promotesFrom) return card.promotesFrom.includes(catalogueId(base));
  return promotionLine(base) !== null && promotionLine(base) === promotionLine(card);
}

// What a graduating unit could become right now: every copy of the Academy's
// emerge card in your hand or deck (one entry per place, so the choice list
// stays short), and your empty slots.
export function graduateOptions(game, playerIndex) {
  const p = game.players[playerIndex];
  const { academy } = academyOf(game, playerIndex);
  const fits = (c) => catalogueId(c) === academy.emerge;
  const cards = [];
  const seen = new Set();
  for (const [from, pile] of [["hand", p.hand], ["deck", p.deck]]) {
    for (const c of pile) {
      const key = `${from}:${c.cardId ?? c.name}`;
      if (!fits(c) || seen.has(key)) continue;
      seen.add(key);
      cards.push({ id: c.id, name: c.name, from });
    }
  }
  const slots = p.ups.map((u, slot) => (u ? -1 : slot)).filter((slot) => slot >= 0);
  return { cards, slots };
}

// In Preparation Phase I, each unit whose time is up graduates, one at a time:
// game.pending asks the player which Grade 3 comes out and into which empty slot.
// Placeholder until Dyllan decides: if there's no empty slot or no Grade 3 to
// pick, the unit stays in the Academy and tries again next turn.
function nextGraduation(game) {
  const player = game.activePlayer;
  const field = academyOf(game, player);
  if (!field || game.phase !== "prep1") return;
  for (const student of field.enrolled) {
    if (!student.due) continue;
    const { cards, slots } = graduateOptions(game, player);
    if (cards.length && slots.length) {
      game.pending = { type: "graduate", player, student: student.card.id, cards, slots };
      game.log.push(`${student.card.name} is ready to leave ${field.name}.`);
      return;
    }
    student.due = false;
    const why = slots.length ? "there's no card to call out of your hand or deck" : "there's no empty slot";
    game.log.push(`${student.card.name} stays in ${field.name} for now: ${why}.`);
  }
}

function handIndex(player, card) {
  if (typeof card === "number") return Number.isInteger(card) && card >= 0 && card < player.hand.length ? card : -1;
  return player.hand.findIndex((c) => c.id === card);
}

// Start of your turn (RULES.md, Energy): max Energy goes up by 1, to a cap of 10,
// and all your Energy refills to that max. So turn 1 has 1, turn 2 has 2, and so on.
export function refreshEnergy(player) {
  player.maxEnergy = Math.min(MAX_ENERGY_CAP, player.maxEnergy + 1);
  player.energy = player.maxEnergy;
}

// Spends Energy if the player has enough. Returns true if it was spent.
// Summoning uses this to pay a unit's cost.
export function spendEnergy(player, amount) {
  if (amount > player.energy) return false;
  player.energy -= amount;
  return true;
}

// Starts the active player's turn: refill Energy, then the Start Phase, Draw Phase (draw 1) and Preparation Phase I.
function startTurn(game) {
  if (game.activePlayer === game.startingPlayer) game.turn += 1;
  const p = game.players[game.activePlayer];
  refreshEnergy(p);
  // Blinding Beacon: a blinded Formation reactivates at the start of its owner's turn.
  if (p.blinded) { delete p.blinded; game.log.push(`${p.name}'s Formation can see again.`); }
  // RULES.md: one promotion per turn (Field Spells may raise this later),
  // and your Formation can attack once per Battle Phase (placeholder).
  game.promotionsLeft = PROMOTIONS_PER_TURN;
  game.formationAttacked = false;
  game.log.push(`Turn ${game.turn}: ${p.name}'s turn.`);
  // Start Phase (RULES.md): activate set Spells or Traps. None exist yet, so it passes on its own.
  game.phase = "start";
  if (hasSetCardsToActivate(game, game.activePlayer)) return;
  startDraw(game);
}

// Draw Phase (draw 1 from the main deck), then straight into Preparation Phase I.
function startDraw(game) {
  const p = game.players[game.activePlayer];
  game.phase = "draw";
  // RULES.md placeholder: a player who can't draw in their Draw Phase loses.
  if (!drawCard(game, game.activePlayer)) return win(game, 1 - game.activePlayer, `${p.name} couldn't draw.`);
  game.phase = "prep1";
  for (const unit of p.ups) if (unit?.equipment?.readyNextTurn) {
    delete unit.equipment.readyNextTurn;
    game.log.push(`${unit.name}'s ${unit.equipment.name} takes effect.`);
  }
  for (const unit of p.ups) if (unit?.artifact?.readyNextTurn) {
    delete unit.artifact.readyNextTurn;
    game.log.push(`${unit.name}'s ${unit.artifact.name} takes effect.`);
  }
  for (const student of academyOf(game, game.activePlayer)?.enrolled ?? []) student.due = student.ready <= game.turn;
  nextGraduation(game);
}

// Whether a player has set Spells they could activate right now. While they do, the Start
// and End Phases wait (nextPhase moves on) instead of passing on their own.
function hasSetCardsToActivate(game, playerIndex) {
  return readySetSpells(game, playerIndex).length > 0;
}

// Phases of your own turn in which a set Spell can be activated (RULES.md, Fire Arrow).
const SPELL_PHASES = ["start", "prep1", "battle", "prep2", "end"];

// Slots holding the player's set Spells that do something and can be activated now.
// Placeholder (Planner): one set this turn waits until your next turn, like Equipment.
export function readySetSpells(game, playerIndex) {
  if (playerIndex !== game.activePlayer || !SPELL_PHASES.includes(game.phase) || game.pending) return [];
  return game.players[playerIndex].ups.flatMap((c, slot) => (c?.faceDown && c.type === "spell" && spellDoes(c) && c.setTurn !== game.turn ? [slot] : []));
}

// Whether a Spell has an effect the engine knows (Fire Arrow: damage).
const spellDoes = (card) => Number.isInteger(card.damage);

// Resolves a Spell's effect, then it goes to the Grave. Fire Arrow: `damage` Damage Counters to the opponent.
function resolveSpell(game, playerIndex, card) {
  const p = game.players[playerIndex];
  const enemy = game.players[1 - playerIndex];
  const { faceDown, setTurn, ...clean } = card;
  p.graveyard.push(clean);
  if (card.damage) {
    enemy.damage += card.damage;
    game.log.push(`${card.name} hits ${enemy.name} for ${card.damage} Damage Counter${card.damage === 1 ? "" : "s"}. ${enemy.name} has ${enemy.damage}.`);
    if (enemy.damage >= MAX_DAMAGE) win(game, playerIndex, `${enemy.name} reached ${MAX_DAMAGE} Damage Counters.`);
  }
}

// End Phase (RULES.md): activate set cards if needed, then the opponent's turn begins.
function startEnd(game) {
  game.phase = "end";
  if (hasSetCardsToActivate(game, game.activePlayer)) return;
  passTurn(game);
}

// Phases where Equipment can be equipped (RULES.md: in Phase II you can only set cards;
// Equipment set there waits until your next Phase I). Everything else stays in Phase I.
const PREP = ["prep1", "prep2"];

// Start of Preparation Phase II (RULES.md, Special Decks): you pick one of your
// Special Decks and draw its top card, through game.pending. Placeholder: the player
// going first skips this on turn 1, and if every Special Deck is empty there's no draw.
function startPrep2(game) {
  const player = game.activePlayer;
  const p = game.players[player];
  game.phase = "prep2";
  game.log.push(`${p.name} moves to Preparation Phase II.`);
  if (game.turn === 1 && player === game.startingPlayer) return;
  const decks = p.specialDecks.flatMap((d, i) => (d?.cards.length ? [i] : []));
  if (decks.length) game.pending = { type: "specialDraw", player, decks };
}

// Passes the turn to the other player.
function passTurn(game) {
  game.activePlayer = 1 - game.activePlayer;
  startTurn(game);
}

// Each action type has a check (is this move allowed?) and an apply (do it).
// New rules are added here as entries once Milestone 0 is settled.
const ACTIONS = {
  // Pass the turn right away, from any phase.
  endTurn: {
    check(game, action) {
      return null; // null means allowed; otherwise a reason string
    },
    apply(game, action) {
      passTurn(game);
    },
  },

  // RULES.md turn order: Start, Draw, Preparation I, Battle, Preparation II, End, then the
  // opponent's turn. Start and Draw run on their own, and so does End while there's nothing to activate.
  nextPhase: {
    check(game, action) {
      if (!["start", "prep1", "battle", "prep2", "end"].includes(game.phase)) return "There's no next phase right now.";
      return null;
    },
    apply(game, action) {
      if (game.phase === "start") {
        startDraw(game);
      } else if (game.phase === "prep1") {
        game.phase = "battle";
        game.log.push(`${game.players[game.activePlayer].name} goes to battle.`);
      } else if (game.phase === "battle") {
        startPrep2(game);
      } else if (game.phase === "prep2") {
        startEnd(game);
      } else {
        passTurn(game);
      }
    },
  },

  // { type: "summon", player, card, slot }: pay a unit's Grade in Energy and put it
  // into an empty Unit Position Slot (0 to 8) during Preparation Phase I.
  summon: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only summon in Preparation Phase I.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "unit") return "Only units can be summoned.";
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= p.ups.length) return "Pick one of your Unit Position Slots.";
      if (p.ups[action.slot]) return "That slot is taken.";
      const pg = playerGrade(game, game.activePlayer);
      if (card.grade > pg + 1) return `Your Player Grade is ${pg}, so you can only bring out units up to Grade ${pg + 1}.`;
      const cost = cardCost(card);
      if (cost > p.energy) return `${card.name} costs ${cost} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      p.ups[action.slot] = { ...card, ...arriving(card) };
      game.log.push(`${p.name} summons ${card.name}.`);
    },
  },

  // { type: "promote", player, card, slot }: play a unit from hand on top of your
  // unit in that slot. It must be exactly one Grade higher, and it costs the
  // difference (1 Energy). The old unit stays stacked underneath in `under`.
  promote: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only promote in Preparation Phase I.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "unit") return "Only units can promote.";
      const base = isSlot(p, action.slot) ? unitAt(p, action.slot) : null;
      if (!base) return "There's no unit there to promote.";
      if (card.grade !== base.grade + 1) return `${card.name} is Grade ${card.grade} and can only promote a Grade ${card.grade - 1} unit.`;
      if (!inPromotionLine(base, card)) return `${card.name} isn't next in ${base.name}'s promotion line.`;
      if (game.promotionsLeft <= 0 && !unlimitedPromotion(game, game.activePlayer, base)) return "You've already promoted this turn.";
      const cost = card.grade - base.grade;
      if (cost > p.energy) return `Promoting costs ${cost} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      const base = p.ups[action.slot];
      spendEnergy(p, card.grade - base.grade);
      // Promotions a Field Spell makes unlimited don't use up the normal one.
      if (!unlimitedPromotion(game, game.activePlayer, base)) game.promotionsLeft -= 1;
      // Equipment stays on through a promotion, unless the new Grade is above its maxGrade
      // (Practice Gear: Grades 1-3), and then it goes to the Grave.
      const { under = [], equipment, artifact, ...baseCard } = base;
      const outgrown = equipment && !fitsGrade(equipment, card);
      const kept = equipment && !outgrown ? equipment : null;
      // Drazel takes the total Defense (Galent the total Attack) when the Equipment stays on and
      // is already working; the Equipment's bonus to that stat then isn't added a second time.
      const working = kept && !kept.readyNextTurn;
      const totals = unitStats(game, game.activePlayer, action.slot);
      const copies = (stat) => working && card[VARIABLE[stat]]?.promoted === "base";
      const attack = arrivingStat(card, "attack", base, copies("attack") ? totals.attack : null);
      const defense = arrivingStat(card, "defense", base, copies("defense") ? totals.defense : null);
      const gear = kept && { ...kept, ...(copies("defense") ? { defenseCopied: true } : {}), ...(copies("attack") ? { attackCopied: true } : {}) };
      p.ups[action.slot] = { ...card, attack, defense, under: [...under, baseCard], ...(gear ? { equipment: gear } : {}), ...(artifact ? { artifact } : {}) };
      game.log.push(`${p.name} promotes ${base.name} to ${card.name}.`);
      if (outgrown) {
        const { readyNextTurn, defenseCopied, attackCopied, ...old } = equipment;
        p.graveyard.push(old);
        game.log.push(`${card.name} has outgrown ${old.name}, and it goes to the Grave.`);
      }
    },
  },

  // { type: "move", player, from, to }: move your unit to another slot for free
  // during Preparation Phase I. If `to` holds a unit, the two swap (placeholder).
  move: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only move units in Preparation Phase I.";
      if (!isSlot(p, action.from) || !unitAt(p, action.from)) return "There's no unit there to move.";
      if (!isSlot(p, action.to)) return "Pick one of your Unit Position Slots.";
      if (p.ups[action.to]?.faceDown) return "There's a set card in that slot."; // placeholder: set cards stay put
      if (action.to === action.from) return "That unit is already there.";
      // Only one of each onePerFormation Artifact (Blinding Beacon) in your Formation, after the move.
      const after = [...p.ups];
      [after[action.to], after[action.from]] = [p.ups[action.from], p.ups[action.to]];
      const ids = anyFormationSlots(p.formationZone).flatMap((s) => (after[s]?.artifact?.onePerFormation ? [catalogueId(after[s].artifact)] : []));
      if (new Set(ids).size < ids.length) return "Only one of each of those Artifacts can be in your Formation.";
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const moving = p.ups[action.from];
      const other = p.ups[action.to];
      p.ups[action.to] = moving;
      p.ups[action.from] = other;
      game.log.push(other ? `${p.name} swaps ${moving.name} and ${other.name}.` : `${p.name} moves ${moving.name}.`);
    },
  },

  // { type: "retire", player, slot }: send your unit (and anything stacked under it)
  // to the Grave during Preparation Phase I, freeing its slot.
  retire: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only retire units in Preparation Phase I.";
      if (!isSlot(p, action.slot) || !unitAt(p, action.slot)) return "There's no unit there to retire.";
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      destroyUnit(game, game.activePlayer, action.slot, `${p.name} retires ${p.ups[action.slot].name} to the Grave.`);
    },
  },

  // { type: "setFormation", player, card }: put a Formation card from hand into the
  // Formation Zone during Preparation Phase I or II, paying its cost (Dyllan). Playing one on
  // top of your current Formation swaps it out, and the old one goes to the Grave.
  setFormation: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (!PREP.includes(game.phase)) return "You can only set a Formation in a Preparation Phase.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "formation") return "That isn't a Formation card.";
      if (cardCost(card) > p.energy) return `${card.name} costs ${cardCost(card)} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      if (p.formationZone) p.graveyard.push(p.formationZone);
      p.formationZone = card;
      delete p.formationOption;
      game.log.push(`${p.name} sets the Formation ${card.name}.`);
    },
  },

  // { type: "specialDraw", player, deck }: answers game.pending { type: "specialDraw" }
  // at the start of Preparation Phase II by drawing the top card of Special Deck 0-3.
  specialDraw: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.pending?.type !== "specialDraw") return "You can only draw from a Special Deck at the start of Preparation Phase II.";
      if (!game.pending.decks.includes(action.deck)) return "Pick one of your Special Decks that still has cards.";
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const d = p.specialDecks[action.deck];
      const card = d.cards.pop();
      p.hand.push(card);
      game.pending = null;
      game.log.push(`${p.name} draws from their ${d.type} Special Deck.`);
    },
  },

  // { type: "equip", player, card, slot }: put an Equipment card from hand onto your
  // unit in that slot during Preparation Phase I or II, paying its cost. The unit must share
  // one of its Signets. Placeholders until Dyllan decides: one Equipment per unit,
  // it stays on through promotion, and goes to the Grave with its unit.
  equip: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (!PREP.includes(game.phase)) return "You can only equip in a Preparation Phase.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "equipment") return "That isn't an Equipment card.";
      const unit = isSlot(p, action.slot) ? unitAt(p, action.slot) : null;
      if (!unit) return "There's no unit there to equip.";
      if (!(card.signets ?? []).some((s) => (unit.signets ?? []).includes(s))) return `${card.name} can only go on a unit with the same Signet.`;
      if (card.onlyOn && !card.onlyOn.includes(catalogueId(unit))) return `${card.name} can't go on ${unit.name}.`;
      if (!fitsGrade(card, unit)) return `${card.name} only goes on Grade ${card.maxGrade} or lower.`;
      if (unit.equipment) return `${unit.name} already has ${unit.equipment.name}.`;
      if (cardCost(card) > p.energy) return `${card.name} costs ${cardCost(card)} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      const unit = p.ups[action.slot];
      if (game.phase === "prep2") {
        // RULES.md: Equipment set in Phase II takes effect at the start of your next Phase I.
        unit.equipment = { ...card, readyNextTurn: true };
        game.log.push(`${p.name} sets ${card.name} on ${unit.name}. It takes effect next turn.`);
      } else {
        unit.equipment = card;
        game.log.push(`${p.name} equips ${unit.name} with ${card.name}.`);
      }
    },
  },

  // { type: "attach", player, card, slot }: attach an Artifact from your hand to your unit in that
  // slot during Preparation Phase I or II, paying its cost (RULES.md, Blinding Beacon).
  // Placeholders (Planner): the unit must share a Signet, one Artifact per unit (alongside its
  // Equipment), it stays on through promotion, goes to the Grave with its unit, and attached in
  // Phase II it works from your next Phase I. `onePerFormation`: only one copy in your Formation.
  attach: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (!PREP.includes(game.phase)) return "You can only attach an Artifact in a Preparation Phase.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "artifact") return "That isn't an Artifact card.";
      const unit = isSlot(p, action.slot) ? unitAt(p, action.slot) : null;
      if (!unit) return "There's no unit there to attach it to.";
      if (!(card.signets ?? []).some((s) => (unit.signets ?? []).includes(s))) return `${card.name} can only go on a unit with the same Signet.`;
      if (unit.artifact) return `${unit.name} already has ${unit.artifact.name}.`;
      if (card.onePerFormation && formationHas(p, catalogueId(card), action.slot)) return `Only one ${card.name} can be in your Formation.`;
      if (cardCost(card) > p.energy) return `${card.name} costs ${cardCost(card)} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      const unit = p.ups[action.slot];
      const later = game.phase === "prep2";
      unit.artifact = { ...card, chargesLeft: card.charges ?? 1, readyOnTurn: 0, ...(later ? { readyNextTurn: true } : {}) };
      game.log.push(`${p.name} attaches ${card.name} to ${unit.name}.${later ? " It takes effect next turn." : ""}`);
    },
  },

  // { type: "setField", player, card }: put a Field Spell from hand into your Field
  // Effect Zone during Preparation Phase I, paying its cost (most cost 1).
  // Placeholder: a new Field Spell replaces the old one, which goes to the Grave
  // along with any units still in it.
  setField: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only play a Field Spell in Preparation Phase I.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "field_spell") return "That isn't a Field Spell.";
      if (cardCost(card) > p.energy) return `${card.name} costs ${cardCost(card)} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      if (p.fieldEffect) {
        const { enrolled = [], ...old } = p.fieldEffect;
        p.graveyard.push(...enrolled.map((e) => e.card), old);
      }
      p.fieldEffect = card.academy ? { ...card, enrolled: [] } : { ...card };
      game.log.push(`${p.name} plays the Field Spell ${card.name}.`);
    },
  },

  // { type: "enroll", player, card }: send a Student of Arms from hand into your
  // Academy during Preparation Phase I. It costs the unit's Grade in Energy, and
  // the Academy holds up to 2 units (RULES.md, Arms Academy).
  enroll: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only enroll units in Preparation Phase I.";
      const field = academyOf(game, game.activePlayer);
      if (!field) return "You need an Academy in your Field Effect Zone.";
      const { academy } = field;
      if (field.enrolled.length >= academy.capacity) return `${field.name} is full (${academy.capacity} units).`;
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (catalogueId(card) !== academy.enroll) return `Only ${academy.enrollName ?? academy.enroll} can enroll in ${field.name}.`;
      if (cardCost(card) > p.energy) return `Enrolling ${card.name} costs ${cardCost(card)} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const field = academyOf(game, game.activePlayer);
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      field.enrolled.push({ card, ready: game.turn + field.academy.turns, due: false });
      game.log.push(`${p.name} enrolls ${card.name} in ${field.name}. It graduates on turn ${game.turn + field.academy.turns}.`);
    },
  },

  // { type: "graduate", player, card, slot }: answer the Academy's pending choice.
  // `card` is the id of a Graduate of Arms from game.pending.cards (hand or deck), `slot`
  // an empty slot from game.pending.slots. It's summoned there for free, the Student
  // goes to the Grave, and the deck is reshuffled if the card came from it.
  // RULES.md: it can attack that turn if it's in your Formation.
  graduate: {
    check(game, action) {
      if (game.pending?.type !== "graduate") return "Nobody is graduating right now.";
      if (!game.pending.cards.some((c) => c.id === action.card)) return "Pick one of the cards on offer.";
      if (!game.pending.slots.includes(action.slot)) return "Pick one of your empty slots.";
      return null;
    },
    apply(game, action) {
      const { player, student, cards } = game.pending;
      game.pending = null;
      const p = game.players[player];
      const field = academyOf(game, player);
      const leaving = field.enrolled.splice(field.enrolled.findIndex((e) => e.card.id === student), 1)[0];
      p.graveyard.push(leaving.card);
      const { from } = cards.find((c) => c.id === action.card);
      const pile = from === "hand" ? p.hand : p.deck;
      const [card] = pile.splice(pile.findIndex((c) => c.id === action.card), 1);
      if (from === "deck") p.deck = shuffle(p.deck, game.rng);
      p.ups[action.slot] = { ...card };
      game.log.push(`${leaving.card.name} graduates from ${field.name}: ${card.name} is summoned from ${p.name}'s ${from}, and ${leaving.card.name} goes to the Grave.`);
      nextGraduation(game);
    },
  },

  // { type: "deckFormation", player, card }: from your own third turn, in Preparation
  // Phase I, if there's no Formation in your hand or Formation Zone, put a Formation
  // from your deck (card = its instance id) into the Formation Zone, paying its normal
  // cost, then shuffle the deck. RULES.md: once per game (player.usedDeckFormation).
  deckFormation: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only do that in Preparation Phase I.";
      if (p.usedDeckFormation) return "You've already taken a Formation from your deck this game.";
      if (game.turn < DECK_FORMATION_TURN) return `You can take a Formation from your deck from turn ${DECK_FORMATION_TURN}.`;
      if (p.formationZone) return "You already have a Formation set.";
      if (p.hand.some((c) => c.type === "formation")) return "You have a Formation in your hand.";
      const card = p.deck.find((c) => c.id === action.card);
      if (!card || card.type !== "formation") return "Pick a Formation from your deck.";
      if (cardCost(card) > p.energy) return `${card.name} costs ${cardCost(card)} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.deck.splice(p.deck.findIndex((c) => c.id === action.card), 1);
      spendEnergy(p, cardCost(card));
      p.deck = shuffle(p.deck, game.rng);
      p.formationZone = card;
      p.usedDeckFormation = true;
      game.log.push(`${p.name} has no Formation and takes ${card.name} from their deck.`);
    },
  },

  // { type: "attack", player }: your Formation attacks in the Battle Phase (RULES.md, Formations).
  // If its Attack is equal to or higher than the opponent's Formation Defense, the
  // opponent takes your Damage Grade minus their Defense Grade in Damage Counters; 10 means they lose.
  // Placeholders until Dyllan decides: once per Battle Phase, an opponent with no
  // complete Formation has 0 Defense and 0 Defense Grade, a failed attack does nothing,
  // and units summoned this turn count toward the Formation.
  attack: {
    check(game, action) {
      if (game.phase !== "battle") return "You can only attack in the Battle Phase.";
      const mine = formationStats(game, game.activePlayer);
      if (!mine) return "You need a Formation set to attack.";
      if (!mine.canAttack) return `${mine.name} can't attack.`;
      if (!mine.complete) return `${mine.name} needs ${mine.missing} more unit${mine.missing === 1 ? "" : "s"} in its slots.`;
      if (game.formationAttacked) return "Your Formation has already attacked this turn.";
      if (action.artifact !== undefined && action.artifact !== null) return artifactProblem(game, game.activePlayer, action.artifact);
      return null;
    },
    apply(game, action) {
      const me = game.activePlayer;
      const p = game.players[me];
      const enemy = game.players[1 - me];
      const slot = action.artifact ?? null;
      if (slot !== null) useArtifact(game, me, slot);
      const { attack, defense, hits, counters, destroys, mine, theirs } = attackPreview(game, me);
      game.formationAttacked = true;
      const against = theirs ? `${theirs.name} (${defense})` : "no active Formation";
      if (!hits) return game.log.push(`${p.name}'s ${mine.name} (${attack}) can't get through ${against}.`);
      enemy.damage += counters;
      game.log.push(`${p.name}'s ${mine.name} (${attack}) breaks through ${against} for ${counters} Damage Counter${counters === 1 ? "" : "s"}. ${enemy.name} has ${enemy.damage}.`);
      if (enemy.damage >= MAX_DAMAGE) return win(game, me, `${enemy.name} reached ${MAX_DAMAGE} Damage Counters.`);
      if (!destroys.length) return;
      // RULES.md (Stand Strong): a set Trap that saves units can answer before anything is destroyed.
      // Placeholder: the Damage Counters above still count; the Trap only saves the unit.
      const traps = savingTraps(enemy);
      if (traps.length) {
        game.pending = { type: "trapResponse", player: 1 - me, slots: traps, targets: destroys };
        return game.log.push(`${enemy.name} can respond with a set card.`);
      }
      resolveLoss(game, 1 - me, destroys);
    },
  },

  // { type: "trapResponse", player, slot }: answers game.pending { type: "trapResponse" } on the
  // opponent's attack. slot is one of pending.slots to activate that Trap, or null to pass.
  // Stand Strong (response "saveUnit") goes to the Grave instead of the unit in pending.targets.
  trapResponse: {
    check(game, action) {
      if (game.pending?.type !== "trapResponse") return "There's nothing to respond to right now.";
      if (action.slot !== null && !game.pending.slots.includes(action.slot)) return "Pick one of your set cards that can respond, or pass.";
      return null;
    },
    apply(game, action) {
      const { player, targets } = game.pending;
      game.pending = null;
      const p = game.players[player];
      if (action.slot === null) {
        game.log.push(`${p.name} doesn't respond.`);
        return resolveLoss(game, player, targets);
      }
      const { faceDown, setTurn, ...trap } = p.ups[action.slot];
      p.ups[action.slot] = null;
      p.graveyard.push(trap);
      const saved = targets.length === 1 ? `${p.ups[targets[0]].name} is saved` : "no unit is destroyed";
      game.log.push(`${p.name} activates ${trap.name}: it goes to the Grave instead, and ${saved}.`);
    },
  },

  // { type: "setTrap", player, card, slot }: set a Trap or a Spell from your hand face-down in an
  // empty Unit Position Slot during Preparation Phase I or II. Basic rule (Dyllan): Traps and Spells
  // go in available slots unless the card says otherwise; Field Spells keep their own zone.
  // Placeholders: the cost is paid when it's set, a set card stays where it is, and a set Spell
  // can't be activated yet (no Spell effects exist).
  setTrap: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (!PREP.includes(game.phase)) return "You can only set a card in a Preparation Phase.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "trap" && card.type !== "spell") return "Only Traps and Spells are set in a slot.";
      if (!isSlot(p, action.slot)) return "Pick one of your Unit Position Slots.";
      if (p.ups[action.slot]) return "That slot is taken.";
      if (cardCost(card) > p.energy) return `${card.name} costs ${cardCost(card)} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      p.ups[action.slot] = { ...card, faceDown: true, setTurn: game.turn };
      game.log.push(`${p.name} sets a card face-down.`);
    },
  },

  // { type: "chooseLoss", player, slot }: the defender picks which of their tied
  // lowest-Grade units goes to the Grave. Only allowed while game.pending asks for it.
  // { type: "chooseFormation", player, option }: pick which of your Formation's slotOptions it
  // uses (Line Defense: which full row), in either Preparation Phase, for free (RULES.md a2392f0).
  chooseFormation: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (!PREP.includes(game.phase)) return "You can only choose how your Formation activates in a Preparation Phase.";
      if (!p.formationZone?.slotOptions) return "Your Formation doesn't have a choice to make.";
      if (!fullFormationOptions(game, game.activePlayer).includes(action.option)) return "Those slots aren't all filled.";
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      p.formationOption = action.option;
      game.log.push(`${p.name}'s ${p.formationZone.name} uses slots ${p.formationZone.slotOptions[action.option].join(", ")}.`);
    },
  },

  // { type: "cast", player, card }: cast a Spell straight from your hand in Preparation Phase I
  // or II, paying its cost. It takes effect at once and goes to the Grave (RULES.md, Fire Arrow).
  cast: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (!PREP.includes(game.phase)) return "You can only cast a Spell in a Preparation Phase.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "spell") return "That isn't a Spell card.";
      if (!spellDoes(card)) return `${card.name} doesn't do anything yet.`;
      if (cardCost(card) > p.energy) return `${card.name} costs ${cardCost(card)} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      game.log.push(`${p.name} casts ${card.name}.`);
      resolveSpell(game, game.activePlayer, card);
    },
  },

  // { type: "activateSet", player, slot }: activate your set Spell in that slot during your own
  // Start, Preparation I, Battle, Preparation II or End Phase. It was paid for when it was set.
  activateSet: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      const c = isSlot(p, action.slot) ? p.ups[action.slot] : null;
      if (!c?.faceDown) return "There's no set card there.";
      if (c.type !== "spell" || !spellDoes(c)) return "That set card can't be activated now.";
      if (!SPELL_PHASES.includes(game.phase)) return "You can't activate it in this phase.";
      if (c.setTurn === game.turn) return `${c.name} was set this turn, so it's ready next turn.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const card = p.ups[action.slot];
      p.ups[action.slot] = null;
      game.log.push(`${p.name} activates ${card.name}.`);
      resolveSpell(game, game.activePlayer, card);
      // A Start or End Phase that was waiting moves on once nothing is left to activate.
      if (game.winner === null && !hasSetCardsToActivate(game, game.activePlayer)) {
        if (game.phase === "start") startDraw(game);
        else if (game.phase === "end") passTurn(game);
      }
    },
  },

  chooseLoss: {
    check(game, action) {
      if (game.pending?.type !== "chooseLoss") return "There's nothing to choose right now.";
      if (!game.pending.slots.includes(action.slot)) return "Pick one of the highlighted units.";
      return null;
    },
    apply(game, action) {
      const { player } = game.pending;
      game.pending = null;
      destroyUnit(game, player, action.slot);
    }
  },
};

// Sets up a new game: shuffle both decks, flip the coin, deal the opening
// hands, then start the first turn (which runs its Draw Phase).
// Pass startingPlayer to skip the coin flip (handy for the tutorial and tests).
// specialDecks (optional): per player, up to four { type, cards } (or null); each is shuffled.
export function newGame({ seed = Date.now(), decks, specialDecks = [], names = ["Player 1", "Player 2"], startingPlayer }) {
  const rng = createRng(seed);
  const players = names.map((name, i) => {
    const special = (specialDecks[i] ?? []).map((d) => (d ? { type: d.type, cards: shuffle(d.cards ?? [], rng) } : null));
    return createPlayer(name, shuffle(decks[i] ?? [], rng), special);
  });
  const game = createGame({ seed, players });
  game.rng = rng; // kept on the game so every later random event follows the seed
  game.log.push(`New game (seed ${seed}).`);

  const first = startingPlayer ?? (rng() < 0.5 ? 0 : 1);
  game.startingPlayer = first;
  game.activePlayer = first;
  game.log.push(`${players[first].name} won the coin flip and goes first.`);

  for (let i = 0; i < STARTING_HAND.first; i++) drawCard(game, first);
  for (let i = 0; i < STARTING_HAND.second; i++) drawCard(game, 1 - first);

  startTurn(game);
  updatePlayerGrades(game);
  return game;
}

// Returns why an action is not allowed, or null if it is.
export function checkAction(game, action) {
  if (game.winner !== null) return "The game is over.";
  const rule = ACTIONS[action?.type];
  if (!rule) return `Unknown action "${action?.type}".`;
  // While a choice is pending (game.pending), only that player's answer is allowed.
  if (game.pending) {
    const who = game.players[game.pending.player].name;
    if (action.type !== game.pending.type) {
      const waiting = { graduate: "choose who comes out of the Academy", specialDraw: "pick a Special Deck to draw from", chooseLoss: "choose which unit goes to the Grave", trapResponse: "decide whether to respond" };
      return `${who} has to ${waiting[game.pending.type]} first.`;
    }
    if (action.player !== undefined && action.player !== game.pending.player) return `It's ${who}'s choice.`;
    return rule.check(game, action);
  }
  if (action.player !== undefined && action.player !== game.activePlayer) return "It's not your turn.";
  return rule.check(game, action);
}

// Applies an action if it is allowed. Returns { ok: true } or { ok: false, reason }.
export function applyAction(game, action) {
  const reason = checkAction(game, action);
  if (reason) return { ok: false, reason };
  ACTIONS[action.type].apply(game, action);
  updatePlayerGrades(game);
  return { ok: true };
}

// Player Grade (RULES.md 163018e): the highest unit Grade you've had on the field this game,
// starting at 0. It never drops, even when that unit is destroyed. You can't bring out a unit
// more than one Grade above it, however cheap it is. Placeholder: Arms Academy's Graduate ignores it.
// Stored as p.playerGrade after every action, for the board.
export function playerGrade(game, playerIndex) {
  const p = game.players[playerIndex];
  return Math.max(p.playerGrade ?? 0, ...p.ups.filter((u) => u && !u.faceDown).map((u) => u.grade ?? 0));
}
function updatePlayerGrades(game) {
  game.players.forEach((p, i) => (p.playerGrade = playerGrade(game, i)));
}

// Every action the active player could take right now. The bots and AI pick from this.
export function legalActions(game) {
  if (game.pending?.type === "chooseLoss") {
    const { player, slots } = game.pending;
    return slots.map((slot) => ({ type: "chooseLoss", player, slot }));
  }
  if (game.pending?.type === "graduate") {
    const { player, cards, slots } = game.pending;
    return cards.flatMap((c) => slots.map((slot) => ({ type: "graduate", player, card: c.id, slot })));
  }
  if (game.pending?.type === "specialDraw") {
    const { player, decks } = game.pending;
    return decks.map((deck) => ({ type: "specialDraw", player, deck }));
  }
  if (game.pending?.type === "trapResponse") {
    const { player, slots } = game.pending;
    return [...slots, null].map((slot) => ({ type: "trapResponse", player, slot }));
  }
  const player = game.activePlayer;
  const p = game.players[player];
  const candidates = [{ type: "endTurn", player }, { type: "nextPhase", player }];
  p.hand.forEach((card, i) => {
    candidates.push({ type: "setFormation", player, card: i });
    candidates.push({ type: "setField", player, card: i });
    candidates.push({ type: "enroll", player, card: i });
    candidates.push({ type: "cast", player, card: i });
    p.ups.forEach((_, slot) => {
      candidates.push({ type: "summon", player, card: i, slot });
      candidates.push({ type: "promote", player, card: i, slot });
      candidates.push({ type: "equip", player, card: i, slot });
      candidates.push({ type: "setTrap", player, card: i, slot });
      candidates.push({ type: "attach", player, card: i, slot });
    });
  });
  candidates.push({ type: "attack", player });
  (p.formationZone?.slotOptions ?? []).forEach((_, option) => candidates.push({ type: "chooseFormation", player, option }));
  p.ups.forEach((c, slot) => c?.faceDown && candidates.push({ type: "activateSet", player, slot }));
  p.ups.forEach((u, slot) => u?.artifact?.activate && candidates.push({ type: "attack", player, artifact: slot }));
  const seenFormations = new Set();
  for (const c of p.deck) {
    if (c.type !== "formation" || seenFormations.has(c.cardId ?? c.id)) continue; // one choice per Formation name
    seenFormations.add(c.cardId ?? c.id);
    candidates.push({ type: "deckFormation", player, card: c.id });
  }
  p.ups.forEach((_, from) => {
    candidates.push({ type: "retire", player, slot: from });
    p.ups.forEach((_, to) => candidates.push({ type: "move", player, from, to }));
  });
  return candidates.filter((a) => checkAction(game, a) === null);
}
