# Battle'O'Kias — Rules (Milestone 0, in progress)

Written up from Dyllan's notes. Open questions are marked **(?)**. Rules are refined as we go, and balance is tuned as cards are added.

**The world (Dyllan):** a war-torn world where institutes (the Schools) train warriors to fight for their ambitions.

**Balance approach (Dyllan):** deck building is most of the battle in a TCG. Exact mirror matches (both players with identical decks) are not a fair way to judge balance. Test with different deck builds from the same card pool instead.

## Setup
1. A coin flip decides who goes first.
2. The starting player draws **4** cards.
3. The opponent draws **5** cards.

## Turn structure (confirmed by Dyllan)
Each turn runs through six phases, shown on screen with their short names:

| # | Phase | Short | What happens |
|---|---|---|---|
| 1 | **Start Phase** | SPh | You can activate any set Spells or Traps that help you going into your turn. |
| 2 | **Draw Phase** | DPh | Draw 1 card from your main deck. |
| 3 | **Preparation Phase I** | PPh1 | Summon, promote, move and retire units, set cards, play Formations and Field Spells. |
| 4 | **Battle Phase** | BPh | Attack your opponent. You can only attack with an active Formation. |
| 5 | **Preparation Phase II** | PPh2 | Draw 1 card from a Special Deck of your choice, and set cards (setting only). |
| 6 | **End Phase** | EPh | You can activate set cards if needed. Then your opponent's turn begins. |

- The Draw Phase includes the starting player's very first turn, so the starting player begins their first Preparation Phase I with **5** cards, and the opponent begins with **6**.
- **(?)** Is there a limit on how many units can be summoned per turn? (Only Energy limits it for now.)
- **(?)** Are Spells and Traps set face-down until activated? (Yes.)
- **Set Spells and Traps** are activated in your own Start and End Phases. They can also be used **during your opponent's turn** if the card says that's its purpose (confirmed by Dyllan).

## Still to define
- ~~Win condition~~ (10 Damage Counters, see Player stats)
- Resource system
- Board zones: see **Field layout** below

## Signets
A deck is built around a **Signet**, a faction (like houses or clans in other games).
Starting Signets:
1. **School of Arms**
2. **School of Magic**
3. **School of Alchemy**

Deck rule:
- A deck is built around **one Signet**. Every card in the deck must carry that Signet.
- A card can belong to **more than one** Signet, so it can appear in decks of any of them.
- **Deck legality (confirmed by Dyllan):** a deck is legal as long as every card shares the deck's Signet, whether as its main Signet or a sub-Signet. This allows unusual cross-academy combinations, and that's intended.
  - **One declared Signet (confirmed by Dyllan):** like choosing your world in Future Card Buddyfight, you declare the Signet you command, for example the forces of Arms, and every card in the deck must carry Arms. Chaining through shared sub-Signets is not allowed, so an Arms deck can include an Arms/Fire card but not a pure Fire card.
- The card's Signet symbol(s) sit in the **top left** corner of the card.
- **Main Signet and sub-Signets (confirmed by Dyllan):** a card's **first** Signet is its **main Signet**, and it decides the card's **promotion line**. Any Signets after it are **sub-Signets**: they let the card into those decks, but play no part in promotion.
- **Support cards and Signets (confirmed by Dyllan):** Equipment, Artifacts and other cards that attach to or affect a unit can be used on it if they share **any** Signet, main or sub-Signet, unless the card says otherwise. So Practice Gear (Arms) can go on another academy's unit that has Arms as a sub-Signet.
  - Placeholder: the same goes for Arms Academy's "Arms units" (its unlimited promotions), since it doesn't say otherwise.

Open questions:
- **(?)** How does a Signet shape its Units (stats, abilities, play style)?

## Deck building (confirmed by Dyllan)
The game simulates medieval warfare: your units are your army, and armies need numbers.
- A deck is **60 cards**, all carrying the deck's Signet.
- **Units have no copy limit.**
- **Every other card** (Spells, Field Spells, Traps, Formations and so on) is limited to **3 copies**.
- **Starter unit spread:** 15 Grade 1, 10 Grade 2 and 10 Grade 3 units.
- **(?)** Is that spread a deck-building rule (minimums, or exact numbers), or just how the starter and test decks are built?
- **(?)** What fills the other 25 cards? With 3 Frontal Assault and 3 Arms Academy, 19 slots are still open.

## Special Decks (confirmed by Dyllan)
Alongside the 60-card main deck, each player has **four Special Decks**, one in each Special Deck Zone.
- Each Special Deck holds up to **15 cards**, all of **one card type**.
- **Equipment does not go in the main deck.** It goes in a Special Deck.
- Example setup:
  1. Equipment
  2. Artifacts
  3. Monsters
  4. Items (a new card type, details to come)
- **Spells and Traps** can go in the main deck **or** have their own Special Deck (see below for what that blocks).
- **Preparation Phase II:** at the start of it, you choose one of your four Special Decks and draw **one card** from it. That is the only Special Deck draw.
- **In Preparation Phase II you can only set cards.**
- **Equipment set in Phase II** goes on its unit, but the unit only **becomes equipped at the start of your next Preparation Phase I**, so the bonus doesn't apply until then.
  - Set Equipment gives **nothing during your opponent's turn**, so the unit can be destroyed with its Gear still waiting. That risk is intended (confirmed by Dyllan).
- **You don't have to use a drawn card straight away.** You can hold it. Equipment held in hand can be equipped in Preparation Phase I and works immediately.
- **Artifacts and Monsters** are Special Deck only, like Equipment.
- A **Spell Special Deck** blocks only Spells from your main deck, and a **Trap Special Deck** blocks only Traps.

Open questions (placeholders in brackets):
- **(?)** Are Items Special Deck only too? (Yes.)
- **(?)** Can two Special Decks be the same type, and must you fill all four? (No, and no.)
- **(?)** Does the 3-copy limit apply inside Special Decks? (Yes.)
- **(?)** Do Special Decks count toward the 60 cards, or are they on top of the main deck? (On top.)
- **(?)** Are Special Decks shuffled, or do you pick the card you want? (Shuffled.)
- **(?)** Does the player going first get a Special Deck draw on their first turn? (No.)
- **(?)** Is there a hand limit, now that you draw 2 cards a turn? (No limit yet.)

## Card types
| Type | What it does | Where it goes |
|---|---|---|
| **Unit** | Your creatures | Unit Position Slots (UPS) |
| **Spell** | Spells with effects | (?) |
| **Field Spell** | Affects the field | Field Effect Zone (?) |
| **Trap** | Set face-down, activated on the opponent's turn | (?) |
| **Equipment** | Placed over a unit with a shared Signet; boosts or changes it (see Equipment). Special Deck only | On a unit in the grid |
| **Artifact** | (?) | (?) |
| **Monster** | Deferred: defined once unit attacks are designed | (?) |
| **Item** | New type, details to come. Special Deck | (?) |
| **Formation** | Names a pattern of filled grid slots and gives its Attack and Defense for battle (see Formations) | Formation Zone |

Build order: **Units, Spells and Traps first**, then Field Spells, Equipment, Artifacts
and Monsters one at a time.

Open questions:
- **(?)** What do Artifacts do?
- **(?)** Which card types cost Energy, and how do card levels map to cost?

## Unit cards
A Unit card shows:
- The **unit image** as the card background
- **Attack** stat
- **Defense** stat
- A **Formation Effect**

- **Grade** (top right of the card): the unit's Energy cost and its rarity in one number.

Open questions:
- A Grade N unit costs **N Energy** to summon normally.
- **(?)** What is the Grade range (Energy caps at 10)?

### Named units (Grade 4 and up, from Dyllan)
- From **Grade 4 upward**, units are **named** characters rather than generic ranks like Student or Graduate.
- Named units also carry **flavour text** (story only, no rules effect) and a new typing called a **Class**.
- Grades 1 to 3 have no name, flavour text or Class.
- **(?)** What Classes are there?
- **(?)** Does a unit's Class do anything in play (for example, a Formation or Field Spell that needs a certain Class), or is it just a label for now?
- **(?)** Is each named unit one of a kind? (Placeholder: only one copy of the same named unit on your field at a time, but still no deck limit.)
- **(?)** Where does the Class show on the card? (Placeholder: under the name, next to the Signet symbols.)

### Official sample units (School of Arms, from Dyllan)
| Grade | Name | Attack | Defense |
|---|---|---|---|
| 1 | Student of Arms | 500 | 500 |
| 2 | Apprentice of Arms | 1500 | 1000 |
| 3 | Graduate of Arms | 2000 | 1500 |

These three are the **only** Grade 1, 2 and 3 units of the Arms line (confirmed by Dyllan). Other Signets will have their own Grade 1 to 3 units later.

### Promotion
- Instead of summoning normally, you can **promote** a unit already on the field by playing a
  higher-Grade unit from your hand **on top of it**.
- Promotion costs the **difference** in Grade. For example, a Grade 2 played on a Grade 1 costs **1 Energy** instead of 2.
- Promotion is **exactly one Grade** up. No skipping.
- **Promotion lines (confirmed by Dyllan):** a unit can only be promoted by the next unit **in its own line**. The Arms line is **Student of Arms, then Apprentice of Arms, then Graduate of Arms**.
  - Only a Student of Arms can become an Apprentice of Arms, and only an Apprentice of Arms can become a Graduate of Arms.
  - The line comes from the card's **main (first) Signet**. A card that only has Arms as a sub-Signet is outside the Arms line, even if it can sit in an Arms deck.
- **(?)** How does a Graduate of Arms move up to Grade 4? Placeholder: any named Grade 4 unit whose main Signet is Arms can promote a Graduate of Arms.
- **One promotion per turn** normally. Some Field Spells lift this (see Arms Academy).
- Placeholder until Dyllan decides: the card underneath stays stacked beneath the new unit and both go to the Grave when the unit is destroyed.
- First-player edge: with Formations and unit destruction in (`58d4e06`), bot games show the first player winning 49%, so no extra fix is needed for now.
- Placeholder until Dyllan decides: a promoted unit can attack this turn if the unit beneath was already on the field at the start of the turn.
- **(?)** How does Grade map to rarity names, if any (e.g. Common, Rare, Legendary)?
- **(?)** What triggers a Formation Effect (a pattern of units in the 3x3 grid, adjacency, same Signet)?
- **(?)** How does the Formation card type relate to a unit's Formation Effect?

## Moving and retiring units (confirmed by Dyllan)
- **Moving:** during Preparation Phase I, you can move your units to any of your slots, with no cost or penalty.
- **Retiring:** at any time during Preparation Phase I, you can retire one of your units. It goes to the Grave and its slot opens up.
- **Any unit that leaves the field goes to the Grave.**
- **(?)** Can two units swap slots in one move? Placeholder: yes.
- **(?)** When a promoted unit is retired, do the cards stacked under it go to the Grave too? Placeholder: yes, the whole stack goes.

## Formations
A **Formation** card goes in the **Formation Zone**. It names a pattern of Unit Position Slots.
While those slots are filled, the Formation has its own **Attack** and **Defense** for the Battle Phase.
You can only attack if you have a Formation set.

- Units in other slots can still be on the field, but **only units in the Formation's slots add to its power**.
- Each Formation has its own formula for its power. Basic Formations use the **sum**.
- **Fractions always round down** (confirmed by Dyllan).
- **Formation cost** (confirmed by Dyllan): a Formation with Damage Grade 1 costs **0 Energy**. Higher Damage Grades cost **one less than the Damage Grade** (Damage Grade 2 costs 1, Damage Grade 3 costs 2).

### Formation: Vanguard Charge (from Dyllan)
- **Pattern:** the **whole front row** plus the **middle-centre** slot, four slots in a T shape (grid positions `[0, 1, 2, 4]`).
  ```
  front   [X][X][X]
  middle  [ ][X][ ]
  back    [ ][ ][ ]
  ```
- **Formation Attack** = sum of those units' Attack **x 1.5**.
- **Formation Defense** = sum of those units' Defense **/ 1.5**.
- **Damage Grade 2**, **Defense Grade 0**, **cost 1 Energy** (see Formation cost).
- Example: Student, Apprentice and Student across the front with a Graduate in the middle centre gives 4500 x 1.5 = **6750 Attack** and 3500 / 1.5 = **2333 Defense**.
- **(?)** Which Signets does it carry? Placeholder: all three, the same as Frontal Assault.
- Balance note: in bot games, a Vanguard Charge deck beats a Frontal Assault deck 89% of the time, because of Damage Grade 2. Suggested fix: give Frontal Assault Defense Grade 1 (about 43%). Dyllan is leaving this for now, since Equipment may balance it.

### Formation from the deck (confirmed by Dyllan)
- If by **round three** you hold **no Formation**, you can **summon one directly from your deck**.
- **(?)** Does "round three" mean your own third turn? Placeholder: your third turn or any later turn, in Preparation Phase I.
- **(?)** Does "hold no Formation" mean none in your hand **and** none in your Formation Zone? Placeholder: yes, both.
- **(?)** Does it go straight into the Formation Zone or into your hand, and does it still cost its normal Energy? Placeholder: straight into the Formation Zone, at its normal cost.
- **Once per game** (confirmed by Dyllan). The deck is shuffled afterwards.
- **Formations can't be destroyed** for now. Later, some spell effects may destroy them, and other spells will **recall** a Formation (for example, if you have no Formation by round two). Together these balance decks out.

### Formation: Frontal Assault (basic)
- **Pattern:** all three **front-row** slots (the row nearest the centre) are filled with units.
- **Formation Attack** = the sum of the three front-row units' Attack.
- **Formation Defense** = the sum of the three front-row units' Defense.
- Example: three Students of Arms make 1500 Attack and 1500 Defense. Three Graduates of Arms make 6000 Attack and 4500 Defense.

Built as `FRM-001` (all three Signets, `"slots": [0,1,2]`, `"combine": "sum"`).

### Formation battle (confirmed by Dyllan)
- In the Battle Phase, your **Formation Attack** is compared with the opponent's **Formation Defense**.
- If your Attack is **greater than or equal to** their Defense, the attack goes through and the opponent gains a **Damage Counter**.
- If your Attack is lower, the attack fails.

### Damage Grade and Defense Grade (confirmed by Dyllan)
Every Formation card has two extra numbers:
- **Damage Grade:** how many Damage Counters the Formation deals when its attack goes through. Damage Grade 1 deals 1 counter, and Damage Grade 3 deals 3.
- **Defense Grade:** most Formations have **0 or 1**. It is subtracted from the incoming Formation's Damage Grade.
- **Counters dealt** = attacker's Damage Grade minus defender's Defense Grade, with a minimum of 1.
  - Example: a Damage Grade 3 attack into a Defense Grade 1 Formation deals 2 counters.
- **(?)** Frontal Assault's Damage Grade and Defense Grade. Placeholder: 1 and 0.
- **A landed hit always deals at least 1 Damage Counter** (confirmed by Dyllan). Example: Damage Grade 1 into Defense Grade 1 still deals 1.
- An inactive (incomplete) Formation gives no Defense Grade.

Open questions:

### Destroying units and inactive Formations (confirmed by Dyllan)
- Units are **not** destroyed just by being attacked.
- **When an attack gets through, the defender's lowest-Grade unit in their Formation is destroyed** and goes to the Grave.
- **Units can only be attacked while they are in a Formation.** Units outside the Formation's slots can't be destroyed by an attack.
- **A Formation with any of its slots empty becomes inactive.** It becomes active again once the missing unit is replaced.
- **If there is no opposing Formation**, your attack deals exactly **1 Damage Counter**, whatever your Damage Grade, and **no units are destroyed**.

Open questions:
- If several units tie for lowest Grade, the defender picks which one is destroyed. (Accepted for now.)
- An inactive Formation counts as no opposing Formation: 1 counter, no units destroyed. (Accepted for now.)
- A failed attack does nothing to the attacker. (Accepted for now.)
- **(?)** How many times can a Formation attack per Battle Phase? (Placeholder: once.)
- **(?)** Does playing a Formation card cost Energy? Can you swap it for another Formation? (Placeholders built: 0 Energy, and the old one goes to the Grave.)
- **(?)** Do units that just arrived count toward the Formation on the turn they're summoned or promoted?

## Spell and Trap cost
- Most Spells, Field Spells and Traps cost **1 Energy** to play, unless the card says otherwise.

## Field Spells
A Field Spell goes in the **Field Effect Zone (FEZ)** and stays there, giving an ongoing effect.

### Field Spell: Arms Academy (School of Arms, from Dyllan)
- **Effect:** In your **Preparation Phase I**, you may send a **Student of Arms** from your hand to the Academy. (Specific to this line: Student of Arms in, Graduate of Arms out.)
- **Two of your turns later**, in your Preparation Phase I, a **Graduate of Arms** leaves the Academy and is **summoned to the field at no cost**, in **any empty slot you choose**.
  - Example: send the Grade 1 in Preparation Phase I of your 3rd turn, and the Grade 3 arrives in Preparation Phase I of your 5th turn.
- **Cost to play:** 1 Energy.
- **Enrolling** a unit costs its Grade in Energy, so 1 Energy per Grade 1 unit.
- **Capacity:** the Academy holds up to **2** units. Sending two costs 2 Energy.
- When the Grade 3 emerges, the **Grade 1 goes to the Grave**.
- You choose that Graduate of Arms **from your hand** or **from your deck**. If you take it from your deck, **reshuffle** the deck afterwards.

Open questions:
- **Second effect:** while Arms Academy is in play, you can promote **any number** of your units with the **Arms Signet** each turn, as long as you have the Energy. (The normal limit is one promotion per turn.)
- Placeholder: if there's no empty slot or no Graduate of Arms to pick, the student stays in the Academy and tries again next turn. Playing a new Field Spell sends the old one and its students to the Grave.
- The arriving Graduate can attack that turn if it's placed in your Formation (confirmed by Dyllan).

## Equipment (confirmed by Dyllan)
- An Equipment card is **placed over a unit** on the field, and that unit becomes **equipped**.
- The Equipment's effect applies **once the unit is equipped**.
- Equipment carries **Signets** too. It can only equip a unit that **shares a Signet** with it, main or sub-Signet, unless the Equipment says otherwise.
- Equipped units' boosted stats count toward a Formation.
- **Order of maths** (confirmed by Dyllan): apply each unit's Equipment first, then add up the Formation, then apply the Formation's multiplier or divisor (such as Vanguard Charge's x1.5 and /1.5) **at the end**, rounding down.

Open questions (placeholders in brackets):
- **(?)** Cost: does Equipment follow the usual 1 Energy? (Yes, 1 Energy.)
- **(?)** Can a unit carry more than one Equipment? (No, one per unit.)
- **(?)** When the unit is destroyed or retired, does the Equipment go to the Grave with it? (Yes.)
- **(?)** When an equipped unit is promoted, does the Equipment stay on the new unit? (Yes, if it still shares a Signet.)
- **(?)** Which phase can you equip in? (Preparation Phase I.)

### Equipment: Practice Gear (School of Arms)
- **Effect:** the equipped Arms unit gets **+250 Attack and +250 Defense** (a flat bonus, confirmed by Dyllan).
- Example: a Student of Arms goes from 500/500 to 750/750, and an Apprentice from 1500/1000 to 1750/1250.

## Placeholder rules for the first Arms vs Arms test game
These are **temporary** so a units-only game can be played and tuned. Dyllan will replace them.
- **Deck:** see **Deck building** (60 cards).
- **Summoning (Preparation Phase I):** play a Unit from hand into any empty Unit Position Slot by paying its Energy cost. No limit per turn beyond Energy.
- **Summoning sickness:** a unit can't attack on the turn it was summoned.
- **Battle Phase (after Preparation Phase I):** each of your units may attack once.
  - **Confirmed by Dyllan:** the turn order is Draw Phase, then Preparation Phase I, then Battle Phase. In the Battle Phase you can **only attack if you have a Formation set**.
  - Superseded: attacks are now Formation vs Formation (see **Formation battle**). The column rule below is the old stand-in.
  - A unit attacks down its **column**. It hits the nearest enemy unit in that column (front row first).
  - Unit vs unit: if Attack is greater than the target's Defense, the target is destroyed and goes to the Grave. Otherwise nothing happens.
  - If the column is empty, the attack hits the opponent's Defense Points directly for the unit's Attack value.
- **End Phase:** pass the turn.
- **Win:** see **Damage Counters**. A player with 10 Damage Counters loses.
- **Empty Draw Pile:** placeholder is that a player who can't draw loses.

## Player stats
Shown alongside each player's **Hand** (the zone where drawn cards go).
- **Player Name**
- **Damage Counters** (replace Defense Points, confirmed by Dyllan)
  - Each player starts at **0** Damage Counters and the maximum is **10**.
  - You gain counters when an opponent's Formation attack goes through: their Damage Grade minus your Defense Grade.
  - **Reaching 10 Damage Counters means you lose.**
- **Energy:** the currency for playing higher-level cards.
  - Works like Hearthstone mana. Max Energy starts at **1** and rises by **1** at the
    start of each of your turns, up to a cap of **10**.
  - At the start of your turn, Energy refills to your current max. Unspent Energy does
    not carry over beyond that.

## Empty Draw Pile
- **(?)** What happens when a player must draw from an empty Draw Pile (lose, take damage, reshuffle the Grave)?

## Field layout
Each player has their own half of the table. The opponent's half is the player's half
rotated 180 degrees (a true mirror across the table), so from our view their Draw Pile
is **top left**, their Grave Pile sits below it, their Special Deck Zones face the centre,
and their Field Effect Zone is top right.

Full board as seen by the player:

```
                              [FEZ]        <- opponent Field Effect Zone
                              [FZ ]        <- opponent Formation Zone
 [Draw ]    [UPS][UPS][UPS]
            [UPS][UPS][UPS]               opponent
 [Grave]    [UPS][UPS][UPS]
            [SDZ][SDZ][SDZ][SDZ]         <- opponent Special Deck Zones
 ------------------------------------------ centre
        [SDZ][SDZ][SDZ][SDZ]             <- player Special Deck Zones
        [UPS][UPS][UPS]       [Grave]
        [UPS][UPS][UPS]                   player
        [UPS][UPS][UPS]       [Draw ]
 [FZ ]                                   <- player Formation Zone
 [FEZ]                                   <- player Field Effect Zone
```

- **Unit Position Slots (UPS):** a 3x3 grid of 9 slots for units.
- **Draw Pile:** bottom right (top left for the opponent).
- **Grave Pile:** directly above the Draw Pile; the discard zone.
- **Special Deck Zones (SDZ):** four zones above the 3x3 grid. Each holds one of your Special Decks.
- **Field Effect Zone (FEZ):** bottom left of the grid.
- **Formation Zone (FZ):** directly above the Field Effect Zone; holds Formation cards.

Open questions:
- **(?)** What goes in the Field Effect Zone? One field card at a time?
- **(?)** Where are spells and traps set: in the UPS grid or elsewhere?

## Still to define (continued)
- ~~Deck size and card limits~~ (see Deck building)
