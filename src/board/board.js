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

// Player stats panel that sits beside each hand: Name, Defense Points, Energy.
function buildStats(cls) {
  const el = document.createElement("div");
  el.className = `stats ${cls}`;
  el.innerHTML = `
    <div class="stats-name"></div>
    <div class="stat stat-dp"><span class="stat-icon" aria-hidden="true">&#x1F6E1;</span><span class="stat-label">Defense</span><span class="stat-value"></span></div>
    <div class="stat stat-energy"><span class="stat-icon" aria-hidden="true">&#x26A1;</span><span class="stat-label">Energy</span><span class="stat-value"></span></div>
    <div class="energy-pips">${'<span class="pip"></span>'.repeat(ENERGY_CAP)}</div>`;
  return el;
}

function renderStats(el, p, active) {
  el.querySelector(".stats-name").textContent = p.name;
  // The engine doesn't track these yet (starting values come from RULES.md), so show a dash.
  el.querySelector(".stat-dp .stat-value").textContent = p.defense ?? "–";
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

const PHASE_NAMES = { setup: "Setup", draw: "Draw Phase", prep1: "Preparation Phase I" };

// Draws everything the state holds: hands, pile counts, and the cards in the
// Unit Position Slots, Special Deck Zones, Formation Zone and Field Effect Zone.
export function renderBoard(game, viewer = 0) {
  game.players.forEach((p, owner) => {
    const side = owner === viewer ? 0 : 1;
    renderStats(els.stats[side], p, game.activePlayer === owner);
    p.ups.forEach((card, i) => fillSlot(getSlot(side, "ups", i), card));
    p.specialZones.forEach((card, i) => fillSlot(getSlot(side, "sdz", i), card));
    fillSlot(getSlot(side, "fez"), p.fieldEffect);
    fillSlot(getSlot(side, "formation"), p.formationZone ?? null);
    const hand = els.hands[owner === viewer ? 0 : 1];
    hand.innerHTML = "";
    p.hand.forEach((card) => hand.append(cardEl(card, owner === viewer)));
    els.counts[slotKey(owner === viewer ? 0 : 1, "draw", 0)].textContent = p.deck.length;
    els.counts[slotKey(owner === viewer ? 0 : 1, "grave", 0)].textContent = p.graveyard.length;
  });
  const banner = document.querySelector("#turn-banner");
  const who = game.activePlayer === viewer ? "Your turn" : "Opponent's turn";
  const phase = PHASE_NAMES[game.phase] ?? game.phase;
  banner.textContent = game.turn > 0 ? `Turn ${game.turn} · ${who} · ${phase}` : who;
  banner.classList.toggle("is-opponent", game.activePlayer !== viewer);
}
