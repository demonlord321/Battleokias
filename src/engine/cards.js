// Card and deck rules that don't depend on the board (RULES.md, Signets).

export const SIGNETS = ["martial", "mystic", "alchemy"]; // School of Martial, Mystic and Alchemy (Dyllan, 9 Oct: only the three base Signets for now)

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
