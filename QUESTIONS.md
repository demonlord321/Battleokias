# Open questions for Dyllan

Write your answer under each question, after **Answer:**, then commit and push. Planner checks every few hours, folds your answers into `RULES.md`, and removes the answered questions from this list.

Each question has a **placeholder**, which is what the game does for now so the team can keep building. If the placeholder is fine, just write "ok".

## New (9 Oct)

### 1. Drazel, Practitioner of the Blade
a) Do Galent and Sena move up a Grade too, or only the Drazel cards? **Placeholder:** only Drazel's cards.
b) If you equip the Katana instantly with Graduation Gift, do you still pay its 3 Energy? **Placeholder:** yes.
c) Does any promotion trigger the Gift, or only promoting a Student, Graduate? **Placeholder:** any promotion.
d) Can the Katana go on every Drazel card now? **Placeholder:** yes.
**Answer:**

### 1b. Drazel, Instructor of the Blade's summon effect
a) What counts as the Practitioner being on the field "for a full turn"? **Placeholder:** he was on the field at the start of your turn.
b) Does the free promotion still use your one promotion for the turn? **Placeholder:** yes.
c) Which Students can the Military Institute bonus summon, and from where? **Placeholder:** any Student (First Year, Second Year or Graduate), from your hand or deck (shuffle after), into empty slots you choose; only one if there's only room for one.
d) Does the two-Student bonus only come with the free promotion on top of the Practitioner? **Placeholder:** yes.
**Answer:**

### 2. Card IDs: codes and named characters
IDs are now type, main Signet, number. Placeholder codes: `UNT` `FRM` `SPL` `TRP` `EQP` `ART` `FLD` for types, `BOK` `MAR` `MYS` `ALC` for Signets. Are those codes OK? And named characters lose their short name (Drazel `ARM-DRA-001` becomes `UNT-MAR-001`, the Bloody Blade `UNT-MAR-004`). Is that fine?
**Placeholder:** the codes above, and named units numbered like any other unit.
**Answer:**

### 3. Last Stand: whose Battle Phases count?
Drazel is destroyed after the third Battle Phase Last Stand is active for. Do the opponent's Battle Phases count, or only yours?
**Placeholder:** only your own, starting with the turn you start it.
**Answer:**

### 3a. The Battle'O'Kias Signet and Martial-only cards
The Students now carry only Battle'O'Kias. Practice Gear, Frontal Assault, Vanguard Charge, Line Defense and Military Institute's extra promotions all work with Martial units. Does a Battle'O'Kias card count as sharing a Signet with every card, so they still work on the Students?
**Placeholder:** yes, Battle'O'Kias counts as sharing a Signet with any card.
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
How does a Student, Graduate move up to Grade 4?
**Placeholder:** any named Grade 4 unit, of any Signet, can promote a Student, Graduate (the Students are Battle'O'Kias now).
**Answer:**

### 9. Named units: one of a kind?
Can you have two copies of the same named unit (say, two Drazels) on your field at once? And how many can a deck hold? Units currently have no copy limit, so a deck could run 20 Senas (Advisor). Options: no limit, cap named units at 3 like other cards, or give each named unit its own limit on the card (like Drazel's Katana).
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

### B9. Sena's stats
Drazel and Galent give up one stat for a big one (about 5000 to 5500 total). Sena has 3500/3500 (7000 total) plus Pickpocket. If Pickpocket is meant to be her strength, Advisor suggests about 2500/2500.
**Placeholder:** 3500/3500 until you decide.
**Answer:**

For reference, Developer's latest averages (9 Oct, six real units only, 20 games per pairing): Vanguard Charge 89%, Katana 77%, Academy 40%, Drazel 39%, Gear 28% and Frontal Assault 27%.
### B10. Instructor promoting Galent
With the main Signet or Class rule, Drazel, Instructor of the Blade can promote Galent and copy his 4000 Defense, giving a 4000/4000 Drazel before the Katana. Advisor is parking this for the sim pass.
**Placeholder:** allowed, no change until the sims.
**Answer:**

## Later (no rush)
Answer these whenever you're ready. Nothing is waiting on them yet.
- What is the Grade range (Energy caps at 10)? Do Grades map to rarity names like Common, Rare or Legendary?
- What do Items do, and how do Monsters work?
- What triggers a unit's own Formation Effect (the "Formation effect text" on unit cards), and how does it relate to Formation cards?
- How should each Signet shape its units (stats, abilities, play style)?
- What fills the rest of a 60-card deck, beyond the 35 units, Formations and Military Institute?
