// Entry point: set up every screen, then start on the main menu.
import { showScreen } from "./screens.js";
import { setupMenu } from "./screens/menu.js";
import { setupGame } from "./screens/game.js";
import { setupTutorial } from "./screens/tutorial.js";

setupMenu();
setupGame();
setupTutorial();
showScreen("menu");
