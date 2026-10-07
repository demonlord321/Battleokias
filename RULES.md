# Battle'O'Kias — Rules (Milestone 0, in progress)

Written up from Dyllan's notes. Open questions are marked **(?)**.

## Setup
1. A coin flip decides who goes first.
2. The starting player draws **4** cards.
3. The opponent draws **5** cards.

## Turn structure
1. **Draw Phase:** the active player draws 1 card. This includes the starting
   player's very first turn, so the starting player begins their first main phase
   with **5** cards, and the opponent begins their first turn with **6**.
2. **Preparation Phase I:** the active player may summon units and set traps or spells.
   - **(?)** Is there a limit or cost on how many units can be summoned per turn?
   - **(?)** Are traps and spells set face-down until triggered or activated?
3. _(next phases to come)_

## Still to define
- Win condition
- Resource system
- Board zones: see **Field layout** below

## Signets
A deck is built around a **Signet**, a faction (like houses or clans in other games).
Starting Signets:
1. **School of Arms**
2. **School of Magic**
3. **School of Alchemy**

Open questions:
- **(?)** Is a deck limited to one Signet, or can it mix?
- **(?)** How does a Signet shape its Units (stats, abilities, play style)?
- **(?)** Are there neutral cards any deck can use?

## Card types
| Type | What it does | Where it goes |
|---|---|---|
| **Unit** | Your creatures | Unit Position Slots (UPS) |
| **Spell** | Spells with effects | (?) |
| **Field Spell** | Affects the field | Field Effect Zone (?) |
| **Trap** | Set face-down, activated on the opponent's turn | (?) |
| **Equipment** | (?) | (?) |
| **Artifact** | (?) | (?) |
| **Monster** | Deferred: defined once unit attacks are designed | (?) |
| **Formation** | (?) likely tied to unit placement in the 3x3 grid | (?) |

Build order: **Units, Spells and Traps first**, then Field Spells, Equipment, Artifacts
and Monsters one at a time.

Open questions:
- **(?)** Do Equipment cards attach to a unit? What do Artifacts do?
- **(?)** Which card types go in the Special Deck Zones?
- **(?)** Which card types cost Energy, and how do card levels map to cost?

## Unit cards
A Unit card shows:
- The **unit image** as the card background
- **Attack** stat
- **Defense** stat
- A **Formation Effect**

Open questions:
- **(?)** What triggers a Formation Effect (a pattern of units in the 3x3 grid, adjacency, same Signet)?
- **(?)** How does the Formation card type relate to a unit's Formation Effect?
- **(?)** Do Units also carry a Signet, an Energy cost and a level on the card?

## Player stats
Shown alongside each player's **Hand** (the zone where drawn cards go).
- **Player Name**
- **Defense Points (DP)**
  - Starting DP: **1000** (placeholder until the damage formula is designed).
  - **(?)** Damage formula: Dyllan has one in mind, to be written up.
  - **(?)** Is reducing the opponent to 0 DP the win condition?
- **Energy:** the currency for playing higher-level cards.
  - Works like Hearthstone mana. Max Energy starts at **1** and rises by **1** at the
    start of each of your turns, up to a cap of **10**.
  - At the start of your turn, Energy refills to your current max. Unspent Energy does
    not carry over beyond that.
  - **(?)** Do lower-level cards cost nothing, and what does each level cost?

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
 [Draw ]    [UPS][UPS][UPS]
            [UPS][UPS][UPS]               opponent
 [Grave]    [UPS][UPS][UPS]
            [SDZ][SDZ][SDZ][SDZ]         <- opponent Special Deck Zones
 ------------------------------------------ centre
        [SDZ][SDZ][SDZ][SDZ]             <- player Special Deck Zones
        [UPS][UPS][UPS]       [Grave]
        [UPS][UPS][UPS]                   player
        [UPS][UPS][UPS]       [Draw ]
 [FEZ]                                   <- player Field Effect Zone
```

- **Unit Position Slots (UPS):** a 3x3 grid of 9 slots for units.
- **Draw Pile:** bottom right (top left for the opponent).
- **Grave Pile:** directly above the Draw Pile; the discard zone.
- **Special Deck Zones (SDZ):** four zones above the 3x3 grid.
- **Field Effect Zone (FEZ):** bottom left of the grid.

Open questions:
- **(?)** What goes in the Special Deck Zones, and how are they used?
- **(?)** What goes in the Field Effect Zone? One field card at a time?
- **(?)** Where are spells and traps set: in the UPS grid or elsewhere?
- **(?)** Does a unit's row or column in the UPS affect attacking or being attacked?

## Still to define (continued)
- Deck size and card limits
