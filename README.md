# Last Arc: Tactics Analogue for Foundry VTT

Unofficial Foundry VTT system framework for Last Arc: Tactics Analogue. This release provides structured race and base-class compendium records and automation for core character calculations. It does not redistribute the book's talent, technick, spell, equipment, monster, or class-feature text.

## Install

In Foundry VTT, open **Game Settings → Manage Systems → Install System** and use this manifest URL:

`https://raw.githubusercontent.com/Caio-Santiago257/last-arc-Foundry-Fan/main/system.json`

Alternatively, download the ZIP, extract its `last-arc-analogue` folder into Foundry's `Data/systems/`, then restart Foundry.

## Included

- Character and NPC sheets with attributes, skills, defences, combat resources, weapons, features, spell/technick lists, inventory, and biography.
- Attribute modifiers, level-scaled skill/defence values, class bonuses, passive Perception, and class initiative dice (including the combat tracker).
- Chat rolls for attributes, skills, initiative, weapon attacks, and item damage formulas; HP/MP controls, damage application, and inventory bulk.
- Compendium packs for races, base classes, advanced classes, talents, technicks, spells, and equipment. Race and base-class records include structured automation. Advanced-class records are configurable shells until their progression data is entered.
- Dragging a race applies ability adjustments, caps, speed, senses, languages, and configured choice effects. Each racial trait is added to the character as a separate Feature with a concise rules summary; replacing a race removes only the race-generated Features. Dragging a base class opens a checkbox picker that shows the required trained-skill count and explains any mismatch, then calculates class level, HP, MP, defences, and initiative.
- Core Foundry SVG icons for the D20 control and skill/item icons. Portuguese (Brazil) and English labels.

The book models advancement with advanced classes and talent trees; it does not define a generic subclass item type. Configured choice groups prompt for selections such as race options.

Talents, technicks, spells, equipment, and detailed advanced-class progressions must be entered from a rulebook copy the GM is authorized to use. This is an initial playable framework, not a complete rules implementation. The printed character sheet appears on pages 378–379 of the supplied v0.3 Rules Cyclopedia (PDF pages 379–380); this sheet follows its information architecture with an original web layout.

## Development

The system package ID is `last-arc-analogue`. Edit `packs-source/*.json` and run `node scripts/build-packs.mjs` to rebuild the Foundry compendium source files. They use the legacy NeDB import format that Foundry migrates on first launch.

## Attribution and status

Last Arc: Tactics Analogue is a game by its respective creators/publishers. This independent fan implementation is not affiliated with or endorsed by them. The repository contains no rulebook artwork or copied rule text. The system code is provided without an added license until the repository owner chooses one.
