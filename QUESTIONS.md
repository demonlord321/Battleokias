# Open questions for Dyllan

Write your answer under each question, after **Answer:**, then commit and push. Planner checks every few hours, folds your answers into `RULES.md`, and removes the answered questions from this list.

Each question has a **placeholder**, which is what the game does for now so the team can keep building. If the placeholder is fine, just write "ok".

## New today (8 Oct)

### 1. Games that can never end
When both Draw Piles are empty and neither player can get through (usually because of Galent's 4000 Defense), the game goes on forever. About 1 in 13 computer games end up like this. How should they end: a draw, a win for whoever has dealt more Damage Counters, or something else? (From Developer)
**Placeholder:** the game is counted as a draw.
**Answer:**

### 2. Do Drazel and Galent keep Mercenary?
In your `cards.json`, Drazel and Galent list only Arms, but their IDs (`ARM-MER-001`, `ARM-MER-002`) still say Mercenary. Did you mean to drop Mercenary?
**Placeholder:** both are Arms (main) and Mercenary (sub).
**Answer:**

### 3. Sena's second Signet
Sena's ID is `ARM-ASS-002`. Is "ASS" a new Signet, Assassin for example? Also, there's no `-001` card yet.
**Placeholder:** she is Arms only.
**Answer:**

### 4. Line Defense cost
The card says cost 2, but the new Formation cost rule (no Damage Grade costs 1) gives 1. Which one is right?
**Placeholder:** the printed cost wins, so it stays 2.
**Answer:**

### 5. Forfeit when you can't draw
You wrote "skip the Draw Phase or forfeit". Does the game offer a choice at that moment, or is forfeiting just the normal option to concede at any time?
**Placeholder:** the draw is skipped automatically, and you can always concede.
**Answer:**

### 6. When do you choose a Formation's row?
For Line Defense with more than one full row.
**Placeholder:** you pick when you play the Formation, and you can change it in either of your Prep Phases. If your row breaks on the opponent's turn, the strongest full row is used.
**Answer:**

## Cards

### 7. Drazel, the Bloody Blade: Last Stand
Are the 3 turns three of your own turns?
**Placeholder:** yes, counting the turn you start it.
**Answer:**

### 8. Drazel's Katana and the Bloody Blade
Does Drazel's Katana stay on when Drazel promotes to the Bloody Blade, and can you equip it to the Bloody Blade directly?
**Placeholder:** yes to both.
**Answer:**

### 9. Drazel's Katana when you fetch Katana of the Fallen Hero
What happens to Drazel's Katana?
**Placeholder:** it goes to the Grave.
**Answer:**

### 10. Pickpocket on promotion
Does promoting into Sena count as "summoned", so Pickpocket triggers?
**Placeholder:** no, only a normal summon does.
**Answer:**

### 11. Fire Arrow on the turn it's set
Can a Fire Arrow you set this turn fire in the same turn (for example set in Prep Phase II, fired in the End Phase)?
**Placeholder:** no, not until your next turn.
**Answer:**

### 12. Blinding Beacon's two-turn cooldown
Does it count your own turns?
**Placeholder:** yes. Use it on your turn 3, and it's ready again on your turn 5.
**Answer:**

### 13. Frontal Assault and Vanguard Charge Signets
Your card list from this morning had Frontal Assault as Arms only and Vanguard Charge as Arms/Mercenary. `cards.json` still gives both Arms, Magic and Alchemy. Which is right?
**Placeholder:** what `cards.json` says now (Arms, Magic, Alchemy) until you confirm.
**Answer:**

### 14. Frontal Assault's Damage and Defense Grade
**Placeholder:** Damage Grade 1, Defense Grade 0.
**Answer:**

## Signets and deck building

### 15. Mercenary and Hero as deck Signets
Can you declare Mercenary or Hero as your deck's Signet, the way you declare Arms?
**Placeholder:** yes for both.
**Answer:**

### 16. Minimum Special Deck size
A Special Deck with one card means you're guaranteed to draw it at your first Phase II. Should there be a minimum size?
**Placeholder:** no minimum.
**Answer:**

### 17. The 15/10/10 unit spread
Is "15 Grade 1, 10 Grade 2, 10 Grade 3" a deck-building rule (minimums or exact numbers), or just how starter and test decks are built?
**Placeholder:** only for the starter and test decks.
**Answer:**

## Units and promotion

### 18. From Graduate to Grade 4
How does a Graduate of Arms move up to Grade 4?
**Placeholder:** any named Grade 4 unit whose main Signet is Arms can promote a Graduate of Arms.
**Answer:**

### 19. Named units: one of a kind?
Can you have two copies of the same named unit (say, two Drazels) on your field at once?
**Placeholder:** only one copy of a named unit on your field at a time, but no deck limit.
**Answer:**

### 20. What does a Class do?
Does a Class (Swordsman, Guardian, Rogue) do anything in play, for example cards that need a certain Class, or is it just a label for now? Are there more Classes planned?
**Placeholder:** just a label for now.
**Answer:**

### 21. Promoted units attacking
Can a promoted unit attack on the turn it's promoted?
**Placeholder:** yes, as long as the unit underneath was already on the field at the start of the turn.
**Answer:**

### 22. The stack under a promoted unit
When a promoted unit is destroyed or retired, do the cards stacked under it go to the Grave too?
**Placeholder:** yes, the whole stack goes.
**Answer:**

### 23. Swapping units
Can two units swap slots in one move during Prep Phase I?
**Placeholder:** yes.
**Answer:**

### 24. Summons per turn
Is there a limit on how many units you can summon in one turn?
**Placeholder:** no limit, only your Energy.
**Answer:**

## Formation from the deck

### 25. Summoning a Formation from your deck
You can summon a Formation from your deck once per game if you have none by round three.
- Does "round three" mean your own third turn?
- Does "have none" mean none in your hand **and** none in your Formation Zone?
- Does it go straight into the Formation Zone or into your hand, and does it still cost its normal Energy?
**Placeholder:** from your own third turn on, in Prep Phase I; none in hand or zone; straight into the Formation Zone at normal cost.
**Answer:**

## Board

### 26. Field Effect Zone
Does it hold one Field Spell at a time? What happens if you play a second one?
**Placeholder:** one at a time, and a new one replaces the old one, which goes to the Grave.
**Answer:**

## Later (no rush)
Answer these whenever you're ready. Nothing is waiting on them yet.
- What is the Grade range (Energy caps at 10)? Do Grades map to rarity names like Common, Rare or Legendary?
- What do Items do, and how do Monsters work?
- What triggers a unit's own Formation Effect (the "Formation effect text" on unit cards), and how does it relate to Formation cards?
- How should each Signet shape its units (stats, abilities, play style)?
- What fills the rest of a 60-card deck, beyond the 35 units, Formations and Arms Academy?
