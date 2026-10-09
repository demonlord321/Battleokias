// Card and deck rules that don't depend on the board (RULES.md, Signets).

export const SIGNETS = ["martial", "mystic", "alchemy"]; // School of Martial, Mystic and Alchemy (Dyllan, 9 Oct: only the three base Signets for now)

// The Battle'O'Kias Signet (Dyllan, 9 Oct) isn't a deck theme: a card with it fits every deck.
// Placeholder (QUESTIONS.md): it also counts as sharing a Signet with any card.
export const NEUTRAL_SIGNET = "battleokias";
export const CARD_SIGNETS = [...SIGNETS, NEUTRAL_SIGNET];
export const fitsDeck = (card, signet) => !!card?.signets && (card.signets.includes(signet) || card.signets.includes(NEUTRAL_SIGNET));
export const sharesSignet = (a, b) => {
  const sa = a?.signets ?? [], sb = b?.signets ?? [];
  if (!sa.length || !sb.length) return false;
  return sa.includes(NEUTRAL_SIGNET) || sb.includes(NEUTRAL_SIGNET) || sa.some((s) => sb.includes(s));
};

// A deck is built around one Signet, and every card in it must carry that Signet.
// A card can have several Signets, so it fits any deck that matches one of them.
// Returns a list of problems; an empty list means the deck is legal.
export function checkDeck(cards, signet) {
  const problems = [];
  if (!SIGNETS.includes(signet)) problems.push(`Unknown Signet "${signet}".`);
  for (const card of cards) {
    if (!fitsDeck(card, signet)) {
      problems.push(`${card.name ?? card.id} doesn't carry the ${signet} Signet.`);
    }
  }
  return problems;
}
