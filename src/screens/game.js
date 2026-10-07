import { registerScreen, showScreen } from "../screens.js";
import { newGame, applyAction, checkAction, attackPreview } from "../engine/engine.js";
import { buildBoard, renderBoard, PHASE_NAMES } from "../board/board.js";

// ---------- Cards and decks ----------

// Cards come from data/cards.json, the master list Dyllan edits.
const cache = {};
function loadJson(path, optional = false) {
  cache[path] ??= fetch(path).then((r) => {
    if (r.ok) return r.json();
    if (optional) return null;
    throw new Error(`Couldn't load ${path} (${r.status})`);
  });
  return cache[path];
}

// Each copy in a deck gets its own instance id ("ARM-001#3"); cardId keeps the catalogue id.
function instance(card, n) {
  return { ...card, cardId: card.id, id: `${card.id}#${n}` };
}

// RULES.md placeholder: 30-card decks, up to 3 copies of a card, single Signet.
const DECK_SIZE = 30;
const MAX_COPIES = 3;

// If data/decks.json has a deck list for this Signet (an array of card ids), use it.
// Otherwise build one: every card carrying the Signet, up to 3 copies each, to 30 cards.
function buildDeck(cards, decks, signet) {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const list = decks?.[signet];
  if (Array.isArray(list)) {
    const seen = {};
    return list.map((id) => {
      if (!byId[id]) throw new Error(`data/decks.json: unknown card "${id}" in the ${signet} deck.`);
      seen[id] = (seen[id] ?? 0) + 1;
      return instance(byId[id], seen[id]);
    });
  }
  const pool = cards.filter((c) => c.signets?.includes(signet));
  if (!pool.length) throw new Error(`No cards in data/cards.json carry the "${signet}" Signet.`);
  const deck = [];
  for (let copy = 1; copy <= MAX_COPIES && deck.length < DECK_SIZE; copy++) {
    for (const c of pool) if (deck.length < DECK_SIZE) deck.push(instance(c, copy));
  }
  return deck;
}

// The first test game: School of Arms against School of Arms, hot-seat.
const SIGNETS = ["arms", "arms"];
const NAMES = ["Player 1", "Player 2"];

// ---------- Hot-seat game controller ----------

let game = null;
let viewer = 0; // whose side is at the bottom; follows the active player
let selectedHand = null; // hand index picked to summon
let board, phaseBtn, attackBtn, logEl, toastEl, curtain, winScreen;

const $ = (sel) => document.querySelector(sel);

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// Sends an action to the engine. Shows the engine's reason if it says no.
function act(action) {
  const prevActor = me();
  const result = applyAction(game, action);
  if (!result.ok) {
    toast(result.reason);
    return false;
  }
  selectedHand = null;
  if (game.winner !== null) return render(), showWin(), true;
  if (me() !== prevActor) showCurtain(); // turn passed, or the defender has to choose a loss
  render();
  return true;
}

// Whoever has to act right now: normally the active player, but when the engine is waiting
// on a choice (game.pending, e.g. the defender picking which tied unit to lose) it's them.
const me = () => game.pending?.player ?? game.activePlayer;
const choosingLoss = () => game.pending?.type === "chooseLoss";
const legal = (action) => checkAction(game, action) === null;
// A hand card can go to a slot by a normal summon, or by promoting the unit already there
// (one Grade up, for the difference in Grade; see RULES.md).
const canPlay = (card, slot) =>
  legal({ type: "summon", player: me(), card, slot }) || legal({ type: "promote", player: me(), card, slot });
const canSetFormation = (card) => legal({ type: "setFormation", player: me(), card });

// Which button the phase control is: the engine's nextPhase if it has one, else End Turn.
function phaseAction() {
  const next = { type: "nextPhase", player: me() };
  if (legal(next)) return next;
  return { type: "endTurn", player: me() };
}

function phaseLabel(action) {
  if (action.type === "endTurn") return "End Turn ▸";
  if (game.phase === "prep1") return "To Battle ▸";
  if (game.phase === "battle") return "End Battle ▸";
  return "Next Phase ▸";
}

function render() {
  const p = game.players[me()];
  const ui = { phase: game.phase, selectedHand };

  // Hand cards that could be summoned somewhere right now.
  ui.playable = new Set();
  p.hand.forEach((_, card) => {
    if (canSetFormation(card) || p.ups.some((_, slot) => canPlay(card, slot))) ui.playable.add(card);
  });
  // Slots the selected card can go to.
  ui.formationReady = selectedHand !== null && canSetFormation(selectedHand);
  if (selectedHand !== null) {
    ui.legalSlots = new Set();
    p.ups.forEach((_, slot) => {
      if (legal({ type: "summon", player: me(), card: selectedHand, slot })) ui.legalSlots.add(slot);
    });
    ui.promoteSlots = new Set();
    p.ups.forEach((u, slot) => {
      if (u && legal({ type: "promote", player: me(), card: selectedHand, slot })) ui.promoteSlots.add(slot);
    });
  }
  // RULES.md: in the Battle Phase your whole Formation attacks (its Attack vs their
  // Formation Defense), so there's one Attack button rather than per-unit attacks.
  ui.formationCanAttack = legal({ type: "attack", player: me() });
  // Opponent units the attack would destroy (several = tied lowest Grade; they'll pick).
  if (ui.formationCanAttack) {
    const pv = attackPreview(game, me());
    if (pv.hits && pv.destroys?.length) ui.targets = new Set(pv.destroys);
  }
  // The defender choosing which tied unit goes to the Grave.
  if (choosingLoss()) ui.lossSlots = new Set(game.pending.slots);

  renderBoard(game, viewer, ui);

  const pa = phaseAction();
  phaseBtn.textContent = phaseLabel(pa);
  phaseBtn.disabled = game.winner !== null || choosingLoss();
  renderAttackButton(ui.formationCanAttack);

  logEl.innerHTML = game.log
    .slice(-9)
    .map((line) => `<div>${line.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</div>`)
    .join("");
}

// "⚔ Attack 2500 vs 🛡 2000": shown in the Battle Phase; says up front whether it hits.
function renderAttackButton(canAttack) {
  const inBattle = game.phase === "battle" && game.winner === null && !choosingLoss();
  attackBtn.hidden = !inBattle;
  if (!inBattle) return;
  // The engine's own preview, so the button always matches what the attack will do.
  const { attack: atk, defense: theirDef, hits, counters } = attackPreview(game, me());
  attackBtn.disabled = !canAttack;
  attackBtn.classList.toggle("will-hit", canAttack && hits);
  attackBtn.classList.toggle("will-miss", canAttack && !hits);
  attackBtn.innerHTML = canAttack
    ? `&#x2694; Attack <small>${atk} vs &#x1F6E1; ${theirDef}${hits ? (counters ? ` · hits for ${counters}` : " · lands, 0 counters") : " · blocked"}</small>`
    : `&#x2694; Attack <small>${checkAction(game, { type: "attack", player: me() }) ?? ""}</small>`;
}

function showCurtain() {
  curtain.hidden = false;
  $("#curtain-title").textContent = choosingLoss()
    ? `${game.players[me()].name}: choose a unit to lose`
    : `${game.players[me()].name}'s turn`;
  $("#curtain-text").textContent = choosingLoss()
    ? "Your Formation was hit and your lowest-Grade units are tied. Pass the device, then pick which one goes to the Grave."
    : "Pass the device, then press start. The other player's hand stays hidden.";
  $("#curtain-btn").textContent = `I'm ${game.players[me()].name}, start`;
  $("#curtain-btn").focus();
}

function hideCurtain() {
  curtain.hidden = true;
  viewer = me();
  render();
}

function showWin() {
  const winner = game.players[game.winner];
  const loser = game.players[1 - game.winner];
  $("#win-title").textContent = `${winner.name} wins!`;
  // The engine logs "<name> wins: <why>"; show the why.
  const line = [...game.log].reverse().find((l) => l.startsWith(`${winner.name} wins:`));
  $("#win-detail").textContent = line ? line.slice(winner.name.length + 6).trim() : `${loser.name} took ${loser.damage ?? 10} Damage Counters on turn ${game.turn}.`;
  winScreen.hidden = false;
  $("#rematch-btn").focus();
}

async function startGame() {
  winScreen.hidden = true;
  curtain.hidden = true;
  selectedHand = null;
  try {
    const [cards, decks] = await Promise.all([loadJson("data/cards.json"), loadJson("data/decks.json", true)]);
    // The engine flips the coin, deals 4 and 5, and runs the first Draw Phase.
    game = newGame({ decks: SIGNETS.map((s) => buildDeck(cards, decks, s)), names: NAMES });
    window.game = game; // handy for poking at the state from the browser console
    viewer = me();
    render();
    showCurtain();
  } catch (err) {
    console.error(err);
    toast(err.message);
  }
}

// ---------- Clicks ----------

function onHandClick({ index }) {
  if (curtain.hidden === false || game.winner !== null) return;
  if (choosingLoss()) return toast("Pick one of the glowing units to send to the Grave.");
  selectedHand = selectedHand === index ? null : index;
  if (selectedHand !== null) {
    const p = game.players[me()];
    const anywhere = canSetFormation(index) || p.ups.some((_, slot) => canPlay(index, slot));
    if (!anywhere && p.hand[index]?.type === "formation") {
      toast(checkAction(game, { type: "setFormation", player: me(), card: index }) ?? "Can't set that now.");
      selectedHand = null;
    } else if (!anywhere) {
      // Ask the engine why, using the first empty slot, so the reason is useful.
      const empty = p.ups.findIndex((u) => !u);
      toast(checkAction(game, { type: "summon", player: me(), card: index, slot: Math.max(0, empty) }) ?? "Can't play that now.");
      selectedHand = null;
    }
  }
  render();
}

function onSlotClick({ owner, zone, index }) {
  if (curtain.hidden === false || game.winner !== null) return;
  if (owner !== 0) return; // only your own side does anything for now
  if (choosingLoss()) {
    if (zone === "ups" && game.pending.slots.includes(index)) act({ type: "chooseLoss", player: me(), slot: index });
    else toast("Pick one of the glowing units to send to the Grave.");
    return;
  }
  if (zone === "formation") {
    if (selectedHand !== null) act({ type: "setFormation", player: me(), card: selectedHand });
    else if (game.phase === "battle") act({ type: "attack", player: me() });
    return;
  }
  if (zone !== "ups") return;
  const unit = game.players[me()].ups[index];
  if (selectedHand !== null && !unit) {
    act({ type: "summon", player: me(), card: selectedHand, slot: index });
  } else if (selectedHand !== null && legal({ type: "promote", player: me(), card: selectedHand, slot: index })) {
    act({ type: "promote", player: me(), card: selectedHand, slot: index });
  } else if (unit && game.phase === "battle") {
    act({ type: "attack", player: me() }); // the Formation attacks as one
  } else {
    selectedHand = null;
    render();
  }
}

// ---------- Drag to move / retire (RULES.md: Preparation Phase I, free) ----------
// Drag one of your units onto another slot to move it (onto a unit to swap them), or onto
// your Grave to retire it. Pointer events, so it works with a mouse or a finger.
// Engine actions: { type: "move", player, from, to } and { type: "retire", player, slot }.
let drag = null;
let suppressClick = false;

const slotAt = (x, y) => document.elementFromPoint(x, y)?.closest(".slot");
const dropAction = (from, el) => {
  if (!el || +el.dataset.owner !== 0) return null;
  if (el.dataset.zone === "ups" && +el.dataset.index !== from) return { type: "move", player: me(), from, to: +el.dataset.index };
  if (el.dataset.zone === "grave") return { type: "retire", player: me(), slot: from };
  return null;
};

function onPointerDown(e) {
  if (e.button !== 0 || curtain.hidden === false || game.winner !== null || choosingLoss()) return;
  const slot = e.target.closest('.slot[data-owner="0"][data-zone="ups"].is-filled');
  if (!slot) return;
  const from = +slot.dataset.index;
  // Only start a drag if the engine would allow some move or a retire from here.
  const p = game.players[me()];
  const targets = p.ups.map((_, to) => to).filter((to) => to !== from && legal({ type: "move", player: me(), from, to }));
  const canRetire = legal({ type: "retire", player: me(), slot: from });
  if (!targets.length && !canRetire) return;
  drag = { from, slot, targets, canRetire, x: e.clientX, y: e.clientY, ghost: null };
}

function onPointerMove(e) {
  if (!drag) return;
  if (!drag.ghost) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    const card = drag.slot.querySelector(".card");
    const r = card.getBoundingClientRect();
    drag.ghost = card.cloneNode(true);
    drag.ghost.className += " drag-ghost";
    Object.assign(drag.ghost.style, { width: r.width + "px", height: r.height + "px" });
    document.body.append(drag.ghost);
    drag.slot.classList.add("is-dragging");
    drag.targets.forEach((to) => board.querySelector(`.slot[data-owner="0"][data-zone="ups"][data-index="${to}"]`)?.classList.add("drop-ok"));
    if (drag.canRetire) board.querySelector('.slot[data-owner="0"][data-zone="grave"]')?.classList.add("drop-ok", "drop-retire");
  }
  drag.ghost.style.left = e.clientX + "px";
  drag.ghost.style.top = e.clientY + "px";
  board.querySelectorAll(".drop-hover").forEach((el) => el.classList.remove("drop-hover"));
  drag.ghost.hidden = true;
  const over = slotAt(e.clientX, e.clientY);
  drag.ghost.hidden = false;
  if (over?.classList.contains("drop-ok")) over.classList.add("drop-hover");
}

function onPointerUp(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (!d.ghost) return; // a plain click; let the click handler deal with it
  d.ghost.remove();
  board.querySelectorAll(".drop-ok, .drop-hover, .is-dragging").forEach((el) => el.classList.remove("drop-ok", "drop-hover", "drop-retire", "is-dragging"));
  suppressClick = true;
  setTimeout(() => (suppressClick = false), 0);
  const action = dropAction(d.from, slotAt(e.clientX, e.clientY));
  if (action) act(action);
}

export function setupGame() {
  board = $("#board");
  phaseBtn = $("#phase-btn");
  attackBtn = $("#attack-btn");
  attackBtn.addEventListener("click", () => act({ type: "attack", player: me() }));
  logEl = $("#game-log");
  toastEl = $("#toast");
  curtain = $("#curtain");
  winScreen = $("#win-screen");

  buildBoard(board);
  board.addEventListener("handclick", (e) => onHandClick(e.detail));
  board.addEventListener("slotclick", (e) => !suppressClick && onSlotClick(e.detail));
  board.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  board.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    selectedHand = null;
    render();
  });
  phaseBtn.addEventListener("click", () => act(phaseAction()));
  $("#curtain-btn").addEventListener("click", hideCurtain);
  $("#rematch-btn").addEventListener("click", startGame);
  $("#win-menu-btn").addEventListener("click", () => showScreen("menu"));
  $("#back-to-menu-btn").addEventListener("click", () => showScreen("menu"));

  registerScreen("game", {
    el: "#game-screen",
    onShow: startGame,
    onKey: (e) => {
      if (e.key !== "Escape") return;
      if (selectedHand !== null) {
        selectedHand = null;
        render();
      } else showScreen("menu");
    },
  });
}
