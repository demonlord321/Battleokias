# Open questions for Dyllan

Write your answer under each question, after **Answer:**, then commit and push. Planner checks every few hours, folds your answers into `RULES.md`, and removes the answered questions from this list.

Each question has a **placeholder**, which is what the game does for now so the team can keep building. If the placeholder is fine, just write "ok".

## New (9 Oct)

### 1. Card names after the Signet rename
Arms is now Martial and Magic is now Mystic. Do card names change too: Student, Apprentice and Graduate of Arms, and Arms Academy?
**Placeholder:** the names stay as they are; only the Signet is renamed.
**Answer:**

### 2. Card ID prefixes
Named units now use Signet, short name, then a number (`ARM-SEN-001`). With Arms renamed, should IDs start `MAR-` instead of `ARM-` (and `MYS-` for Mystic)?
**Placeholder:** keep `ARM-` for now so nothing breaks.
**Answer:**

### 3. Last Stand: whose Battle Phases count?
Drazel is destroyed after the third Battle Phase Last Stand is active for. Do the opponent's Battle Phases count, or only yours?
**Placeholder:** only your own, starting with the turn you start it.
**Answer:**

## Cards

### 4. Blinding Beacon's two-turn cooldown
Does it count your own turns?
**Placeholder:** yes. Use it on your turn 3, and it's ready again on your turn 5.
**Answer:**

### 5. Frontal Assault's Damage and Defense Grade
**Placeholder:** Damage Grade 1, Defense Grade 0.
**Answer:**

## Signets and deck building

### 6. Minimum Special Deck size
A Special Deck with one card means you're guaranteed to draw it at your first Phase II. Should there be a minimum size?
**Placeholder:** no minimum.
**Answer:**

### 7. The 15/10/10 unit spread
Is "15 Grade 1, 10 Grade 2, 10 Grade 3" a deck-building rule (minimums or exact numbers), or just how starter and test decks are built?
**Placeholder:** only for the starter and test decks.
**Answer:**

## Units and promotion

### 8. From Graduate to Grade 4
How does a Graduate of Arms move up to Grade 4?
**Placeholder:** any named Grade 4 unit whose main Signet is Martial can promote a Graduate of Arms.
**Answer:**

### 9. Named units: one of a kind?
Can you have two copies of the same named unit (say, two Drazels) on your field at once?
**Placeholder:** only one copy of a named unit on your field at a time, but no deck limit.
**Answer:**

### 10. What does a Class do?
Does a Class (Swordsman, Guardian, Rogue) do anything in play, for example cards that need a certain Class, or is it just a label for now? Are there more Classes planned?
**Placeholder:** just a label for now.
**Answer:**

### 11. Promoted units attacking
Can a promoted unit attack on the turn it's promoted?
**Placeholder:** yes, as long as the unit underneath was already on the field at the start of the turn.
**Answer:**

### 12. The stack under a promoted unit
When a promoted unit is destroyed or retired, do the cards stacked under it go to the Grave too?
**Placeholder:** yes, the whole stack goes.
**Answer:**

### 13. Swapping units
Can two units swap slots in one move during Prep Phase I?
**Placeholder:** yes.
**Answer:**

### 14. Summons per turn
Is there a limit on how many units you can summon in one turn?
**Placeholder:** no limit, only your Energy.
**Answer:**

## Formation from the deck

### 15. Summoning a Formation from your deck
You can summon a Formation from your deck once per game if you have none by round three.
- Does "round three" mean your own third turn?
- Does "have none" mean none in your hand **and** none in your Formation Zone?
- Does it go straight into the Formation Zone or into your hand, and does it still cost its normal Energy?
**Placeholder:** from your own third turn on, in Prep Phase I; none in hand or zone; straight into the Formation Zone at normal cost.
**Answer:**

## Board

### 16. Field Effect Zone
Does it hold one Field Spell at a time? What happens if you play a second one?
**Placeholder:** one at a time, and a new one replaces the old one, which goes to the Grave.
**Answer:**

## Balance (from Advisor)
Balance tuning is on hold until the full Martial collection is in, and then we run sims. Use these to note your thinking, or a direction you'd like tested in that pass. Advisor adds new ones here as they come up. Win rates are from computer games, with deck builds rather than exact mirrors.

### B1. Drazel's Katana
At cost 3, a Katana deck wins 76% against the test deck (72% on average in Developer's 9 Oct run, after the empty-pile change). You expected that to drop once decks are 60 cards and other Special Deck types exist. Parked ideas: the Katana breaks after its first special kill, or Special Decks need a minimum size (see question 15).
**Placeholder:** no change until the sim pass.
**Answer:**

### B2. Vanguard Charge vs Frontal Assault
A Vanguard Charge deck beats a Frontal Assault deck 92% of the time and averages 89% overall (Developer's 9 Oct run, 50 games per pairing), because Damage Grade 2 deals double counters. Advisor's suggested fix: give Frontal Assault Defense Grade 1 (that brought it to about 43%). You were leaving it in case Equipment balances it.
**Placeholder:** no change until the sim pass.
**Answer:**

### B3. Attacking, then swapping to Line Defense
Since Formations can be swapped in Prep Phase II, a player can attack with Vanguard Charge and then switch to Line Defense for the opponent's turn. Sending the old Formation to the Grave limits this, but Advisor wants to test whether it's still too strong when done every turn.
**Placeholder:** allowed, tested in the sim pass.
**Answer:**

### B4. Drazel, the Bloody Blade: promote or summon?
When promoted, he copies the promoted unit's Attack and Defense; when summoned normally, he is 4000 / 2500. Advisor wants to check that one way isn't always better than the other.
**Placeholder:** as written, tested in the sim pass.
**Answer:**

### B5. Last Stand with Vanguard Charge
Last Stand's +50% for 3 turns stacks with Vanguard Charge's x1.5 Formation Attack. Advisor wants to check that the combination isn't too strong.
**Placeholder:** they stack, tested in the sim pass.
**Answer:**

### B6. One-card Special Decks
Special Decks have no minimum size, so a Special Deck of one strong card is drawn for certain at your first Phase II. (Same as question 7.)
**Placeholder:** no minimum until the sim pass.
**Answer:**

### B7. Fire Arrow burn decks
Fire Arrow deals 1 Damage Counter for 1 Energy and fits all three Signets. Ten counters ends a game, so a deck built around it could skip combat altogether.
**Placeholder:** no change until the sim pass.
**Answer:**

### B8. Galent's 4000 Defense
Galent was behind most of the stalled games. Advisor wants to re-check him now that an empty Draw Pile deals a counter each turn.
**Placeholder:** no change until the sim pass.
**Answer:**

For reference, Developer's 9 Oct averages: Vanguard Charge 89%, Katana 72%, Drazel 48%, and Frontal Assault, Gear and Academy around 30%. Every game ended with a winner.

## Later (no rush)
Answer these whenever you're ready. Nothing is waiting on them yet.
- What is the Grade range (Energy caps at 10)? Do Grades map to rarity names like Common, Rare or Legendary?
- What do Items do, and how do Monsters work?
- What triggers a unit's own Formation Effect (the "Formation effect text" on unit cards), and how does it relate to Formation cards?
- How should each Signet shape its units (stats, abilities, play style)?
- What fills the rest of a 60-card deck, beyond the 35 units, Formations and Arms Academy?
