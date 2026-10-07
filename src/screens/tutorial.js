import { registerScreen, showScreen } from "../screens.js";

// Tutorial screen. Placeholder for now; the guided match (Milestone 2.5) will
// read its steps from data/tutorial.json and run a scripted game here.
export function setupTutorial() {
  document.querySelector("#tutorial-back-btn").addEventListener("click", () => showScreen("menu"));

  registerScreen("tutorial", {
    el: "#tutorial-screen",
    onKey: (e) => {
      if (e.key === "Escape") showScreen("menu");
    },
  });
}
