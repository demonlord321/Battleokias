import { registerScreen, showScreen } from "../screens.js";
import { newGame, applyAction, checkAction } from "../engine/engine.js";
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
let board, phaseBtn, logEl, toastEl, curtain, winScreen;

const $ = (sel) => document.querySelector(sel);

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// Sends an action to the engine. Shows the engine's reason if it says no.
function act(action) {
  const prevActive = game.activePlayer;
  const result = applyAction(game, action);
  if (!result.ok) {
    toast(result.reason);
    return false;
  }
  selectedHand = null;
  if (game.winner !== null) return render(), showWin(), true;
  if (game.activePlayer !== prevActive) showCurtain();
  render();
  return true;
}

const me = () => game.activePlayer;
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
  // Units that can attack.
  ui.attackers = new Set();
  p.ups.forEach((u, slot) => {
    if (u && legal({ type: "attack", player: me(), slot })) ui.attackers.add(slot);
  });

  renderBoard(game, viewer, ui);

  const pa = phaseAction();
  phaseBtn.textContent = phaseLabel(pa);
  phaseBtn.disabled = game.winner !== null;

  logEl.innerHTML = game.log
    .slice(-9)
    .map((line) => `<div>${line.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</div>`)
    .join("");
}

function showCurtain() {
  curtain.hidden = false;
  $("#curtain-title").textContent = `${game.players[me()].name}'s turn`;
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
  if (zone === "formation") {
    if (selectedHand !== null) act({ type: "setFormation", player: me(), card: selectedHand });
    return;
  }
  if (zone !== "ups") return;
  const unit = game.players[me()].ups[index];
  if (selectedHand !== null && !unit) {
    act({ type: "summon", player: me(), card: selectedHand, slot: index });
  } else if (selectedHand !== null && legal({ type: "promote", player: me(), card: selectedHand, slot: index })) {
    act({ type: "promote", player: me(), card: selectedHand, slot: index });
  } else if (unit) {
    selectedHand = null;
    act({ type: "attack", player: me(), slot: index });
  }
}

export function setupGame() {
  board = $("#board");
  phaseBtn = $("#phase-btn");
  logEl = $("#game-log");
  toastEl = $("#toast");
  curtain = $("#curtain");
  winScreen = $("#win-screen");

  buildBoard(board);
  board.addEventListener("handclick", (e) => onHandClick(e.detail));
  board.addEventListener("slotclick", (e) => onSlotClick(e.detail));
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
