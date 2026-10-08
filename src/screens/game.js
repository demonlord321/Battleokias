import { registerScreen, showScreen } from "../screens.js";
import { newGame, applyAction, checkAction, attackPreview, legalActions, formationStats, unitStats } from "../engine/engine.js";
import { buildBoard, renderBoard, PHASE_NAMES } from "../board/board.js";

// Special Decks: data/decks.json may hold "special": { "<signet>": [ { "type": "equipment", "cards": [ids] }, ... ] },
// up to four (null for an empty zone). With none listed, the player has no Special Decks.
function buildSpecialDecks(cards, decks, signet) {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const list = decks?.special?.[signet] ?? [];
  return [0, 1, 2, 3].map((i) => {
    const d = list[i];
    if (!d) return null;
    const seen = {};
    return { type: d.type, cards: (d.cards ?? []).map((id) => {
      if (!byId[id]) throw new Error(`data/decks.json: unknown card "${id}" in the ${signet} Special Decks.`);
      seen[id] = (seen[id] ?? 0) + 1;
      return { ...instance(byId[id], seen[id]), id: `${id}#s${i}-${seen[id]}` };
    }) };
  });
}

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

// RULES.md deck rules: 60-card decks, any number of copies of a unit, up to 3 of anything else.
const DECK_SIZE = 60;
const MAX_COPIES = 3; // non-unit cards only

// If data/decks.json has a deck list for this Signet (an array of card ids), use it as is.
// Otherwise build one from every card carrying the Signet: 3 of each non-unit card,
// then units round-robin until the deck reaches 60.
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
  const units = pool.filter((c) => c.type === "unit");
  const deck = [];
  for (const c of pool.filter((c) => c.type !== "unit"))
    for (let copy = 1; copy <= (c.maxCopies ?? MAX_COPIES) && deck.length < DECK_SIZE; copy++) deck.push(instance(c, copy));
  for (let copy = 1; units.length && deck.length < DECK_SIZE; copy++)
    for (const c of units) if (deck.length < DECK_SIZE) deck.push(instance(c, copy));
  return deck;
}

// The first test game: School of Arms against School of Arms, hot-seat.
const SIGNETS = ["arms", "arms"];
const NAMES = ["Player 1", "Player 2"];

// ---------- Game mode: vs Computer or Hot-seat ----------
// vs Computer: you are always Player 1 at the bottom; the computer plays Player 2, one move
// at a time with a short pause, and there's no handover screen.
let mode = "computer";
export const setGameMode = (m) => (mode = m === "hotseat" ? "hotseat" : "computer");
const COMPUTER = 1;
const COMPUTER_DELAY = 650; // ms between the computer's moves
const vsComputer = () => mode === "computer";
const computerToMove = () => vsComputer() && game && game.winner === null && me() === COMPUTER;

// The computer's brain lives in the engine (src/engine/bot.js, chooseAction(game)). Until that
// exists, a simple built-in picker plays: Formation, Field Spell, promote, summon into the
// Formation's slots, equip, attack only when it will hit, then move on.
let chooseAction = null;
import("../engine/bot.js").then((m) => (chooseAction = m.chooseAction ?? m.default ?? null)).catch(() => {});

function basicPick(game) {
  const p = game.players[game.activePlayer];
  const options = legalActions(game).filter((a) => a.player === undefined || a.player === me());
  const wanted = new Set(p.formationZone?.slots ?? p.hand.find((c) => c.type === "formation")?.slots ?? [0, 1, 2]);
  const inF = (a) => (wanted.has(a.slot) ? 0 : 1);
  const of = (type) => options.filter((a) => a.type === type);
  const hits = attackPreview(game, me())?.hits;
  return (
    of("trapResponse")[0] || of("chooseLoss")[0] || of("specialDraw")[0] || of("graduate").sort((a, b) => inF(a) - inF(b))[0] ||
    (!p.formationZone && (of("setFormation")[0] || of("deckFormation")[0])) ||
    (!p.fieldEffect && of("setField")[0]) ||
    of("promote").sort((a, b) => inF(a) - inF(b))[0] ||
    of("enroll")[0] ||
    of("summon").sort((a, b) => inF(a) - inF(b) || (p.hand[b.card]?.grade ?? 0) - (p.hand[a.card]?.grade ?? 0) || a.slot - b.slot)[0] ||
    of("equip").sort((a, b) => inF(a) - inF(b))[0] ||
    of("setTrap").sort((a, b) => inF(b) - inF(a))[0] ||
    (hits && of("attack")[0]) ||
    of("nextPhase")[0] || of("endTurn")[0] || options[0] ||
    { type: "endTurn", player: me() }
  );
}

// Plays the computer's next move after a pause, then (through act) the one after that.
let computerTimer = null;
let computerSteps = 0;
let computerTurnKey = null;
function scheduleComputer() {
  if (!computerToMove() || computerTimer) return;
  computerTimer = setTimeout(() => {
    computerTimer = null;
    if (!computerToMove()) return;
    const key = `${game.turn}:${game.phase}`;
    computerSteps = key === computerTurnKey ? computerSteps + 1 : 0;
    computerTurnKey = key;
    let action = null;
    try { action = chooseAction?.(game, COMPUTER) ?? null; } catch (err) { console.error(err); }
    if (!action || checkAction(game, action)) action = basicPick(game);
    // Safety net: never let the computer loop forever in one phase.
    if (computerSteps > 40 || checkAction(game, action)) action = [{ type: "nextPhase", player: me() }, { type: "endTurn", player: me() }].find(legal) ?? action;
    if (!act(action)) act({ type: "endTurn", player: me() });
  }, COMPUTER_DELAY);
}
const blocked = () => curtain.hidden === false || computerToMove();

// ---------- Hot-seat game controller ----------

let game = null;
let viewer = 0; // whose side is at the bottom; follows the active player
let selectedHand = null; // hand index picked to summon
let board, phaseBtn, attackBtn, deckFormBtn, logEl, toastEl, curtain, winScreen;

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
  gradCard = null;
  deckFormOpen = false;
  if (game.winner !== null) return render(), showWin(), true;
  if (me() !== prevActor && !vsComputer()) showCurtain(); // turn passed, or the defender has to choose a loss
  render();
  scheduleComputer();
  return true;
}

// Whoever has to act right now: normally the active player, but when the engine is waiting
// on a choice (game.pending, e.g. the defender picking which tied unit to lose) it's them.
const me = () => game.pending?.player ?? game.activePlayer;
const choosingLoss = () => game.pending?.type === "chooseLoss";
const graduating = () => game.pending?.type === "graduate";
const drawingSpecial = () => game.pending?.type === "specialDraw";
const responding = () => game.pending?.type === "trapResponse";
// Unit Position Slots, row*3+col with the front row first.
const SLOT_NAMES = ["front left", "front centre", "front right", "middle left", "middle centre", "middle right", "back left", "back centre", "back right"];
const unitIn = (p, slot) => (p.ups[slot] && !p.ups[slot].faceDown ? p.ups[slot] : null);
let gradCard = null; // Grade 3 picked in the graduation panel (its card id)
const legal = (action) => checkAction(game, action) === null;
// A hand card can go to a slot by a normal summon, or by promoting the unit already there
// (one Grade up, for the difference in Grade; see RULES.md).
const canEquip = (card, slot) => legal({ type: "equip", player: me(), card, slot });
// Traps and Spells are set face-down in an empty Unit Position Slot (engine action setTrap).
const canSetTrap = (card, slot) => legal({ type: "setTrap", player: me(), card, slot });
const canPlay = (card, slot) =>
  legal({ type: "summon", player: me(), card, slot }) || legal({ type: "promote", player: me(), card, slot }) || canEquip(card, slot) || canSetTrap(card, slot);
const canSetFormation = (card) => legal({ type: "setFormation", player: me(), card });
// Field Effect Zone: play a Field Spell there, or enroll a unit in the Academy that's there.
const fezAction = (card) =>
  [{ type: "setField", player: me(), card }, { type: "enroll", player: me(), card }].find(legal) ?? null;

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
    if (canSetFormation(card) || fezAction(card) || p.ups.some((_, slot) => canPlay(card, slot))) ui.playable.add(card);
  });
  // Slots the selected card can go to.
  ui.formationReady = selectedHand !== null && canSetFormation(selectedHand);
  ui.fezReady = selectedHand !== null && !!fezAction(selectedHand);
  if (selectedHand !== null) {
    ui.legalSlots = new Set();
    p.ups.forEach((_, slot) => {
      if (legal({ type: "summon", player: me(), card: selectedHand, slot }) || canSetTrap(selectedHand, slot)) ui.legalSlots.add(slot);
    });
    // Equipment: units that can take the selected Equipment card (shared Signet).
    ui.equipSlots = new Set(p.ups.flatMap((u, slot) => (unitIn(p, slot) && canEquip(selectedHand, slot) ? [slot] : [])));
    ui.promoteSlots = new Set();
    p.ups.forEach((u, slot) => {
      if (unitIn(p, slot) && legal({ type: "promote", player: me(), card: selectedHand, slot })) ui.promoteSlots.add(slot);
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
  // Graduation: once a Grade 3 is picked in the panel, its possible slots glow.
  if (graduating() && gradCard) ui.legalSlots = new Set(game.pending.slots);
  // Preparation Phase II: the Special Decks you can draw from glow.
  if (drawingSpecial()) ui.drawDecks = new Set(game.pending.decks);
  // The opponent's attack is about to destroy a unit and you have a set card that can answer.
  if (responding() && !blocked()) {
    ui.trapSlots = new Set(game.pending.slots);
    ui.threatened = new Set(game.pending.targets);
  }
  renderGradPanel();
  renderTrapPanel();

  ui.formationStats = game.players.map((_, i) => formationStats(game, i));
  // Each unit's Attack/Defense after Equipment, straight from the engine.
  ui.unitStats = game.players.map((pl, i) => pl.ups.map((_, slot) => unitStats(game, i, slot)));
  renderBoard(game, viewer, ui);

  const pa = phaseAction();
  phaseBtn.textContent = phaseLabel(pa);
  phaseBtn.disabled = game.winner !== null || !!game.pending || computerToMove();
  if (computerToMove()) phaseBtn.textContent = "Computer is playing…";
  renderAttackButton(ui.formationCanAttack);
  renderDeckFormation();

  logEl.innerHTML = game.log
    .slice(-9)
    .map((line) => `<div>${line.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</div>`)
    .join("");
}

// "⚔ Attack 2500 vs 🛡 2000": shown in the Battle Phase; says up front whether it hits.
function renderAttackButton(canAttack) {
  const inBattle = game.phase === "battle" && game.winner === null && !game.pending;
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

// No Formation by round three: summon one straight from the deck (engine action deckFormation).
// The button appears only while the engine allows it; it opens a picker of the deck's Formations.
let deckFormOpen = false;
const deckFormChoices = () =>
  game.pending || game.winner !== null ? [] : legalActions(game).filter((a) => a.type === "deckFormation" && a.player === me());
function renderDeckFormation() {
  const choices = deckFormChoices();
  deckFormBtn.hidden = !choices.length;
  deckFormBtn.innerHTML = `&#x1F4DC; Formation from deck <small>No Formation yet: take one from your deck</small>`;
  let panel = $("#deckform-panel");
  if (!choices.length || !deckFormOpen || blocked()) {
    if (!choices.length) deckFormOpen = false;
    return panel?.remove();
  }
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "deckform-panel";
    panel.className = "grad-panel";
    panel.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) return (deckFormOpen = false), render();
      const b = e.target.closest("[data-card]");
      if (b) act({ type: "deckFormation", player: me(), card: b.dataset.card });
    });
    $("#game-screen").append(panel);
  }
  const deck = game.players[me()].deck;
  panel.innerHTML = `
    <div class="grad-title">&#x1F4DC; Summon a Formation from your deck</div>
    <div class="grad-sub">It goes straight into your Formation Zone, then your deck is shuffled.</div>
    <div class="grad-options">${choices
      .map((a) => {
        const c = deck.find((x) => x.id === a.card);
        const cost = c?.cost ?? 0;
        return `<button class="grad-option" data-card="${a.card}">${c?.name ?? a.card}<small>${cost ? `costs ${cost} Energy` : "free"}</small></button>`;
      })
      .join("")}</div>
    <button class="grad-close" data-close>Cancel</button>`;
}

// Graduation panel (Arms Academy): pick which Grade 3 comes out, from hand or deck,
// then click a glowing empty slot. Engine: game.pending = { type: "graduate", cards, slots }.
function renderGradPanel() {
  let panel = $("#grad-panel");
  if (!graduating() || blocked()) return panel?.remove();
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "grad-panel";
    panel.className = "grad-panel";
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-grad-id]");
      if (!b) return;
      gradCard = gradCard === b.dataset.gradId ? null : b.dataset.gradId;
      render();
    });
    $("#game-screen").append(panel);
  }
  const p = game.players[me()];
  const student = p.fieldEffect?.enrolled?.find((e) => e.card.id === game.pending.student)?.card;
  panel.innerHTML = `
    <div class="grad-title">&#x1F393; ${student?.name ?? "A student"} graduates from ${p.fieldEffect?.name ?? "the Academy"}</div>
    <div class="grad-sub">${gradCard ? "Now click a glowing empty slot." : "Pick the Grade 3 that comes out (free):"}</div>
    <div class="grad-options">${game.pending.cards
      .map((c) => `<button class="grad-option${gradCard === c.id ? " is-selected" : ""}" data-grad-id="${c.id}">${c.name}<small>from your ${c.from}</small></button>`)
      .join("")}</div>`;
}

// Trap response (engine: game.pending = { type: "trapResponse", player, slots, targets }):
// the defender sees which units are about to be destroyed and picks a set card or passes.
function renderTrapPanel() {
  let panel = $("#trap-panel");
  if (!responding() || blocked()) return panel?.remove();
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "trap-panel";
    panel.className = "grad-panel trap-panel";
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-trap-slot]");
      if (!b || !responding()) return;
      act({ type: "trapResponse", player: me(), slot: b.dataset.trapSlot === "pass" ? null : +b.dataset.trapSlot });
    });
    $("#game-screen").append(panel);
  }
  const p = game.players[me()];
  const { slots, targets } = game.pending;
  const names = targets.map((s) => unitIn(p, s)?.name ?? "A unit");
  const who = names.length === 1 ? `${names[0]} is` : `${names.slice(0, -1).join(", ")} and ${names.at(-1)} are`;
  const tie = names.length > 1 ? " (tied lowest Grade; you'd pick one to lose)" : "";
  panel.innerHTML = `
    <div class="grad-title">&#x26A0; ${game.players[1 - me()].name}'s attack landed</div>
    <div class="grad-sub">${who} about to be destroyed${tie}. Use a set card, or let it happen. Damage Counters land either way.</div>
    <div class="grad-options">${slots
      .map((s) => `<button class="grad-option trap-option" data-trap-slot="${s}">Activate ${p.ups[s]?.name ?? "set card"}<small>set in your ${SLOT_NAMES[s] ?? `slot ${s + 1}`} slot</small></button>`)
      .join("")}
      <button class="grad-option trap-pass" data-trap-slot="pass">Don't respond<small>${names.length === 1 ? `${names[0]} goes to the Grave` : "pick which unit to lose"}</small></button></div>`;
}

function showCurtain() {
  curtain.hidden = false;
  $("#curtain-title").textContent = responding()
    ? `${game.players[me()].name}: respond to the attack?`
    : choosingLoss()
    ? `${game.players[me()].name}: choose a unit to lose`
    : `${game.players[me()].name}'s turn`;
  $("#curtain-text").textContent = responding()
    ? `${game.players[1 - me()].name}'s attack is about to destroy one of your units, and you have a set card that can respond. Pass the device, then decide.`
    : choosingLoss()
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
  clearTimeout(computerTimer);
  computerTimer = null;
  try {
    const [cards, decks] = await Promise.all([loadJson("data/cards.json"), loadJson("data/decks.json", true)]);
    // The engine flips the coin, deals 4 and 5, and runs the first Draw Phase.
    const names = vsComputer() ? [NAMES[0], "Computer"] : NAMES;
    game = newGame({ decks: SIGNETS.map((s) => buildDeck(cards, decks, s)), specialDecks: SIGNETS.map((s) => buildSpecialDecks(cards, decks, s)), names });
    window.game = game; // handy for poking at the state from the browser console
    viewer = vsComputer() ? 0 : me();
    render();
    if (vsComputer()) scheduleComputer();
    else showCurtain();
  } catch (err) {
    console.error(err);
    toast(err.message);
  }
}

// ---------- Clicks ----------

function onHandClick({ index }) {
  if (blocked() || game.winner !== null) return;
  if (choosingLoss()) return toast("Pick one of the glowing units to send to the Grave.");
  if (graduating()) return toast("Pick a Grade 3 in the Academy panel first.");
  if (drawingSpecial()) return toast("Preparation Phase II: click one of your glowing Special Decks to draw from it.");
  if (responding()) return toast("Your opponent's attack landed: use a set card or choose not to respond.");
  selectedHand = selectedHand === index ? null : index;
  if (selectedHand !== null) {
    const p = game.players[me()];
    const anywhere = canSetFormation(index) || !!fezAction(index) || p.ups.some((_, slot) => canPlay(index, slot));
    if (!anywhere && p.hand[index]?.type === "formation") {
      toast(checkAction(game, { type: "setFormation", player: me(), card: index }) ?? "Can't set that now.");
      selectedHand = null;
    } else if (!anywhere && p.hand[index]?.type === "field_spell") {
      toast(checkAction(game, { type: "setField", player: me(), card: index }) ?? "Can't play that now.");
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
  if (blocked() || game.winner !== null) return;
  if (owner !== 0) return; // only your own side does anything for now
  if (drawingSpecial()) {
    if (zone === "sdz" && game.pending.decks.includes(index)) act({ type: "specialDraw", player: me(), deck: index });
    else toast("Pick one of your glowing Special Decks to draw from.");
    return;
  }
  if (graduating()) {
    if (!gradCard) toast("Pick a Grade 3 in the Academy panel first.");
    else if (zone === "ups") act({ type: "graduate", player: me(), card: gradCard, slot: index });
    return;
  }
  if (zone === "fez") {
    if (selectedHand === null) return;
    const action = fezAction(selectedHand);
    if (action) act(action);
    else toast(checkAction(game, { type: game.players[me()].fieldEffect?.academy ? "enroll" : "setField", player: me(), card: selectedHand }) ?? "Can't play that there.");
    return;
  }
  if (responding()) {
    if (zone === "ups" && game.pending.slots.includes(index)) act({ type: "trapResponse", player: me(), slot: index });
    else toast("Click a glowing set card to use it, or choose \"Don't respond\".");
    return;
  }
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
  const p = game.players[me()];
  const unit = unitIn(p, index);
  if (selectedHand !== null && unit && canEquip(selectedHand, index)) {
    act({ type: "equip", player: me(), card: selectedHand, slot: index });
  } else if (selectedHand !== null && !p.ups[index]) {
    // Traps and Spells are set face-down in an empty slot (RULES.md basic rule; engine setTrap).
    const setsFaceDown = ["trap", "spell"].includes(p.hand[selectedHand]?.type);
    act({ type: setsFaceDown ? "setTrap" : "summon", player: me(), card: selectedHand, slot: index });
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
  if (e.button !== 0 || blocked() || game.winner !== null || game.pending) return;
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
  deckFormBtn = $("#deckform-btn");
  deckFormBtn.addEventListener("click", () => ((deckFormOpen = !deckFormOpen), render()));
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
    onHide: () => (clearTimeout(computerTimer), (computerTimer = null)),
    onKey: (e) => {
      if (e.key !== "Escape") return;
      if (selectedHand !== null) {
        selectedHand = null;
        render();
      } else showScreen("menu");
    },
  });
}
