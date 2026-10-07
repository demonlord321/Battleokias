import { registerScreen, showScreen } from "../screens.js";
import { setGameMode } from "./game.js";

// Main menu. Each button opens a screen; Up/Down arrows move between buttons
// (Enter and Space already press the focused button).
export function setupMenu() {
  const buttons = [
    { el: document.querySelector("#vs-computer-btn"), screen: "game", mode: "computer" },
    { el: document.querySelector("#hotseat-btn"), screen: "game", mode: "hotseat" },
    { el: document.querySelector("#tutorial-btn"), screen: "tutorial" },
  ];
  for (const b of buttons)
    b.el.addEventListener("click", () => {
      if (b.mode) setGameMode(b.mode);
      showScreen(b.screen);
    });

  const els = buttons.map((b) => b.el);
  registerScreen("menu", {
    el: "#menu-screen",
    onShow: () => els[0].focus(),
    onKey: (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const i = els.indexOf(document.activeElement);
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = i === -1 ? 0 : (i + step + els.length) % els.length;
      els[next].focus();
    },
  });
}
