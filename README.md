# Last Arc: Tactics Analogue for Foundry VTT

Community-built, unofficial Foundry system framework. This repository contains the system code and original sheet styling; it does not include copied rulebook text, artwork, premade characters, monsters, spells, class features, or other book compendium entries. Enter content you are authorized to use into the in-game item sheets.

## Install

In Foundry VTT, open **Game Settings → Manage Systems → Install System** and use this manifest URL:

`https://raw.githubusercontent.com/Caio-Santiago257/last-arc-Foundry-Fan/main/system.json`

Alternatively, download the repository ZIP, extract the `last-arc-Foundry-Fan` folder into Foundry's `Data/systems/`, then restart Foundry. Create a world and select **Last Arc: Tactics Analogue (Fan System)**.

## What is implemented

- Character and NPC actor types, with an editable sheet organized around the source sheet's sections: identity, six attributes, combat resources, defences, skills, weapons, features, spells/technicks, inventory, and biography.
- Attribute modifiers from scores; half-level skill bonuses; editable class and miscellaneous bonuses; Fortitude, Reflex, Will, and initiative totals.
- Chat rolls for attributes, skills, initiative, weapon attacks, and item damage formulas.
- HP/MP controls, damage application with damage reduction, inventory bulk totals, and editable race/class/feature/spell/talent/technick/weapon/armor/equipment items.
- Portuguese (Brazil) and English labels.

Calculations that depend on a character's specific class progression, equipment, level-by-level features, or table rulings remain editable on the sheet. This is an initial playable framework, not a complete transcription or rules compendium. The printed character sheet appears on pages 378–379 of the supplied v0.3 Rules Cyclopedia (PDF pages 379–380); this sheet follows its information architecture while using an original web layout.

## Development

The system package ID is `last-arc-analogue`. Install it in Foundry's systems directory for local development and reload the world after code or template changes.

## Attribution and status

Last Arc: Tactics Analogue is a game by its respective creators/publishers. This is an independent fan implementation and is not affiliated with or endorsed by them. The repository contains no rulebook content or art assets. The system code is provided without an added license until the repository owner chooses one.
