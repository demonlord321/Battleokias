# Battle'O'Kias — Project Plan

A trading card game built from scratch in HTML, CSS and JavaScript (runs in the browser).
Rules engine is plain JS with no graphics; cards are data in JSON.

**Roles:** Dyllan (design and rules), Developer (game logic / rules engine),
Mapmaker (game board and screens), Advisor (balance reviews), Planner (plan and docs).

## Milestone 0.5: Main menu (first)
- [x] Project skeleton: `index.html`, `style.css`, `src/` with a simple screen switcher, Mapmaker
- [x] Main menu screen: game title "Battle'O'Kias" and a New Game button, Mapmaker
- [x] New Game opens an empty game screen stub (placeholder for the board), Mapmaker
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
- [ ] `cards.json` card definitions
- [ ] Deck, seeded shuffle, draw, hand limits
- [ ] Game state; every move is an action passed to one `applyAction` function
- [ ] Turn phases, playing cards, resources, combat, win check
- [ ] Two random bots play full games in Node; unit tests

## Milestone 2: Playable board
- [ ] Board layout mock-up: hands, fields, decks, graveyards, HP and resources, Mapmaker
- [ ] Board rendering wired to the engine state, Mapmaker + Developer
- [ ] Click or drag to play and attack, End Turn button, game log
- [ ] Hot-seat play

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
