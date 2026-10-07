// The whole game lives in one plain object, so it is easy to log, test and save.
// No graphics in here: the screens only read this state and send actions.
//
// Zones follow RULES.md (Field layout). Rules still to come (win condition,
// resources, what the Special Deck Zones and Field Effect Zone hold) get added
// once Milestone 0 settles them.

export const UPS_SIZE = 9; // 3x3 Unit Position Slots, index = row * 3 + col
export const SDZ_SIZE = 4; // Special Deck Zones
export const MAX_DAMAGE = 10; // RULES.md: reaching 10 Damage Counters means you lose
export const MAX_ENERGY_CAP = 10; // RULES.md: Energy works like Hearthstone's mana

export function createPlayer(name, deck = [], specialDecks = []) {
  return {
    name,
    damage: 0, // Damage Counters; MAX_DAMAGE means you lose
    energy: 0, // Energy you can spend this turn
    maxEnergy: 0, // goes up by 1 at the start of each of your turns, to MAX_ENERGY_CAP
    deck: [...deck], // the Draw Pile; top of the pile is the end of the array
    hand: [],
    ups: Array(UPS_SIZE).fill(null), // Unit Position Slots, null = empty
    // Special Deck Zones (RULES.md, Special Decks): four slots, each { type, cards } or null.
    // The top of each pile is the end of its cards array.
    specialDecks: Array.from({ length: SDZ_SIZE }, (_, i) => (specialDecks[i] ? { type: specialDecks[i].type, cards: [...specialDecks[i].cards] } : null)),
    fieldEffect: null, // Field Effect Zone
    formationZone: null, // Formation Zone, above the Field Effect Zone
    graveyard: [], // the Grave Pile
    usedDeckFormation: false, // RULES.md: taking a Formation from your deck works once per game
  };
}

export function createGame({ seed = Date.now(), players }) {
  return {
    seed,
    turn: 0, // goes to 1 when the first turn starts
    startingPlayer: 0, // who won the coin flip
    activePlayer: 0, // index into players
    phase: "setup", // "setup", then each turn: "start" -> "draw" -> "prep1" -> "battle" -> "prep2" -> "end"; "over" once someone wins
    players,
    winner: null, // index of the winning player, or null while the game runs
    pending: null, // a choice someone must make before play goes on, e.g. { type: "chooseLoss", player, slots }
    log: [], // human-readable history, shown in the game log later
  };
}
