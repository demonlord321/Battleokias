import { registerScreen, showScreen } from "../screens.js";

// Main menu. Each button opens a screen; Up/Down arrows move between buttons
// (Enter and Space already press the focused button).
export function setupMenu() {
  const buttons = [
    { el: document.querySelector("#new-game-btn"), screen: "game" },
    { el: document.querySelector("#tutorial-btn"), screen: "tutorial" },
  ];
  for (const b of buttons) b.el.addEventListener("click", () => showScreen(b.screen));

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
