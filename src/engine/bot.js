// The computer player (Developer). The board calls chooseAction(game, player) whenever the
// computer has to act, and the balance sims (npm run sim) use the same player.
//
// Fair play: moves come from legalActions(game), but every decision is made from
// playerView(game, player), which hides what that player couldn't know: the opponent's
// hand, the order of both main decks, what's inside every Special Deck, and the opponent's face-down cards.

import { legalActions, attackPreview, formationSlots, unitStats } from "./engine.js";

const HIDDEN = Object.freeze({ hidden: true });
const FACE_DOWN = Object.freeze({ hidden: true, faceDown: true });

// A copy of the game as one player sees it. Card counts stay, so "they have 5 cards" is known.
export function playerView(game, player) {
  const players = game.players.map((p, i) => {
    const mine = i === player;
    return {
      ...p,
      hand: mine ? [...p.hand] : p.hand.map(() => HIDDEN),
      // Your own deck's contents are known (you can search it for a Formation), its order isn't.
      deck: mine ? [...p.deck].sort((a, b) => String(a.id).localeCompare(String(b.id))) : p.deck.map(() => HIDDEN),
      specialDecks: p.specialDecks.map((d) => (d ? { type: d.type, cards: d.cards.map(() => HIDDEN) } : null)),
      // The opponent's set Traps show only that something is there.
      ups: mine ? [...p.ups] : p.ups.map((c) => (c?.faceDown ? FACE_DOWN : c)),
    };
  });
  const { rng, ...rest } = game; // the random number generator would reveal every future shuffle
  return { ...rest, players, log: [...game.log] };
}

// Whoever has to act right now: the player a pending choice belongs to, else the active player.
export const actingPlayer = (game) => game.pending?.player ?? game.activePlayer;

// Picks one legal action for `player` (default: whoever has to act). Simple priorities:
// get a Formation and Field Spell out, graduate, promote, enroll Students, fill the
// Formation's slots with the biggest units, equip, attack only when the hit lands, move on.
export function chooseAction(game, player = actingPlayer(game)) {
  if (player !== actingPlayer(game)) return null;
  const options = legalActions(game).filter((a) => a.player === undefined || a.player === player);
  if (!options.length) return null;
  const view = playerView(game, player);
  const me = view.players[player];
  const of = (type) => options.filter((a) => a.type === type);
  const planned = me.hand.find((c) => c.type === "formation");
  const wanted = new Set(me.formationZone ? formationSlots(view, player) : planned?.slots ?? planned?.slotOptions?.[0] ?? [0, 1, 2]);
  const inFormation = (a) => (wanted.has(a.slot) ? 0 : 1);
  const handCard = (a) => me.hand[a.card] ?? me.hand.find((c) => c.id === a.card);

  // Choices the engine is waiting on.
  if (view.pending?.type === "chooseLoss") {
    // As the attacker, take out the strongest of the tied units (highest Attack plus Defense).
    const power = (a) => { const s = unitStats(view, view.pending.owner, a.slot); return s.attack + s.defense; };
    return of("chooseLoss").sort((a, b) => power(b) - power(a))[0];
  }
  if (view.pending?.type === "trapResponse") return of("trapResponse")[0]; // always use the Trap (the last option is pass)
  if (view.pending?.type === "pickpocket") {
    // Take an Artifact first (it can switch off our Formation), then Equipment, then an Item.
    const rank = { artifact: 0, equipment: 1, item: 2 };
    return of("pickpocket").filter((a) => a.slot !== null).sort((a, b) => rank[a.kind] - rank[b.kind])[0] ?? of("pickpocket")[0];
  }
  if (view.pending?.type === "specialDraw") {
    // Prefer the Special Deck with the most cards left.
    return of("specialDraw").sort((a, b) => me.specialDecks[b.deck].cards.length - me.specialDecks[a.deck].cards.length)[0];
  }
  if (view.pending?.type === "graduate") {
    const fromDeck = (a) => (view.pending.cards.find((c) => c.id === a.card)?.from === "deck" ? 0 : 1);
    return of("graduate").sort((a, b) => inFormation(a) - inFormation(b) || fromDeck(a) - fromDeck(b))[0];
  }

  const enroll = of("enroll")[0];
  const studentId = me.fieldEffect?.academy?.enroll;
  const pick =
    of("activateSet")[0] || // set Spells (Fire Arrow) fire as soon as they can
    (!me.formationZone && (of("setFormation")[0] || of("deckFormation")[0])) ||
    (!me.fieldEffect && of("setField")[0]) ||
    of("promote").sort((a, b) => inFormation(a) - inFormation(b))[0] ||
    enroll ||
    of("summon")
      .filter((a) => !(enroll && (handCard(a)?.cardId ?? handCard(a)?.id) === studentId))
      .sort((a, b) => inFormation(a) - inFormation(b) || handCard(b).grade - handCard(a).grade || a.slot - b.slot)[0] ||
    of("equip").sort((a, b) => inFormation(a) - inFormation(b) || me.ups[b.slot].grade - me.ups[a.slot].grade)[0] ||
    of("cast")[0] ||
    // Set Traps that do something, only in slots the Formation doesn't need, so it stays active.
    of("setTrap").filter((a) => inFormation(a) && handCard(a)?.type === "trap" && handCard(a)?.response)[0] ||
    // Artifacts go on Formation units, so they can be activated when it attacks.
    of("attach").filter((a) => !inFormation(a))[0] ||
    // If the attack wouldn't get through, swap a stronger unit into the Formation when that makes it land.
    (!attackPreview(view, player).hits && of("move").find((a) => attackPreview(afterMove(view, player, a), player).hits)) ||
    (of("attack").find((a) => a.artifact == null) && attackPreview(view, player).hits && of("attack").find((a) => a.artifact == null)) ||
    // Blinding Beacon only when the plain attack can't get through: blinded, it lands for 1 counter.
    of("attack").filter((a) => a.artifact != null && attackPreview(view, player, { artifact: a.artifact }).hits)[0] ||
    of("nextPhase")[0] ||
    of("endTurn")[0];
  return pick ?? options[0];
}

// The view as it would be after a move (a swap when the target slot holds a unit), for previews.
function afterMove(view, player, { from, to }) {
  const ups = [...view.players[player].ups];
  [ups[from], ups[to]] = [ups[to], ups[from]];
  return { ...view, players: view.players.map((q, k) => (k === player ? { ...q, ups } : q)) };
}

export default chooseAction;
