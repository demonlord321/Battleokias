import { registerScreen, showScreen } from "../screens.js";

// The game screen. For now it's an empty board; the real board is Milestone 2,
// and the rules engine (Developer) will plug in here.
export function setupGame() {
  document.querySelector("#back-to-menu-btn").addEventListener("click", () => showScreen("menu"));

  registerScreen("game", {
    el: "#game-screen",
    onShow: () => {
      // Start a fresh game here once the engine exists.
    },
    onKey: (e) => {
      if (e.key === "Escape") showScreen("menu");
    },
  });
}
