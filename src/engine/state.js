// The whole game lives in one plain object, so it is easy to log, test and save.
// No graphics in here: the screens only read this state and send actions.
//
// Rules-specific fields (HP, resources, phases...) get added once the
// Milestone 0 rules are written. Zones follow the plan: deck, hand, field, graveyard.

export function createPlayer(name, deck = []) {
  return {
    name,
    deck: [...deck], // top of the deck is the end of the array
    hand: [],
    field: [],
    graveyard: [],
  };
}

export function createGame({ seed = Date.now(), players }) {
  return {
    seed,
    turn: 1,
    activePlayer: 0, // index into players
    players,
    winner: null, // index of the winning player, or null while the game runs
    log: [], // human-readable history, shown in the game log later
  };
}
