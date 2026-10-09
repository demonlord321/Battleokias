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
- [x] Win condition (10 Damage Counters)
- [x] Resource system (Energy, Hearthstone-style)
- [x] Turn phases: Start, Draw, Preparation I, Battle, Preparation II, End (engine `56bb658`, tracker `5293262`)
- [x] Card types and board zones
- [x] Deck size, starting hand, card limits (60 cards; units unlimited, other cards max 3)
- [ ] Paper playtest with 15 to 20 cards (Advisor's suggestion)

## Milestone 1: Headless rules engine (Developer)
- [x] Engine skeleton in `src/engine/`: seeded RNG, per-player deck/hand/field/graveyard state, `applyAction()` (End Turn only), `npm test`
- [x] `cards.json` card definitions (`id`, `name`, `type`, `cost`, `level`, `text` + per-type fields), Developer
- [x] Card faces: frame colour per type, Signet symbols top left, cost top right, unit image/Attack/Defense/Formation panel, Mapmaker
- [x] Single-Signet deck check (`checkDeck`), Developer
- [ ] Card catalogue: master `data/cards.json` (IDs like `ARM-001`), checker script, generated `CARDS.md`. Dyllan edits the JSON directly and pushes new cards, Developer + Planner
- [ ] Card types stage 1: Units, Spells, Traps
- [ ] Card types stage 2 (one at a time): Field Spells, Equipment, Artifacts, Monsters (after unit attacks are designed)
- [x] Coin flip, opening deal (4 and 5), Draw Phase each turn, seeded shuffle
- [ ] Hand limits (open)
- [x] Empty Draw Pile (`292c741`), updated 8 Oct: when you'd draw from an empty main Draw Pile, take 1 Damage Counter instead (placeholder: 1 per Draw Phase). Empty Special Decks still just skip. This replaces the skip from `788c458`, so stalled games end, Developer; show the counter on the board, Mapmaker
- [x] Game state; every move is an action passed to one `applyAction` function
- [x] Turn phases, playing cards, resources, combat, win check
- [x] Two random bots play full games in Node; unit tests

## Milestone 1.5: First Martial vs Martial test game (current focus)
Uses the placeholder rules in `RULES.md`; Dyllan refines them as we play.
- [x] Martial-only sample cards in `data/cards.json`: 10 units, Grades 1 to 6, Developer (Dyllan to refine)
- [x] Formations: Frontal Assault, Damage/Defense Grade, Damage Counters (lose at 10), unit destruction to the Grave, Developer + Mapmaker
- [x] Formation battles balanced in bot games (first player wins 49%, median 15 turns)
- [x] Add Dyllan's Student/Apprentice/Graduate of Arms (Grades 1-3) to `data/cards.json` and the test decks, Developer
- [x] Unit `grade` field replaces `cost`/`level`, Developer + Mapmaker
- [x] Two 30-card Martial decks built from them, Developer
- [x] Summon a unit from hand to an empty UPS slot, paying Energy, Developer (engine) + Mapmaker (click/drag)
- [x] Battle Phase: units attack down their column; unit vs unit and direct Defense damage, Developer
- [x] Phase flow: Draw, Preparation I, Battle, End, with a button to advance, Mapmaker
- [x] Promotion: exactly one Grade up, costs the difference, one per turn, Developer (`promote` move) + Mapmaker (highlight valid units)
- [x] Win screen when Defense hits 0, Mapmaker
- [x] Hot-seat play so Dyllan can test both sides, Mapmaker
- [x] Promotion lines (`d5c7f2e`, `9862607`; test deck still to rebuild): a unit only promotes into the next unit of its own line, and the line comes from the card's first Signet (Student to Apprentice to Graduate of Arms). Retire the placeholder Martial units of Grades 1 to 3 (ARM-001, 003, 004, 005) from the test decks, since the Martial line has only those three, Developer
- [x] Drazel, Instructor of the Blade (`931c2cc`, `a7db9af`) (Grade 4, Martial/Mercenary, Swordsmen, 4000 Attack; Defense 1000 when summoned, or the printed Defense of the unit he promotes): add the `mercenary` Signet and the card, Developer
- [x] Practice Gear works on Grades 1 to 3 only (`8c5a9b2`, `4ca0cc3`): it can't be equipped to Grade 4+, and it goes to the Grave when its unit is promoted to Grade 4+, Developer
- [x] Drazel copies the total Defense (`9e1a126`) (Equipment included) when the unit's Equipment stays on through promotion, without counting its Defense bonus twice, Developer
- [x] Drazel's Katana (`5b6d5c6`, `d3f58b0`, `94a0461`) (specialised Equipment, Drazel only): +500 Attack; while Drazel holds it and is in the attacking Formation, a landed hit destroys the defender's unit with the highest Attack + Defense instead of the lowest Grade; a way for Equipment to name the one unit it can go on, Developer + Mapmaker
- [ ] Katana: Dyllan removed the cost 2 and 1-per-deck limits (back to cost 1, 3 copies; done in `ccd93fd`). Re-check its win rate once decks are 60 cards and other Special Deck types exist, Advisor. Parked ideas: breaks after its first special kill; minimum Special Deck size
- [ ] Vanguard Charge still wins over 90%; Dyllan to revisit (Frontal Assault Defense Grade 1 got it to about 43%)
- [x] Katana costs 3, printed on the card (Katana deck now 76% vs the test deck)
- [x] Player Grade (`97ae452`, `300d835`, `e55b4eb`, `53f63a1`, board `864e430`): highest Grade you've had on the field this game, never drops (`p.playerGrade`; panel shown in `cc95f79`, needs to read the stored value); you can't summon a unit more than one Grade above it, even if its cost is reduced. Engine check plus `playerGrade` in the state, Developer; shown in the player stats panel, Mapmaker
- [ ] Balance pass once the full Martial collection is in (on hold until then, per Dyllan): Katana, Vanguard Charge, attack-then-swap to Line Defense every turn (Advisor), Bloody Blade promote-vs-summon, Last Stand with Vanguard, Advisor + Developer. Balance questions for Dyllan are in `QUESTIONS.md` (B1 to B8), and Advisor adds new ones there
- [x] Stand Strong (first Trap; engine `fb2b834` to `340e4ed`, board in progress): set face-down in an empty unit slot in Prep Phase I or II; on the opponent's landed hit, it goes to the Grave instead of the destroyed unit. Needs set-card support and the opponent-turn response choice, Developer; face-down card in a slot and the response hand-over, Mapmaker; computer player uses it, Developer
- [x] Spells set into empty unit slots too, the same way as Traps (`59b7451`, `0992524`)
- [x] Fire Arrow (first real Spell; `280465f` to `21306b3`): cast in Prep I or II, or set and fire in your own Start, Prep I, Battle, Prep II or End Phase; deals 1 Damage Counter. Engine: cast action and activating set Spells on your own turn, Developer; cast and fire buttons, Mapmaker
- [x] Formations playable in Prep I or II, and swapping by playing a new one on top (old one to the Grave, normal cost) (`9ab0a74`, checked on the board)
- [x] Line Defense (Formation; `280465f` to `21306b3`): any one full row, Attack 0, Defense = row's Attack + Defense, Damage Grade 0, Defense Grade 1, cost 2, can't attack. Engine: row-choice slots, `combine` for attack-into-defense, no attack at Damage Grade 0, Developer; Mapmaker shows which row counts
- [ ] Player picks the condition when a Formation has several met (Dyllan, 8 Oct), e.g. Line Defense with two full rows. Engine: a chosen-row field on the Formation and an action to pick it (Developer). Board: a row picker that pops up when more than one row fits (Mapmaker). Timing placeholder in RULES.md
- [x] Blinding Beacon (first Artifact; engine `1703716` to `12811d9`, board `068460a`; Signets Martial, Mystic, Alchemy): attach to a unit in Prep I or II, 2 charges, two-turn cooldown, deactivates the opponent's Formation for your Battle Phase; Artifact attach support, Developer; Beacon on the unit, charge and cooldown display, activate button, Mapmaker
- [ ] Named units (Grade 4+): flavour text and Class fields in `data/cards.json`, shown on the card face, Developer + Mapmaker. Classes so far: Swordsman, Guardian, Rogue
- [x] Fix `main` after Dyllan's `6296c33` (`64d3b26`) (`check-cards` fails and 2 tests fail): let the checker skip `{"Comment"}` section headers, give Galent a variable Attack, add Sena's `text`, and drop `ARM-001` Iron Recruit from the Martial deck and `tools/sim-decks.json`, Developer
- [x] Galent, The Unbreakable Shield (`ARM-MER-002`, engine `6cfd57b`): Grade 4 Guardian, 4000 Defense; Attack 1000 when summoned, or the promoted unit's Attack (Drazel in reverse), Developer + Mapmaker
- [x] Sena, Mistress of the Shadows (`ARM-ASS-002`): Grade 4 Rogue, 3500/3500; Pickpocket destroys 1 opposing Item, Artifact or Equipment when she's summoned. Engine done (`3f995fb`, `pending.type "pickpocket"`), Developer; target picker on the board (`267717d`), Mapmaker
- [x] Formation cost is now its Damage Grade (`226ee47`), and Damage Grade 0 costs 1 (Frontal Assault 1, Vanguard Charge 2, Line Defense keeps its printed 2 for now), Developer
- [x] On a tie for lowest Grade, the attacker picks which unit is destroyed instead of the defender. Engine `d8bfbe7`, Developer; picker on the board `267717d`, Mapmaker
- [x] Signet rename (Dyllan, 9 Oct; done `ee3ce01` to `726f644`, board `95102de`): Arms is now **Martial** and Magic is now **Mystic**, so the three starting Signets are Martial, Mystic and Alchemy. Rename the Signet values in `data/cards.json`, the engine and the tests (`arms` to `martial`, `magic` to `mystic`), Developer; Signet icons and labels on cards and the board, Mapmaker. Card names like Student of Arms and Arms Academy stay for now (QUESTIONS.md #1)
- [x] Dyllan's answers of 8 Oct (`dd65ab5`), Developer + Mapmaker (done up to `726f644`, except the cards not yet in `cards.json`):
  - Only the three base Signets for now. Remove Mercenary and Hero from every card (Drazel, Galent, Line Defense, Drazel's Katana, Katana of the Fallen Hero, the Bloody Blade) and drop the Mercenary coin icon
  - Frontal Assault and Vanguard Charge become Martial only (Fire Arrow and Blinding Beacon keep all three)
  - Line Defense costs 1
  - Named unit IDs: Signet, short name, number. Drazel `ARM-DRA-001`, Bloody Blade `ARM-DRA-002`, Galent `ARM-GAL-001`, Sena `ARM-SEN-001` (prefix stays `ARM-` for now, QUESTIONS.md #2)
  - "Summon" includes promotion, so Sena's Pickpocket also triggers when she's promoted into
  - Fire Arrow can fire on the turn it's set
  - When the Bloody Blade's Last Stand fetches Katana of the Fallen Hero, Drazel's Katana goes to the Grave; Drazel's Katana stays on through promotion to the Bloody Blade and can be equipped to him directly
  - Last Stand destroys Drazel after the third Battle Phase it's active for (placeholder: his owner's Battle Phases, QUESTIONS.md #3)
- [ ] Add Bloody Blade (`ARM-DRA-002`), Katana of the Fallen Hero and Last Stand to `cards.json` once Dyllan writes them up, Developer
- [x] Remove the 11 placeholder units (done `5e91af6`, `9befed6`) (Dyllan, 9 Oct): Spear Militia, Squire, Apprentice Mage, Flask Thrower, Goblin Scout, Shield Sergeant, Crossbow Sniper, Banner Bearer, Veteran Swordsman, Pike Captain, War Knight. Rebuild the Martial test deck and sim decks from the units that are left (Student, Apprentice and Graduate of Arms, Drazel, Galent, Sena), Developer
- [ ] Unit write-ups still missing: a real Formation Effect for every unit, and flavor text for Galent and Sena, Dyllan
- [ ] All open questions for Dyllan are collected in `QUESTIONS.md`. He answers there and Planner folds the answers into `RULES.md`
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
- [x] Computer opponent (Dyllan's request; `9850f13`, decisions use `playerView`, so it can't see your hand or decks): Player 2 played by a bot that picks from `legalActions`, starting simple (fill the Formation, promote, attack when the hit lands), Developer
- [x] Start screen choice (`f6006b5`): Play vs Computer or Hot-seat; the computer's moves play out with a short delay and show in the game log; no handover screen in vs Computer mode, Mapmaker

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
