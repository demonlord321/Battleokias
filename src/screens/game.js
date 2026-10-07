import { registerScreen, showScreen } from "../screens.js";
import { newGame } from "../engine/engine.js";
import { buildBoard, renderBoard } from "../board/board.js";

// Cards come from data/cards.json, the master list Dyllan edits.
let cardsPromise = null;
function loadCards() {
  cardsPromise ??= fetch("data/cards.json").then((r) => {
    if (!r.ok) throw new Error(`Couldn't load data/cards.json (${r.status})`);
    return r.json();
  });
  return cardsPromise;
}

// Decks are single-Signet (RULES.md): take every card carrying the Signet and
// repeat them up to DECK_SIZE. Each copy gets its own instance id ("ARM-001#3")
// while cardId keeps pointing at the catalogue entry.
// DECK_SIZE is a placeholder until RULES.md sets deck size and copy limits;
// the real decks will come from the deck builder.
const DECK_SIZE = 40;
function buildDeck(cards, signet) {
  const pool = cards.filter((c) => c.signets?.includes(signet));
  if (!pool.length) throw new Error(`No cards in data/cards.json carry the "${signet}" Signet.`);
  return Array.from({ length: DECK_SIZE }, (_, i) => {
    const c = pool[i % pool.length];
    return { ...c, cardId: c.id, id: `${c.id}#${Math.floor(i / pool.length) + 1}` };
  });
}

// For now you play School of Arms against School of Magic.
const PLAYER_SIGNET = "arms";
const OPPONENT_SIGNET = "magic";

function showError(board, message) {
  let el = board.querySelector(".board-error");
  if (!el) {
    el = document.createElement("div");
    el.className = "board-error";
    board.append(el);
  }
  el.textContent = message;
}

export function setupGame() {
  const board = document.querySelector("#board");
  buildBoard(board);
  document.querySelector("#back-to-menu-btn").addEventListener("click", () => showScreen("menu"));

  board.addEventListener("slotclick", (e) => console.log("slot clicked", e.detail));

  registerScreen("game", {
    el: "#game-screen",
    onShow: async () => {
      try {
        const cards = await loadCards();
        // The engine flips the coin, deals 4 and 5, and runs the first Draw Phase.
        const game = newGame({
          decks: [buildDeck(cards, PLAYER_SIGNET), buildDeck(cards, OPPONENT_SIGNET)],
          names: ["You", "Opponent"],
        });
        renderBoard(game);
      } catch (err) {
        console.error(err);
        showError(board, err.message);
      }
    },
    onKey: (e) => {
      if (e.key === "Escape") showScreen("menu");
    },
  });
}
