# Last Arc: Tactics Analogue for Foundry VTT

Unofficial Foundry VTT system framework for Last Arc: Tactics Analogue. This release provides structured race, class, Technick, Performance, Magick, and advanced-class talent records with automation for character calculations and supported effects. The repository includes rule text data and does not redistribute rulebook artwork.

## Install

In Foundry VTT, open **Game Settings → Manage Systems → Install System** and use this manifest URL:

`https://raw.githubusercontent.com/Caio-Santiago257/last-arc-Foundry-Fan/main/system.json`

Alternatively, download the ZIP, extract its `last-arc-analogue` folder into Foundry's `Data/systems/`, then restart Foundry.

## Included

- Character and NPC sheets with attributes, skills, defences, combat resources, weapons, features, spell/technick lists, inventory, and biography.
- Break Threshold is derived from Fortitude Defence, Technick/equipment and miscellaneous bonuses, and creature size. Damage that exceeds it moves a character down the Break Gauge; gauge penalties affect defences, attacks, skills, and attribute checks. The sheet tracks unconsciousness, persistent injuries, limb loss, Second Wind, recovery actions, consciousness checks, and rest-based HP/MP recovery.
- Attribute modifiers, level-scaled skill/defence values, class bonuses, passive Perception, and class initiative dice (including the combat tracker).
- Chat rolls for attributes, skills, initiative, weapon attacks, and item damage formulas; HP/MP controls, damage application, and inventory bulk.
- Compendium packs for races, base classes, advanced classes, talents, Technicks, Performances, Magick, and Equipage. Magick is split into Black, Blue, Green, Red, and White schools. Equipage is a grouped folder with 27 category packs and 495 records: all weapon groups, shields, three armour classes, accessories, instruments, consumables, poisons, ammunition, scrolls, scores, gear, prosthetics, mounts, and crafting resources. Table prices, availability, weapon attack/damage, size, armour statistics, special item rules, and requirements are included. Weapon skills include 1-Handed, 2-Handed, Light Weapon, Ranged, and Unarmed; weapons use attack bonuses and applicable proficiency, level, and Strength modifiers. Equipped armour contributes Reflex, damage reduction, and its Agility cap, while unproficient armour applies its check penalty. Supported passive equipment bonuses are applied while equipped.
- Dragging a race applies ability adjustments, caps, speed, senses, languages, and configured choice effects. Each racial trait is added to the character as a separate Feature with a concise rules summary; replacing a race removes only the race-generated Features. Dragging a base class opens a checkbox picker that shows the required trained-skill count and explains any mismatch, then calculates class level, HP, MP, defences, and initiative.
- After trained skills, the class flow prompts for a talent tree and a talent from that tree. Each later odd class level repeats the tree/talent choice. The chosen class appears in the sheet header and selected trees are listed on the class entry. Talent descriptions are short summaries; usage limits, prerequisites, and conditional effects still require the book.
- The Technicks compendium contains 67 rule summaries with structured prerequisites. Level-up offers general Technicks at level 1 and even character levels; ineligible choices are hidden. Passive effects such as HP Up, MP Up, Defence Up, Improved Initiative, Skill Focus, and Weapon Proficiency are automated.
- Clicking a Magick item rolls Spellcraft, spends MP, selects the highest reached threshold, resolves supported damage, healing, conditions, defence/skill changes, and dispels, and posts a chat result. Marked targets drive targeted and area effects; self-target spells default to the caster when nothing is selected.
- Bardic Study prompts for Performances equal to 1 + Intelligence modifier; increased Intelligence opens any newly available choices. Perform rolls accept controlled or targeted tokens, apply eligible bonuses, penalties, damage, and MP loss, and list active effects on the sheet. Timed effects expire at the performer's next turn during combat; outside combat, remove them from the Active Effects tab.
- Core Foundry SVG icons for the D20 control and skill/item icons. Portuguese (Brazil) and English labels.

The book models advancement with advanced classes and talent trees; it does not define a generic subclass item type. Configured choice groups prompt for selections such as race options.

The item descriptions are concise rules summaries. Use a rulebook copy the GM is authorized to use for exact wording and for situational effects not automated by the sheet. Some Magick effects require positioning, movement, objects, multi-target chain selection, persistent damage timing, or Break Gauge changes and are reported for GM adjudication rather than applied automatically. This is an initial playable framework, not a complete rules implementation. The printed character sheet appears on pages 378–379 of the supplied v0.3 Rules Cyclopedia (PDF pages 379–380); this sheet follows its information architecture with an original web layout.

## Development

The system package ID is `last-arc-analogue`. Edit `packs-source/*.json` and run `node scripts/build-packs.mjs` to rebuild the Foundry compendium source files. They use the legacy NeDB import format that Foundry migrates on first launch.

Version 0.2.3 removes duplicate defences from the Attributes tab, displays the active class defence bonus as a derived read-only value in Combat, and shows each skill's governing attribute modifier while removing the unused Class column.

Version 0.2.4 adds the book's XP thresholds through level 20 and a compact level-up button that appears when the character qualifies. It advances an active class, applies its HP/MP progression and talent choice, and prompts for the two attribute increases every four character levels.

Version 0.2.5 adds 67 Technicks, structured prerequisite checks, class bonus lists, level-up choices, and automation for the passive effects represented in the actor data.

Version 0.2.6 corrects Technick advancement so characters receive their level-up choice at level 1 and even character levels, using the class bonus list when the class progression grants one.

Version 0.2.7 publishes a package ZIP under the system ID and points the updater to that versioned archive instead of GitHub's repository snapshot ZIP.

Version 0.2.8 adds the complete 76-spell Magick catalogue in five school packs, Spellcraft rolls, MP spending, tier checks, and supported target effect automation.

Version 0.2.9 lets players roll targeted Magick without preselecting a token. The Spellcraft tier selects damage dice, which are rolled to chat without applying defence or damage reduction until a target is chosen; selected targets still receive supported automatic effects.

Version 0.2.10 shows the damage dice roll in chat for targeted damage Magick and uses a compact result card in place of the full spell description. Spellcraft tier selection and automatic damage application are unchanged.

Version 0.2.11 adds the Performances compendium, Bardic Study selection limits and retroactive slots, tier-based Perform checks, supported recipient effects, and the Active Effects sheet tab.

Version 0.2.12 fixes performance rolls by consistently using active scene Token placeables for performer position and disposition checks. It also fixes the same token-type mismatch in spellcasting melee-range checks.

Version 0.2.13 adds the Equipage compendium folder and all 495 core equipment records in 27 category packs; weapon skill rows and weapon attack/damage calculations; equippable armour/accessories; armour Reflex, damage reduction, Agility caps, and proficiency penalties; and supported equipped-item bonuses. Conditional and target-specific item qualities remain visible in the item rules for manual adjudication.

Version 0.2.14 lets players assign the six generated attribute values to any attribute without reusing a value, and fixes the inventory row layout and size of the equipped toggle.

Version 0.2.15 leaves all attribute assignment selectors empty so players choose every value themselves, and posts each 2d6 roll with its paired generated values to chat before assignment.

Version 0.2.16 capitalizes the English Ranged skill label.

Version 0.2.17 adds requirements, defence and HP/MP progression, feature references, level tables, and permitted talent trees for all 18 advanced classes. Level-up offers eligible advanced classes when advancing to character level 8, then prompts for a tree and an eligible talent at the new class's first level and later talent levels. The talents pack includes all 156 advanced-class-tree talents with descriptions and prerequisites. Talent rolls include Abyssal Drain I/II and Mana Tap; Magick casting supports Amplification and Addle, and class passives with direct derived effects include the Mind-based Reflex substitution, Arcane Acumen, and Soul Eater. Other situational talents and encounter-only features remain described in the item or Feature entry for manual resolution.

Version 0.2.18 refreshes advanced-class data from its compendium before prerequisite and talent selection, ensuring advanced classes use their own talent trees and feature progression. It also corrects the talent list layout so roll, name, and delete controls stay aligned.

Version 0.2.19 grants bonus Technicks according to the selected base class's class-level progression. Character-level parity no longer triggers a Mage bonus when advancing into a new advanced class.

Version 0.2.20 prompts for eligible Magicks whenever Arcane Study is learned. Each copy grants a new selection of 1 + Intelligence modifier spells (minimum 1), excluding spells already known and checking any recorded spell prerequisites.

Version 0.2.21 adds the six High Arcana to a dedicated Magick compendium. Archmage class levels 6 through 10 each grant one previously unlearned option. Spell casting can activate one owned High Arcana at a time, doubles its MP cost, and applies supported effects including doubled Intensified Spell damage dice, Distant Spell range, Lingering Spell tracked duration, and Multi-Spell target limits.

Version 0.2.22 keeps race names on one row in the item list and widens the XP fields so six-digit totals remain readable. Mage's starting Arcane Study plus a separately chosen level-1 repeatable copy remain allowed.

Version 0.2.23 sizes Add Item controls to their labels and keeps them beside the section headings, reducing visual clutter across the character sheet.

Version 0.2.24 adds the Break Threshold formula and a visual Break Gauge with automatic damage-triggered steps and roll/defence penalties; Second Wind, rest and recovery, unconsciousness checks, death prevention with Hero Points, and the Injury and Dismemberment table. Injury penalties affect checks, movement, and carrying capacity; the Combat tab now includes compact state and recovery controls.

## Attribution and status

Last Arc: Tactics Analogue is a game by its respective creators/publishers. This independent fan implementation is not affiliated with or endorsed by them. The repository contains no rulebook artwork. The system code is provided without an added license until the repository owner chooses one.
