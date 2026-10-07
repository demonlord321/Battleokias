import { registerScreen, showScreen } from "../screens.js";
import { newGame } from "../engine/engine.js";
import { buildBoard, renderBoard } from "../board/board.js";

// Placeholder cards until real card data exists (Milestone 1).
function sampleDeck(prefix) {
  return Array.from({ length: 40 }, (_, i) => ({ id: `${prefix}${i}`, name: `Card ${i + 1}` }));
}

// Opening hands per RULES.md: the starting player goes into turn 1 with 5 cards
// (4 + their first draw), the opponent with 6 (5 + their first draw).
// The engine doesn't deal yet, so the board deals here for the preview.
// TODO: replace with the engine's start-of-game actions once Developer adds them.
function previewDeal(game) {
  const deal = (p, n) => { for (let i = 0; i < n; i++) p.hand.push(p.deck.pop()); };
  deal(game.players[game.activePlayer], 5);
  deal(game.players[1 - game.activePlayer], 6);
}

export function setupGame() {
  const board = document.querySelector("#board");
  buildBoard(board);
  document.querySelector("#back-to-menu-btn").addEventListener("click", () => showScreen("menu"));

  board.addEventListener("slotclick", (e) => console.log("slot clicked", e.detail));

  registerScreen("game", {
    el: "#game-screen",
    onShow: () => {
      const game = newGame({ decks: [sampleDeck("p"), sampleDeck("o")], names: ["You", "Opponent"] });
      previewDeal(game);
      renderBoard(game);
    },
    onKey: (e) => {
      if (e.key === "Escape") showScreen("menu");
    },
  });
}
