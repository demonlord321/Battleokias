// The rules engine. Every move in the game is an "action", a small object like
//   { type: "endTurn", player: 0 }  or  { type: "summon", player: 0, card: 3, slot: 4 }
// and it all goes through applyAction(). The board UI, the test bots, the
// tutorial and the AI later all use this one function, so they all follow
// exactly the same rules. See RULES.md for the rules themselves.

import { createRng, shuffle } from "./rng.js";
import { createGame, createPlayer, MAX_ENERGY_CAP } from "./state.js";

// Opening hands (RULES.md, Setup). Each player's first Draw Phase then takes
// the starting player to 5 cards and the opponent to 6.
export const STARTING_HAND = { first: 4, second: 5 };

// Moves the top card of a player's Draw Pile into their hand.
// Returns the card, or null if the pile is empty.
export function drawCard(game, playerIndex) {
  const p = game.players[playerIndex];
  const card = p.deck.pop() ?? null;
  if (card) p.hand.push(card);
  else game.log.push(`${p.name} has no cards left to draw.`);
  return card;
}

// Ends the game with a winner (a player index).
function win(game, playerIndex, why) {
  game.winner = playerIndex;
  game.phase = "over";
  game.log.push(`${game.players[playerIndex].name} wins: ${why}`);
}

// RULES.md placeholder: a unit attacks down its column. The opponent's half is
// rotated 180 degrees, so my column c faces their column 2 - c. Rows go front
// (nearest the centre) to back, so the target is the first unit found in
// slots col, col + 3, col + 6. Returns that slot, or null if the column is empty.
export function targetSlot(game, attackerIndex, slot) {
  const col = 2 - (slot % 3);
  const enemy = game.players[1 - attackerIndex];
  for (let row = 0; row < 3; row++) {
    if (enemy.ups[row * 3 + col]) return row * 3 + col;
  }
  return null;
}

// The summon action names a hand card either by its hand index (a number) or by
// its instance id (a string like "ARM-001#2"). Returns the hand index, or -1.
function handIndex(player, card) {
  if (typeof card === "number") return Number.isInteger(card) && card >= 0 && card < player.hand.length ? card : -1;
  return player.hand.findIndex((c) => c.id === card);
}

// Start of your turn (RULES.md, Energy): max Energy goes up by 1, to a cap of 10,
// and all your Energy refills to that max. So turn 1 has 1, turn 2 has 2, and so on.
export function refreshEnergy(player) {
  player.maxEnergy = Math.min(MAX_ENERGY_CAP, player.maxEnergy + 1);
  player.energy = player.maxEnergy;
}

// Spends Energy if the player has enough. Returns true if it was spent.
// Summoning uses this to pay a unit's cost.
export function spendEnergy(player, amount) {
  if (amount > player.energy) return false;
  player.energy -= amount;
  return true;
}

// Starts the active player's turn: refill Energy, Draw Phase (draw 1), then Preparation Phase I.
function startTurn(game) {
  if (game.activePlayer === game.startingPlayer) game.turn += 1;
  const p = game.players[game.activePlayer];
  refreshEnergy(p);
  // Your units shake off summoning sickness and get their attack back.
  for (const unit of p.ups) {
    if (unit) {
      unit.summonedThisTurn = false;
      unit.hasAttacked = false;
    }
  }
  game.phase = "draw";
  game.log.push(`Turn ${game.turn}: ${p.name}'s turn.`);
  // RULES.md placeholder: a player who can't draw in their Draw Phase loses.
  if (!drawCard(game, game.activePlayer)) return win(game, 1 - game.activePlayer, `${p.name} couldn't draw.`);
  game.phase = "prep1";
}

// Passes the turn to the other player.
function passTurn(game) {
  game.activePlayer = 1 - game.activePlayer;
  startTurn(game);
}

// Each action type has a check (is this move allowed?) and an apply (do it).
// New rules are added here as entries once Milestone 0 is settled.
const ACTIONS = {
  // Pass the turn right away, from any phase.
  endTurn: {
    check(game, action) {
      return null; // null means allowed; otherwise a reason string
    },
    apply(game, action) {
      passTurn(game);
    },
  },

  // Preparation Phase I goes to the Battle Phase; the Battle Phase ends the turn.
  nextPhase: {
    check(game, action) {
      if (game.phase !== "prep1" && game.phase !== "battle") return "There's no next phase right now.";
      return null;
    },
    apply(game, action) {
      if (game.phase === "prep1") {
        game.phase = "battle";
        game.log.push(`${game.players[game.activePlayer].name} goes to battle.`);
      } else {
        passTurn(game);
      }
    },
  },

  // { type: "summon", player, card, slot }: pay a unit's Energy cost and put it
  // into an empty Unit Position Slot (0 to 8) during Preparation Phase I.
  summon: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "prep1") return "You can only summon in Preparation Phase I.";
      const i = handIndex(p, action.card);
      if (i < 0) return "That card isn't in your hand.";
      const card = p.hand[i];
      if (card.type !== "unit") return "Only units can be summoned.";
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= p.ups.length) return "Pick one of your Unit Position Slots.";
      if (p.ups[action.slot]) return "That slot is taken.";
      const cost = card.cost ?? 0;
      if (cost > p.energy) return `${card.name} costs ${cost} Energy and you have ${p.energy}.`;
      return null;
    },
    apply(game, action) {
      const p = game.players[game.activePlayer];
      const [card] = p.hand.splice(handIndex(p, action.card), 1);
      spendEnergy(p, card.cost ?? 0);
      p.ups[action.slot] = { ...card, summonedThisTurn: true, hasAttacked: false };
      game.log.push(`${p.name} summons ${card.name}.`);
    },
  },

  // { type: "attack", player, slot }: the unit in that slot attacks down its column.
  attack: {
    check(game, action) {
      const p = game.players[game.activePlayer];
      if (game.phase !== "battle") return "Units can only attack in the Battle Phase.";
      const unit = p.ups[action.slot];
      if (!unit) return "There's no unit there.";
      if (unit.summonedThisTurn) return `${unit.name} was summoned this turn and can't attack yet.`;
      if (unit.hasAttacked) return `${unit.name} has already attacked this turn.`;
      return null;
    },
    apply(game, action) {
      const me = game.activePlayer;
      const p = game.players[me];
      const enemy = game.players[1 - me];
      const unit = p.ups[action.slot];
      unit.hasAttacked = true;
      const target = targetSlot(game, me, action.slot);
      if (target === null) {
        enemy.defense -= unit.attack;
        game.log.push(`${unit.name} hits ${enemy.name} for ${unit.attack}. ${enemy.name} has ${Math.max(0, enemy.defense)} Defense left.`);
        if (enemy.defense <= 0) win(game, me, `${enemy.name}'s Defense fell to 0.`);
        return;
      }
      const foe = enemy.ups[target];
      if (unit.attack > foe.defense) {
        enemy.ups[target] = null;
        enemy.graveyard.push(foe);
        game.log.push(`${unit.name} (${unit.attack}) destroys ${foe.name} (${foe.defense}).`);
      } else {
        game.log.push(`${unit.name} (${unit.attack}) can't break ${foe.name} (${foe.defense}).`);
      }
    },
  },
};

// Sets up a new game: shuffle both decks, flip the coin, deal the opening
// hands, then start the first turn (which runs its Draw Phase).
// Pass startingPlayer to skip the coin flip (handy for the tutorial and tests).
export function newGame({ seed = Date.now(), decks, names = ["Player 1", "Player 2"], startingPlayer }) {
  const rng = createRng(seed);
  const players = names.map((name, i) => createPlayer(name, shuffle(decks[i] ?? [], rng)));
  const game = createGame({ seed, players });
  game.rng = rng; // kept on the game so every later random event follows the seed
  game.log.push(`New game (seed ${seed}).`);

  const first = startingPlayer ?? (rng() < 0.5 ? 0 : 1);
  game.startingPlayer = first;
  game.activePlayer = first;
  game.log.push(`${players[first].name} won the coin flip and goes first.`);

  for (let i = 0; i < STARTING_HAND.first; i++) drawCard(game, first);
  for (let i = 0; i < STARTING_HAND.second; i++) drawCard(game, 1 - first);

  startTurn(game);
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
  const player = game.activePlayer;
  const p = game.players[player];
  const candidates = [{ type: "endTurn", player }, { type: "nextPhase", player }];
  p.hand.forEach((card, i) => {
    p.ups.forEach((_, slot) => candidates.push({ type: "summon", player, card: i, slot }));
  });
  p.ups.forEach((_, slot) => candidates.push({ type: "attack", player, slot }));
  return candidates.filter((a) => checkAction(game, a) === null);
}
