// Builds the board DOM once, then renderBoard() fills it from the game state.
// Every slot has data-owner (0 = you, 1 = opponent), data-zone and data-index,
// so the engine, the tutorial overlay and click handlers can all find it.

import { PLAYER_SLOTS, rotate } from "./layout.js";

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

  container.append(oppHand, table, playerHand);

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

function cardEl(card, faceUp) {
  const el = document.createElement("div");
  el.className = faceUp ? "card card-face" : "card card-back";
  if (faceUp) el.innerHTML = `<span class="card-name">${card?.name ?? "Card"}</span>`;
  return el;
}

// Puts a card (or nothing) into a slot, keeping the slot's label.
function fillSlot(slot, card) {
  slot.querySelector(".card")?.remove();
  slot.classList.toggle("is-filled", !!card);
  if (card) slot.prepend(cardEl(card, !card.faceDown));
}

const PHASE_NAMES = { setup: "Setup", draw: "Draw Phase", prep1: "Preparation Phase I" };

// Draws everything the state holds: hands, pile counts, and the cards in the
// Unit Position Slots, Special Deck Zones and Field Effect Zone.
export function renderBoard(game, viewer = 0) {
  game.players.forEach((p, owner) => {
    const side = owner === viewer ? 0 : 1;
    p.ups.forEach((card, i) => fillSlot(getSlot(side, "ups", i), card));
    p.specialZones.forEach((card, i) => fillSlot(getSlot(side, "sdz", i), card));
    fillSlot(getSlot(side, "fez"), p.fieldEffect);
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
