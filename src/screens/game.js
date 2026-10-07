import { registerScreen, showScreen } from "../screens.js";
import { newGame } from "../engine/engine.js";
import { buildBoard, renderBoard } from "../board/board.js";

// Placeholder cards until real card data exists (Milestone 1).
function sampleDeck(prefix) {
  return Array.from({ length: 40 }, (_, i) => ({ id: `${prefix}${i}`, name: `Card ${i + 1}` }));
}

export function setupGame() {
  const board = document.querySelector("#board");
  buildBoard(board);
  document.querySelector("#back-to-menu-btn").addEventListener("click", () => showScreen("menu"));

  board.addEventListener("slotclick", (e) => console.log("slot clicked", e.detail));

  registerScreen("game", {
    el: "#game-screen",
    onShow: () => {
      // The engine flips the coin, deals 4 and 5, and runs the first Draw Phase.
      const game = newGame({ decks: [sampleDeck("p"), sampleDeck("o")], names: ["You", "Opponent"] });
      renderBoard(game);
    },
    onKey: (e) => {
      if (e.key === "Escape") showScreen("menu");
    },
  });
}
