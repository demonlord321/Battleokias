# Battle'O'Kias — Project Plan

A trading card game built from scratch in HTML, CSS and JavaScript (runs in the browser).
Rules engine is plain JS with no graphics; cards are data in JSON.

**Roles:** Dyllan (design and rules), Developer (game logic / rules engine),
Mapmaker (game board and screens), Advisor (balance reviews), Planner (plan and docs).

## Milestone 0.5: Main menu (first)
- [x] Project skeleton: `index.html`, `style.css`, `src/` with a simple screen switcher, Mapmaker
- [x] Main menu screen: game title "Battle'O'Kias" and a New Game button, Mapmaker
- [x] New Game opens an empty game screen stub (placeholder for the board), Mapmaker
- [x] Tutorial button on the menu, opening a placeholder Tutorial screen, Mapmaker
- [ ] Load, Settings and Quit come later

## Milestone 0: Rules on one page (Dyllan, with Planner)
- [ ] Win condition
- [ ] Resource system
- [ ] Turn phases
- [ ] Card types and board zones
- [ ] Deck size, starting hand, card limits
- [ ] Paper playtest with 15 to 20 cards (Advisor's suggestion)

## Milestone 1: Headless rules engine (Developer)
- [x] Engine skeleton in `src/engine/`: seeded RNG, per-player deck/hand/field/graveyard state, `applyAction()` (End Turn only), `npm test`
- [ ] `cards.json` card definitions (`id`, `name`, `type`, `cost`, `level`, `text` + per-type fields), Developer
- [x] Card faces: frame colour per type, Signet symbols top left, cost top right, unit image/Attack/Defense/Formation panel, Mapmaker
- [x] Single-Signet deck check (`checkDeck`), Developer
- [ ] Card catalogue: master `data/cards.json` (IDs like `ARM-001`), checker script, generated `CARDS.md`. Dyllan edits the JSON directly and pushes new cards, Developer + Planner
- [ ] Card types stage 1: Units, Spells, Traps
- [ ] Card types stage 2 (one at a time): Field Spells, Equipment, Artifacts, Monsters (after unit attacks are designed)
- [x] Coin flip, opening deal (4 and 5), Draw Phase each turn, seeded shuffle
- [ ] Hand limits, empty Draw Pile rule
- [ ] Game state; every move is an action passed to one `applyAction` function
- [ ] Turn phases, playing cards, resources, combat, win check
- [ ] Two random bots play full games in Node; unit tests

## Milestone 1.5: First Arms vs Arms test game (current focus)
Uses the placeholder rules in `RULES.md`; Dyllan refines them as we play.
- [x] Arms-only sample cards in `data/cards.json`: 10 units, Grades 1 to 6, Developer (Dyllan to refine)
- [ ] Add Dyllan's Student/Apprentice/Graduate of Arms (Grades 1-3) to `data/cards.json` and the test decks, Developer
- [x] Unit `grade` field replaces `cost`/`level`, Developer + Mapmaker
- [x] Two 30-card Arms decks built from them, Developer
- [x] Summon a unit from hand to an empty UPS slot, paying Energy, Developer (engine) + Mapmaker (click/drag)
- [x] Battle Phase: units attack down their column; unit vs unit and direct Defense damage, Developer
- [x] Phase flow: Draw, Preparation I, Battle, End, with a button to advance, Mapmaker
- [x] Promotion: exactly one Grade up, costs the difference, one per turn, Developer (`promote` move) + Mapmaker (highlight valid units)
- [x] Win screen when Defense hits 0, Mapmaker
- [x] Hot-seat play so Dyllan can test both sides, Mapmaker
- [ ] Dyllan playtests and replaces placeholder rules, Planner updates `RULES.md`

## Milestone 2: Playable board
- [x] Board layout: 3x3 UPS, Special Deck Zones, Grave, Draw, Field Effect Zone, mirrored opponent, Mapmaker
- [x] Board wired to engine state (`ups`, `specialZones`, `fieldEffect`), turn and phase banner, Mapmaker + Developer
- [x] Hand zone with player stats panels (Name, Defense, Energy), Mapmaker
- [x] Energy engine: max starts 1, +1 per own turn to 10, refills each turn, Developer
- [x] Starting Defense Points: 1000 placeholder (`STARTING_DEFENSE` in `src/engine/state.js`), Developer
- [ ] Damage formula, waiting on Dyllan's design
- [ ] Board rendering wired to the engine state, Mapmaker + Developer
- [ ] Click or drag to play and attack, End Turn button, game log
- [ ] Hot-seat play

## Milestone 2.5: Tutorial (also our demo)
- [ ] Tutorial script written from the Milestone 0 rules: one step per rule (win condition, resource, playing a card, attacking, end turn), Planner drafts, Dyllan approves
- [ ] Steps stored as data in `data/tutorial.json` (text, highlight target, allowed action), so wording changes need no code
- [ ] Scripted match support in the engine: fixed decks, fixed seed, and only the step's allowed action is accepted, Developer
- [ ] Tutorial overlay on the board: text box, highlighted zone or card, Next button, Mapmaker
- [ ] Rules reference pages reachable from the tutorial, Mapmaker
- [ ] Ends with a short free game against a simple opponent, so it doubles as the demo

## Milestone 3: Opponent AI
- [ ] Heuristic AI, single-player against it

## Milestone 4: Card effects
- [ ] Data-driven abilities and keywords, targeting
- [ ] First set of 20 to 30 cards (Advisor reviews balance)

## Milestone 5: Decks and collection
- [ ] Card browser with filters, deck builder saved locally

## Milestone 6: Polish
- [ ] Card frames and art, animations, sound, full main menu

## Later
Booster packs, campaign, online multiplayer.
