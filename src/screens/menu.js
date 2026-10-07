import { registerScreen, showScreen } from "../screens.js";

export function setupMenu() {
  const newGameBtn = document.querySelector("#new-game-btn");
  newGameBtn.addEventListener("click", () => showScreen("game"));

  registerScreen("menu", {
    el: "#menu-screen",
    onShow: () => newGameBtn.focus(),
    onKey: (e) => {
      if (e.key === "Enter" && document.activeElement !== newGameBtn) showScreen("game");
    },
  });
}
