// Run with: npm run check-cards
// Reads data/cards.json and data/decks.json and lists anything wrong in plain words.
import { readFileSync, existsSync } from "node:fs";
import { checkCards, checkDecks, isComment } from "../src/engine/cardCheck.js";

function load(file) {
  try {
    return JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"));
  } catch (err) {
    console.error(`data/${file} isn't valid JSON: ${err.message}`);
    console.error("Common causes: a comma after the last card or field, or a missing quote.");
    process.exit(1);
  }
}

const cards = load("cards.json");
const problems = checkCards(cards);
const hasDecks = existsSync(new URL("../data/decks.json", import.meta.url));
if (hasDecks && Array.isArray(cards)) problems.push(...checkDecks(load("decks.json"), cards));
if (problems.length) {
  console.error(`Found ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`data/cards.json looks good: ${cards.filter((c) => !isComment(c)).length} cards.${hasDecks ? " data/decks.json looks good too." : ""}`);
