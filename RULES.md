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
- Card types: **Units**, **Spells**, **Traps** (details to come)
- Board zones: see **Field layout** below

## Field layout
Each player has their own half of the table. The opponent's half is a mirror image
(their Draw Pile is top right from our view).

Player's half (bottom of the screen):

```
        [SDZ][SDZ][SDZ][SDZ]        <- Special Deck Zones (4)
        [UPS][UPS][UPS]       [Grave]
        [UPS][UPS][UPS]
        [UPS][UPS][UPS]       [Draw ]
 [FEZ]                              <- Field Effect Zone (bottom left of grid)
```

- **Unit Position Slots (UPS):** a 3x3 grid of 9 slots for units.
- **Draw Pile:** bottom right (top right for the opponent).
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
