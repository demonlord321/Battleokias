// Run with: npm run check-cards
// Reads data/cards.json and lists anything wrong in plain words.
import { readFileSync } from "node:fs";
import { checkCards } from "../src/engine/cardCheck.js";

const path = new URL("../data/cards.json", import.meta.url);
let cards;
try {
  cards = JSON.parse(readFileSync(path, "utf8"));
} catch (err) {
  console.error(`data/cards.json isn't valid JSON: ${err.message}`);
  console.error("Common causes: a comma after the last card or field, or a missing quote.");
  process.exit(1);
}
const problems = checkCards(cards);
if (problems.length) {
  console.error(`Found ${problems.length} problem(s) in data/cards.json:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`data/cards.json looks good: ${cards.length} cards.`);
