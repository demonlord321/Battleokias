// Card and deck rules that don't depend on the board (RULES.md, Signets).

export const SIGNETS = ["arms", "magic", "alchemy", "mercenary"]; // School of Arms, Magic, Alchemy, and the Mercenaries

// A deck is built around one Signet, and every card in it must carry that Signet.
// A card can have several Signets, so it fits any deck that matches one of them.
// Returns a list of problems; an empty list means the deck is legal.
export function checkDeck(cards, signet) {
  const problems = [];
  if (!SIGNETS.includes(signet)) problems.push(`Unknown Signet "${signet}".`);
  for (const card of cards) {
    if (!card.signets?.includes(signet)) {
      problems.push(`${card.name ?? card.id} doesn't carry the ${signet} Signet.`);
    }
  }
  return problems;
}
