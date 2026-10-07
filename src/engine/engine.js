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
  const { under = [], equipment = null, ...card } = unit;
  p.ups[slot] = null;
  const { readyNextTurn, ...gear } = equipment ?? {};
  p.graveyard.push(...under, card, ...(equipment ? [gear] : []));
  game.log.push(message ?? `${unit.name} goes to the Grave.`);
  return unit;
}

const isSlot = (p, slot) => Number.isInteger(slot) && slot >= 0 && slot < p.ups.length;

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
  const unit = game.players[playerIndex].ups[slot];
  if (!unit) return null;
  // Equipment set in Preparation Phase II (equipment.readyNextTurn) does nothing until your next Phase I.
  const boost = (!unit.equipment?.readyNextTurn && unit.equipment?.boost) || {};
  return {
    attack: Math.floor((unit.attack * (100 + (boost.attackPercent ?? 0))) / 100) + (boost.attack ?? 0),
    defense: Math.floor((unit.defense * (100 + (boost.defensePercent ?? 0))) / 100) + (boost.defense ?? 0),
  };
}

// A player's set Formation, added up (RULES.md, Formations). Only the units in
// the Formation's own slots count. Frontal Assault ("sum") adds their Attack and
// Defense. Returns null if no Formation is set.
export function formationStats(game, playerIndex) {
  const p = game.players[playerIndex];
  const f = p.formationZone;
  if (!f) return null;
  // Each unit's Equipment boost is applied and rounded down first, then the Formation adds them up.
  const units = f.slots.filter((slot) => p.ups[slot]).map((slot) => unitStats(game, playerIndex, slot));
  const missing = f.slots.length - units.length;
  let attack = units.reduce((total, u) => total + u.attack, 0);
  let defense = units.reduce((total, u) => total + u.defense, 0);
  // "scaled" (Vanguard Charge): Attack times attackMultiplier, Defense divided by
  // defenseDivisor, rounded down (placeholder until Dyllan confirms rounding).
  if (f.combine === "scaled") {
    attack = Math.floor(attack * (f.attackMultiplier ?? 1));
    defense = Math.floor(defense / (f.defenseDivisor ?? 1));
  }
  return {
    name: f.name, attack, defense, missing, complete: missing === 0,
    damageGrade: f.damageGrade ?? 1, // Damage Counters dealt when its attack lands
    defenseGrade: f.defenseGrade ?? 0, // taken off an incoming attack's Damage Grade
  };
}

// What the active player's Formation attack would do right now, so the UI can
// show it before the click and the attack itself uses exactly the same numbers.
// RULES.md: an inactive Formation (any slot empty) counts as no Formation.
// - Against an active Formation: it lands if Attack >= their Defense, deals
//   Damage Grade minus their Defense Grade (at least 1), and destroys their
//   lowest-Grade unit in the Formation. `destroys` lists the tied candidates.
// - Against no active Formation: it always lands, deals exactly 1 counter, and destroys nothing.
export function attackPreview(game, playerIndex = game.activePlayer) {
  const mine = formationStats(game, playerIndex);
  const theirs = formationStats(game, 1 - playerIndex);
  const guarded = !!theirs?.complete;
  const attack = mine?.complete ? mine.attack : 0;
  const defense = guarded ? theirs.defense : 0;
  const hits = !!mine?.complete && attack >= defense;
  let counters = 0;
  let destroys = [];
  if (hits && !guarded) counters = 1;
  if (hits && guarded) {
    counters = Math.max(MIN_COUNTERS, mine.damageGrade - theirs.defenseGrade);
    destroys = lowestGradeSlots(game, 1 - playerIndex);
  }
  return { attack, defense, hits, counters, destroys, mine, theirs: guarded ? theirs : null };
}

// The Formation slots holding the player's lowest-Grade unit(s).
export function lowestGradeSlots(game, playerIndex) {
  const p = game.players[playerIndex];
  const slots = (p.formationZone?.slots ?? []).filter((slot) => p.ups[slot]);
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

// The Defense a unit has when it arrives on the field. Most use their printed number. A unit
// with variableDefense (Drazel) has variableDefense.summoned when summoned, and copies the
// printed Defense of the unit it promotes (not Equipment bonuses; those stay on top).
function arrivingDefense(card, base = null) {
  const v = card.variableDefense;
  if (!v) return card.defense;
  return base && v.promoted === "base" ? base.defense : v.summoned;
}
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
  for (const student of academyOf(game, game.activePlayer)?.enrolled ?? []) student.due = student.ready <= game.turn;
  nextGraduation(game);
}

// Whether a player has set Spells or Traps they could activate right now (Start and
// End Phases, and later on the opponent's turn). There are none yet; when there are,
// the Start and End Phases will wait for that player instead of passing on their own.
function hasSetCardsToActivate(game, playerIndex) {
  return false;
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
      const cost = cardCost(card);
      if (cost > p.energy) return `${card.name} costs ${cost} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, cardCost(card));
      p.ups[action.slot] = { ...card, defense: arrivingDefense(card) };
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
      const base = p.ups[action.slot];
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
      // Placeholder: Equipment stays on the unit through a promotion.
      const { under = [], equipment, ...baseCard } = base;
      p.ups[action.slot] = { ...card, defense: arrivingDefense(card, base), under: [...under, baseCard], ...(equipment ? { equipment } : {}) };
      game.log.push(`${p.name} promotes ${base.name} to ${card.name}.`);
    },
  },

  // { type: "move", player, from, to }: move your unit to another slot for free
  // during Preparation Phase I. If `to` holds a unit, the two swap (placeholder).
  move: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only move units in Preparation Phase I.";
      if (!isSlot(p, action.from) || !p.ups[action.from]) return "There's no unit there to move.";
      if (!isSlot(p, action.to)) return "Pick one of your Unit Position Slots.";
      if (action.to === action.from) return "That unit is already there.";
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
      if (!isSlot(p, action.slot) || !p.ups[action.slot]) return "There's no unit there to retire.";
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      destroyUnit(game, game.activePlayer, action.slot, `${p.name} retires ${p.ups[action.slot].name} to the Grave.`);
    },
  },

  // { type: "setFormation", player, card }: put a Formation card from hand into the
  // Formation Zone during Preparation Phase I. Placeholder until Dyllan decides:
  // it costs the card's cost (0 for now), and a new one replaces the old, which goes to the Grave.
  setFormation: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only set a Formation in Preparation Phase I.";
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
      const unit = isSlot(p, action.slot) ? p.ups[action.slot] : null;
      if (!unit) return "There's no unit there to equip.";
      if (!(card.signets ?? []).some((s) => (unit.signets ?? []).includes(s))) return `${card.name} can only go on a unit with the same Signet.`;
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
      if (!mine.complete) return `${mine.name} needs ${mine.missing} more unit${mine.missing === 1 ? "" : "s"} in its slots.`;
      if (game.formationAttacked) return "Your Formation has already attacked this turn.";
      return null;
    },
    apply(game, action) {
      const me = game.activePlayer;
      const p = game.players[me];
      const enemy = game.players[1 - me];
      const { attack, defense, hits, counters, destroys, mine, theirs } = attackPreview(game, me);
      game.formationAttacked = true;
      const against = theirs ? `${theirs.name} (${defense})` : "no active Formation";
      if (!hits) return game.log.push(`${p.name}'s ${mine.name} (${attack}) can't get through ${against}.`);
      enemy.damage += counters;
      game.log.push(`${p.name}'s ${mine.name} (${attack}) breaks through ${against} for ${counters} Damage Counter${counters === 1 ? "" : "s"}. ${enemy.name} has ${enemy.damage}.`);
      if (enemy.damage >= MAX_DAMAGE) return win(game, me, `${enemy.name} reached ${MAX_DAMAGE} Damage Counters.`);
      if (destroys.length === 1) destroyUnit(game, 1 - me, destroys[0]);
      // Placeholder: when lowest Grades tie, the defender picks which unit goes.
      if (destroys.length > 1) {
        game.pending = { type: "chooseLoss", player: 1 - me, slots: destroys };
        game.log.push(`${enemy.name} chooses which unit goes to the Grave.`);
      }
    },
  },

  // { type: "chooseLoss", player, slot }: the defender picks which of their tied
  // lowest-Grade units goes to the Grave. Only allowed while game.pending asks for it.
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
      const waiting = { graduate: "choose who comes out of the Academy", specialDraw: "pick a Special Deck to draw from", chooseLoss: "choose which unit goes to the Grave" };
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
  return { ok: true };
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
  const player = game.activePlayer;
  const p = game.players[player];
  const candidates = [{ type: "endTurn", player }, { type: "nextPhase", player }];
  p.hand.forEach((card, i) => {
    candidates.push({ type: "setFormation", player, card: i });
    candidates.push({ type: "setField", player, card: i });
    candidates.push({ type: "enroll", player, card: i });
    p.ups.forEach((_, slot) => {
      candidates.push({ type: "summon", player, card: i, slot });
      candidates.push({ type: "promote", player, card: i, slot });
      candidates.push({ type: "equip", player, card: i, slot });
    });
  });
  candidates.push({ type: "attack", player });
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
