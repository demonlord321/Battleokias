// Round-robin balance sim (Developer). Every deck style in tools/sim-decks.json
// plays every other one with the computer player from src/engine/bot.js, swapping who goes first each game.
//   npm run sim            (500 games per pairing)
//   npm run sim -- 2000    (more games, steadier numbers)
// A row's number is how often that deck beats the column's deck.
import { readFileSync } from "node:fs";
import { newGame, applyAction } from "../src/engine/engine.js";
import { chooseAction } from "../src/engine/bot.js"; // the same computer player the board uses

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url)));
const cards = read("../data/cards.json");
const decks = read("../data/decks.json");
const styles = Object.entries(read("./sim-decks.json")).filter(([k]) => !k.startsWith("_"));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const GAMES = Number(process.argv[2]) || 500;

function build({ from, swap = [], cards: list }) {
  let ids = list ? [...list] : [...decks[from]];
  for (const [out, inn, count] of swap) {
    let k = 0;
    ids = ids.map((id) => (id === out && k++ < count ? inn : id));
  }
  return ids;
}
const instances = (ids) => {
  const seen = {};
  return ids.map((id) => ({ ...byId[id], cardId: id, id: `${id}#${(seen[id] = (seen[id] ?? 0) + 1)}` }));
};

// "special": up to four { type, cards: [ids] } Special Decks (RULES.md, Preparation Phase II).
const specials = (spec) => (spec.special ?? []).map((d) => (d ? { type: d.type, cards: instances(d.cards) } : null));

function play(a, b, seed) {
  const game = newGame({ seed, decks: [instances(a.main), instances(b.main)], specialDecks: [specials(a.spec), specials(b.spec)] });
  for (let guard = 0; game.winner === null && guard < 5000; guard++) applyAction(game, chooseAction(game));
  return game.winner;
}

const lists = styles.map(([name, spec]) => [name, { main: build(spec), spec }]);
const names = lists.map(([n]) => n);
const wins = names.map(() => names.map(() => null));
for (let i = 0; i < lists.length; i++)
  for (let j = i + 1; j < lists.length; j++) {
    let iWins = 0;
    for (let seed = 0; seed < GAMES; seed++) {
      const iFirst = seed % 2 === 0;
      const winner = iFirst ? play(lists[i][1], lists[j][1], seed) : play(lists[j][1], lists[i][1], seed);
      if (winner === (iFirst ? 0 : 1)) iWins++;
    }
    wins[i][j] = iWins / GAMES;
    wins[j][i] = 1 - iWins / GAMES;
  }

const pct = (x) => (x === null ? "-" : `${Math.round(x * 100)}%`);
const w = Math.max(...names.map((n) => n.length), 8);
console.log(`${GAMES} games per pairing. Row deck's win rate against the column deck.\n`);
console.log(["".padEnd(w), ...names.map((n) => n.padStart(w)), "Average".padStart(w)].join(" "));
wins.forEach((row, i) => {
  const avg = row.filter((x) => x !== null).reduce((s, x) => s + x, 0) / (row.length - 1);
  console.log([names[i].padEnd(w), ...row.map((x) => pct(x).padStart(w)), pct(avg).padStart(w)].join(" "));
});
