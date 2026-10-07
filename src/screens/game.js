import { registerScreen, showScreen } from "../screens.js";
import { newGame } from "../engine/engine.js";
import { buildBoard, renderBoard } from "../board/board.js";

// Placeholder cards until cards.json exists (Milestone 1). One of each type so the frames show.
const SAMPLE = [
  { name: "Goblin Scout", type: "unit", cost: 1, level: 1, attack: 300, defense: 200, formation: "Placeholder until formations are designed.", text: "A quick little raider." },
  { name: "Ember Bolt", type: "spell", cost: 2, text: "Deal damage to a unit." },
  { name: "Mire of Ash", type: "field", cost: 3, text: "Affects the whole field." },
  { name: "Snare Pit", type: "trap", cost: 1, text: "Activate on your opponent's turn." },
  { name: "Iron Gauntlet", type: "equipment", cost: 2, text: "Equip to a unit." },
  { name: "Kias Idol", type: "artifact", cost: 4, text: "A relic of power." },
];
function sampleDeck(prefix) {
  return Array.from({ length: 40 }, (_, i) => ({ ...SAMPLE[i % SAMPLE.length], id: `${prefix}${i}` }));
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
