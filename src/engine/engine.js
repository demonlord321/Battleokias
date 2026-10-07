// The rules engine. Every move in the game is an "action", a small object like
//   { type: "endTurn" }  or  { type: "play", player: 0, card: 3 }
// and it all goes through applyAction(). The board UI, the test bots and the
// AI later all use this one function, so they all follow exactly the same rules.

import { createRng, shuffle } from "./rng.js";
import { createGame, createPlayer } from "./state.js";

// Each action type has a check (is this move allowed?) and an apply (do it).
// New rules are added here as entries once Milestone 0 is settled.
const ACTIONS = {
  endTurn: {
    check(game, action) {
      return null; // null means allowed; otherwise a reason string
    },
    apply(game, action) {
      game.activePlayer = 1 - game.activePlayer;
      if (game.activePlayer === 0) game.turn += 1;
      game.log.push(`Turn ${game.turn}: ${game.players[game.activePlayer].name} to play.`);
    },
  },
};

export function newGame({ seed = Date.now(), decks, names = ["Player 1", "Player 2"] }) {
  const rng = createRng(seed);
  const players = names.map((name, i) => createPlayer(name, shuffle(decks[i] ?? [], rng)));
  const game = createGame({ seed, players });
  game.rng = rng; // kept on the game so every later random event follows the seed
  game.log.push(`New game (seed ${seed}).`);
  return game;
}

// Returns why an action is not allowed, or null if it is.
export function checkAction(game, action) {
  if (game.winner !== null) return "The game is over.";
  const rule = ACTIONS[action?.type];
  if (!rule) return `Unknown action "${action?.type}".`;
  if (action.player !== undefined && action.player !== game.activePlayer) return "It's not your turn.";
  return rule.check(game, action);
}

// Applies an action if it is allowed. Returns { ok: true } or { ok: false, reason }.
export function applyAction(game, action) {
  const reason = checkAction(game, action);
  if (reason) return { ok: false, reason };
  ACTIONS[action.type].apply(game, action);
  return { ok: true };
}

// Every action the active player could take right now. The bots and AI pick from this.
export function legalActions(game) {
  const candidates = [{ type: "endTurn", player: game.activePlayer }];
  return candidates.filter((a) => checkAction(game, a) === null);
}
