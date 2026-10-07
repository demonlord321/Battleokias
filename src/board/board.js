// Builds the board DOM once, then renderBoard() fills it from the game state.
// Every slot has data-owner (0 = you, 1 = opponent), data-zone and data-index,
// so the engine, the tutorial overlay and click handlers can all find it.

import { PLAYER_SLOTS, rotate } from "./layout.js";
import { renderCard } from "./card.js";

const els = { slots: {}, hands: [], counts: {} };

function slotKey(owner, zone, index) {
  return `${owner}:${zone}:${index}`;
}

export function getSlot(owner, zone, index = 0) {
  return els.slots[slotKey(owner, zone, index)];
}

function buildHalf(owner) {
  const half = document.createElement("div");
  half.className = `half ${owner === 0 ? "half-player" : "half-opponent"}`;
  for (const base of PLAYER_SLOTS) {
    const s = owner === 0 ? base : rotate(base);
    const el = document.createElement("div");
    el.className = `slot slot-${s.zone}`;
    el.style.gridRow = s.row;
    el.style.gridColumn = s.col;
    el.dataset.owner = owner;
    el.dataset.zone = s.zone;
    el.dataset.index = s.index;
    if (s.label) {
      const label = document.createElement("span");
      label.className = "slot-label";
      label.textContent = s.label;
      el.append(label);
    }
    if (s.zone === "draw" || s.zone === "grave") {
      const count = document.createElement("span");
      count.className = "pile-count";
      el.append(count);
      els.counts[slotKey(owner, s.zone, 0)] = count;
    }
    els.slots[slotKey(owner, s.zone, s.index)] = el;
    half.append(el);
  }
  return half;
}

export function buildBoard(container) {
  container.innerHTML = "";
  container.classList.add("board-ready");

  const oppHand = document.createElement("div");
  oppHand.className = "hand hand-opponent";
  const playerHand = document.createElement("div");
  playerHand.className = "hand hand-player";
  els.hands = [playerHand, oppHand];

  const centre = document.createElement("div");
  centre.className = "centre-line";
  centre.innerHTML = `<span class="turn-banner" id="turn-banner"></span>`;

  const table = document.createElement("div");
  table.className = "table";
  table.append(buildHalf(1), centre, buildHalf(0));

  els.stats = [buildStats("stats-player"), buildStats("stats-opponent")];

  container.append(oppHand, table, playerHand, ...els.stats);

  container.addEventListener("click", (e) => {
    const handCard = e.target.closest(".hand-player .card");
    if (handCard) {
      container.dispatchEvent(new CustomEvent("handclick", { detail: { index: +handCard.dataset.handIndex } }));
      return;
    }
    const slot = e.target.closest(".slot");
    if (!slot) return;
    container.dispatchEvent(
      new CustomEvent("slotclick", {
        detail: { owner: +slot.dataset.owner, zone: slot.dataset.zone, index: +slot.dataset.index },
      }),
    );
  });
}

const ENERGY_CAP = 10; // RULES.md: max Energy grows by 1 a turn up to 10
const DAMAGE_LIMIT = 10; // RULES.md: 10 Damage Counters and you lose

// Player stats panel that sits beside each hand: Name, Damage Counters, Energy.
function buildStats(cls) {
  const el = document.createElement("div");
  el.className = `stats ${cls}`;
  el.innerHTML = `
    <div class="stats-name"></div>
    <div class="stat stat-dmg"><span class="stat-icon" aria-hidden="true">&#x1F494;</span><span class="stat-label">Damage</span><span class="stat-value"></span></div>
    <div class="damage-pips" title="Damage Counters: 10 and you lose">${'<span class="dpip"></span>'.repeat(DAMAGE_LIMIT)}</div>
    <div class="stat stat-energy"><span class="stat-icon" aria-hidden="true">&#x26A1;</span><span class="stat-label">Energy</span><span class="stat-value"></span></div>
    <div class="energy-pips">${'<span class="pip"></span>'.repeat(ENERGY_CAP)}</div>`;
  return el;
}

function renderStats(el, p, active) {
  el.querySelector(".stats-name").textContent = p.name;
  // Damage Counters (RULES.md): start at 0, lose at 10. Reads p.damage.
  const dmg = p.damage ?? 0;
  el.querySelector(".stat-dmg .stat-value").textContent = `${dmg} / ${DAMAGE_LIMIT}`;
  el.querySelectorAll(".dpip").forEach((pip, i) => pip.classList.toggle("is-hit", i < dmg));
  el.classList.toggle("is-danger", dmg >= DAMAGE_LIMIT - 2);
  // Energy shows as "current / max", plus 10 pips: lit = available, outlined = spent
  // this turn (refills next turn), dark = not unlocked yet.
  const hasMax = typeof p.maxEnergy === "number";
  el.querySelector(".stat-energy .stat-value").textContent =
    p.energy === undefined ? "–" : hasMax ? `${p.energy} / ${p.maxEnergy}` : p.energy;
  el.querySelectorAll(".pip").forEach((pip, i) => {
    pip.className = "pip" + (i < (p.energy ?? 0) ? " is-full" : hasMax && i < p.maxEnergy ? " is-spent" : "");
  });
  el.classList.toggle("is-active", active);
}

const cardEl = (card, faceUp) => renderCard(card, faceUp);

// Puts a card (or nothing) into a slot, keeping the slot's label.
function fillSlot(slot, card) {
  slot.querySelector(".card")?.remove();
  slot.classList.toggle("is-filled", !!card);
  if (card) slot.prepend(cardEl(card, !card.faceDown));
}

// Formation Zone: outline the Unit Position Slots the set Formation draws from, and show
// its live total (RULES.md: Frontal Assault sums Attack and Defense of the units in its slots;
// units elsewhere don't count). Until every slot is filled it shows how many are still missing.
// stats: the engine's formationStats for this player (passed in by the screen), so scaled
// Formations like Vanguard Charge show their real totals; falls back to a plain sum.
function renderFormation(side, p, ui = {}, stats = null) {
  const f = p.formationZone ?? null;
  const slots = f && Array.isArray(f.slots) ? f.slots : [];
  p.ups.forEach((_, i) => {
    const el = getSlot(side, "ups", i);
    el.classList.toggle("in-formation", slots.includes(i));
    el.classList.toggle("formation-gap", slots.includes(i) && !p.ups[i]);
  });
  const zone = getSlot(side, "formation");
  zone.classList.toggle("is-legal", side === 0 && !!ui.formationReady);
  zone.classList.toggle("can-attack", side === 0 && !!ui.formationCanAttack);
  zone.querySelector(".formation-total")?.remove();
  zone.classList.remove("is-inactive");
  if (!slots.length) return;
  const units = slots.map((i) => p.ups[i]).filter(Boolean);
  const missing = slots.length - units.length;
  const atk = stats?.attack ?? units.reduce((n, u) => n + (u.attack ?? 0), 0);
  const def = stats?.defense ?? units.reduce((n, u) => n + (u.defense ?? 0), 0);
  const total = document.createElement("div");
  // RULES.md: a Formation with an empty slot is inactive until the slot is filled again.
  zone.classList.toggle("is-inactive", missing > 0);
  total.className = "formation-total" + (missing ? " is-incomplete" : " is-ready");
  total.innerHTML = missing
    ? `<span>Inactive · ${missing} slot${missing > 1 ? "s" : ""} empty</span>`
    : `<span class="stat-atk">&#x2694; ${atk}</span><span class="stat-def">&#x1F6E1; ${def}</span>`;
  zone.append(total);
}

// Special Deck Zone: a face-down pile labelled with its card type and how many are left.
// Glows when it's one you can draw from at the start of Preparation Phase II.
const TYPE_LABELS = { equipment: "Equip", artifact: "Artifact", monster: "Monster", item: "Item", spell: "Spell", trap: "Trap" };
function renderSpecialPile(slot, deck, canDraw) {
  fillSlot(slot, null);
  slot.querySelector(".pile-count")?.remove();
  const label = slot.querySelector(".slot-label");
  const n = deck?.cards?.length ?? 0;
  slot.classList.toggle("has-pile", n > 0);
  slot.classList.toggle("can-draw", canDraw);
  if (label) label.textContent = deck ? TYPE_LABELS[deck.type] ?? deck.type : "Special";
  slot.title = deck ? `${TYPE_LABELS[deck.type] ?? deck.type} Special Deck: ${n} card${n === 1 ? "" : "s"} left` : "Empty Special Deck Zone";
  if (!deck) return;
  const count = document.createElement("span");
  count.className = "pile-count";
  count.textContent = n;
  slot.append(count);
}

// Equipment sits tucked under its unit: a small tag with its name along the bottom edge.
function renderEquipment(slot, card) {
  slot.querySelector(".equip-tag")?.remove();
  const eq = card?.equipment;
  if (!eq) return;
  const tag = document.createElement("div");
  tag.className = "equip-tag";
  tag.title = `${eq.name}: ${eq.text ?? ""}`;
  tag.textContent = `\u2692 ${eq.name}`;
  slot.append(tag);
}

// Field Effect Zone: glows when the selected hand card can go there (a Field Spell, or a
// unit to enroll), and lists Academy students with how many turns until they graduate.
function renderAcademy(side, p, game, ui) {
  const zone = getSlot(side, "fez");
  zone.classList.toggle("is-legal", side === 0 && !!ui.fezReady);
  zone.querySelector(".academy-list")?.remove();
  const enrolled = p.fieldEffect?.enrolled ?? [];
  if (!enrolled.length) return;
  const list = document.createElement("div");
  list.className = "academy-list";
  list.innerHTML = enrolled
    .map((e) => {
      const left = e.ready - game.turn;
      const when = left <= 0 ? "ready" : `${left} turn${left > 1 ? "s" : ""}`;
      return `<div class="academy-student${left <= 0 ? " is-ready" : ""}" title="${e.card.name}: graduates on turn ${e.ready}">&#x1F393; ${e.card.name} · ${when}</div>`;
    })
    .join("");
  zone.append(list);
}

export const PHASE_NAMES = {
  setup: "Setup",
  draw: "Draw Phase",
  prep1: "Preparation Phase I",
  battle: "Battle Phase",
  prep2: "Preparation Phase II",
  end: "End Phase",
};

// Draws everything the state holds: hands, pile counts, and the cards in the
// Unit Position Slots, Special Deck Zones, Formation Zone and Field Effect Zone.
// viewer is whose side is at the bottom (hot-seat flips it each turn).
// ui carries what the screen wants highlighted:
//   selectedHand: index of the hand card picked to summon
//   legalSlots:   Set of ups indexes (viewer's side) the selected card can go to
//   attackers:    optional Set of ups indexes that can attack (unused since Formation attacks)
//   formationCanAttack: the viewer's Formation can attack now (Formation Zone glows)
//   targets:      Set of ups indexes (other side) the attack would destroy
//   lossSlots:    Set of ups indexes (viewer's side) the defender can choose to lose
//   promoteSlots: Set of ups indexes (viewer's side) the selected card can promote
export function renderBoard(game, viewer = 0, ui = {}) {
  game.players.forEach((p, owner) => {
    const side = owner === viewer ? 0 : 1;
    renderStats(els.stats[side], p, game.activePlayer === owner);
    p.ups.forEach((card, i) => {
      const slot = getSlot(side, "ups", i);
      // Show the unit's live stats (after Equipment) and mark which ones changed.
      const st = card && ui.unitStats?.[owner]?.[i];
      const mod = (now, base) => (now == null || now === base ? null : now > base ? "up" : "down");
      fillSlot(slot, st ? { ...card, attack: st.attack ?? card.attack, defense: st.defense ?? card.defense,
        statMods: { attack: mod(st.attack, card.attack), defense: mod(st.defense, card.defense) },
        baseStats: { attack: card.attack, defense: card.defense } } : card);
      renderEquipment(slot, card);
      slot.classList.toggle("can-equip", side === 0 && !!ui.equipSlots?.has(i));
      slot.classList.toggle("is-legal", side === 0 && !!ui.legalSlots?.has(i));
      slot.classList.toggle("can-promote", side === 0 && !!ui.promoteSlots?.has(i));
      // Promoted units keep the card(s) underneath; show how many.
      const under = card?.under?.length ?? card?.stack?.length ?? 0;
      if (under) slot.dataset.stack = under;
      else delete slot.dataset.stack;
      slot.classList.toggle("can-attack", side === 0 && !!ui.attackers?.has(i));
      slot.classList.toggle("is-target", side === 1 && !!ui.targets?.has(i));
      slot.classList.toggle("choose-loss", side === 0 && !!ui.lossSlots?.has(i));
      slot.classList.toggle("is-exhausted", !!card && side === 0 && ui.phase === "battle" && !!ui.attackers && !ui.attackers.has(i));
    });
    renderFormation(side, p, ui, ui.formationStats?.[owner]);
    p.specialDecks.forEach((deck, i) => renderSpecialPile(getSlot(side, "sdz", i), deck, side === 0 && !!ui.drawDecks?.has(i)));
    fillSlot(getSlot(side, "fez"), p.fieldEffect);
    renderAcademy(side, p, game, ui);
    fillSlot(getSlot(side, "formation"), p.formationZone ?? null);
    const hand = els.hands[side];
    hand.innerHTML = "";
    p.hand.forEach((card, i) => {
      const el = cardEl(card, side === 0);
      if (side === 0) {
        el.dataset.handIndex = i;
        el.classList.toggle("is-selected", ui.selectedHand === i);
        el.classList.toggle("is-playable", !!ui.playable?.has(i));
      }
      hand.append(el);
    });
    els.counts[slotKey(side, "draw", 0)].textContent = p.deck.length;
    els.counts[slotKey(side, "grave", 0)].textContent = p.graveyard.length;
    // The Grave shows its top card face up (the last unit destroyed or card discarded).
    fillSlot(getSlot(side, "grave"), p.graveyard.at(-1) ?? null);
  });
  const banner = document.querySelector("#turn-banner");
  const active = game.players[game.activePlayer];
  const phase = PHASE_NAMES[game.phase] ?? game.phase;
  banner.textContent = game.turn > 0 ? `Turn ${game.turn} · ${active.name} · ${phase}` : active.name;
  banner.classList.toggle("is-opponent", game.activePlayer !== viewer);
}
