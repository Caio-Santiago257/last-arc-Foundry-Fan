# Last Arc: Tactics Analogue for Foundry VTT

Unofficial Foundry VTT system framework for Last Arc: Tactics Analogue. This release provides structured race, class, Technick, Performance, Magick, and advanced-class talent records with automation for character calculations and supported effects. The repository includes the system's structured rule data and user-provided FFXIV-inspired icon assets in `assets/ffxiv-icons/`.

**Current stable release: 1.0.0** — Foundry VTT 13 compatible. The setup screen uses the official Last Arc cover at `assets/last-arc-background.webp`.

## Install

In Foundry VTT, open **Game Settings → Manage Systems → Install System** and use this manifest URL:

`https://raw.githubusercontent.com/Caio-Santiago257/last-arc-Foundry-Fan/main/system.json`

Alternatively, download the ZIP, extract its `last-arc-analogue` folder into Foundry's `Data/systems/`, then restart Foundry.

## Included

- Character and NPC sheets with attributes, skills, defences, combat resources, weapons, features, spell/technick lists, inventory, and biography. Player sheets use a portrait-led header, compact icon navigation with tooltips, and a dedicated configuration dialog for damage resistance, immunity, vulnerabilities, and condition immunity.
- Break Threshold is derived from Fortitude Defence, Technick/equipment and miscellaneous bonuses, and creature size. Damage that exceeds it moves a character down the Break Gauge; gauge penalties affect defences, attacks, skills, and attribute checks. The sheet tracks unconsciousness, persistent injuries, limb loss, Second Wind, recovery actions, consciousness checks, and rest-based HP/MP recovery.
- Attribute modifiers, level-scaled skill/defence values, class bonuses, passive Perception, and class initiative dice (including the combat tracker).
- Chat rolls for attributes, skills, initiative, weapon attacks, and item damage formulas; HP/MP controls, damage application, and inventory bulk.
- Chat roll cards show the acting character portrait and name. Damage cards list the marked targets with their portraits and provide a compact, styled Apply Damage control.
- Compendium packs for races, base classes, advanced classes, talents, Technicks, Performances, Magick, and Equipage. Magick is split into Black, Blue, Green, Red, and White schools. Equipage is a grouped folder with 27 category packs and 495 records: all weapon groups, shields, three armour classes, accessories, instruments, consumables, poisons, ammunition, scrolls, scores, gear, prosthetics, mounts, and crafting resources. Table prices, availability, weapon attack/damage, size, armour statistics, special item rules, and requirements are included. Weapon skills include 1-Handed, 2-Handed, Light Weapon, Ranged, and Unarmed; weapons use attack bonuses and applicable proficiency, level, and Strength modifiers. Equipped armour contributes Reflex, damage reduction, and its Agility cap, while unproficient armour applies its check penalty. Supported passive equipment bonuses are applied while equipped.
- Dragging a race applies ability adjustments, caps, speed, senses, languages, and configured choice effects. Each racial trait is added to the character as a separate Feature with a concise rules summary; replacing a race removes only the race-generated Features. Dragging a base class opens a checkbox picker that shows the required trained-skill count and explains any mismatch, then calculates class level, HP, MP, defences, and initiative.
- After trained skills, the class flow prompts for a talent tree and a talent from that tree. Each later odd class level repeats the tree/talent choice. The chosen class appears in the sheet header and selected trees are listed on the class entry. Talent descriptions are short summaries; usage limits, prerequisites, and conditional effects still require the book.
- The Technicks compendium contains 67 rule summaries with structured prerequisites. Level-up offers general Technicks at level 1 and even character levels; ineligible choices are hidden. Passive effects such as HP Up, MP Up, Defence Up, Improved Initiative, Skill Focus, and Weapon Proficiency are automated.
- Clicking a Magick item rolls Spellcraft, spends MP, selects the highest reached threshold, resolves supported damage, healing, conditions, defence/skill changes, and dispels, and posts a chat result. Marked targets drive targeted and area effects; self-target spells default to the caster when nothing is selected.
- Ranged circular Magick areas with explicit radii use a free mouse-positioned template constrained by the spell's range. Single-target Magicks with adjacent splash damage keep their primary target and resolve adjacent secondary targets without opening an area template.
- Bardic Study prompts for Performances equal to 1 + Intelligence modifier; increased Intelligence opens any newly available choices. Perform rolls accept controlled or targeted tokens, apply eligible bonuses, penalties, damage, and MP loss, and list active effects on the sheet. Timed effects expire at the performer's next turn during combat; outside combat, remove them from the Active Effects tab.
- Core Foundry SVG icons for the D20 control and skill/item icons, plus locally bundled FFXIV-inspired icons for classes, every Magick, talents, performances, and equipment. Missing icon paths fall back to a Foundry SVG so sheets and chat never show a broken-image glyph. Portuguese (Brazil) and English labels.

The book models advancement with advanced classes and talent trees; it does not define a generic subclass item type. Configured choice groups prompt for selections such as race options.

The item descriptions are concise rules summaries. Use a rulebook copy the GM is authorized to use for exact wording and for situational effects not automated by the sheet. Some Magick effects require positioning, movement, objects, multi-target chain selection, persistent damage timing, or Break Gauge changes and are reported for GM adjudication rather than applied automatically. This is an initial playable framework, not a complete rules implementation. The printed character sheet appears on pages 378–379 of the supplied v0.3 Rules Cyclopedia (PDF pages 379–380); this sheet follows its information architecture with an original web layout.

## Development

Version 0.2.45 gives Equipage weapons distinct Foundry Core Data artwork by weapon name and group, uses core icons for armour and other equipment categories, and assigns varied core icons to Last Resort relics.

Version 0.2.46 introduces the Arcane Crimson sheet design system across player, NPC/creature, Aeon, item, chat and dialog surfaces. Player attributes use a compact JRPG stat-tile layout; NPC sheets gain Overview, Actions, Effects, Inventory and Biography pages; Aeon and item navigation share the same icon treatment. The changes preserve existing data fields and roll controls.

Version 0.2.44 fixes the item-sheet tab controller so Details and Description are interactive in Foundry VTT 13. Item descriptions now have a readable presentation with action, target, cost, prerequisites, special rules, and existing check-tier effects; editing the description remains available in a collapsed field.

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

Version 0.2.42 adds the book's status conditions and curses as actor effects, with turn-based checks/removal, damage/healing/defence/skill/movement adjustments, action restrictions, sleep wake-up, Doom countdown, and damage roll modifiers. It also updates the Fell Knight, Warlock, Shikari, and Troubador class icons; the available Gladiator artwork remains the closest bundled Paladin emblem because this icon pack has no separate GLD class emblem.

Version 0.2.25 adds a localized damage-type selector to manual Apply Damage and a chat Apply Damage action for weapon, Magick, Technick/talent, and Performance damage rolls. Chat damage uses the recorded roll amount and target, applies HP damage through the shared resistance/DR and Break Gauge routine, supports MP damage and damage-type choices, and resolves attached healing or MP-drain riders after application.

Version 0.2.26 adds an Aeons compendium with all eight Chapter 13 Aeons as scalable NPC actors. Choosing Summoner links an Aeon actor to the character and exposes controls to open its sheet, add acquired Aeon idols, and summon it to the active scene. Aeon stats and unlocked Magicks/Technicks follow Summoner class level; summons spend 5 MP per Summoner level, use daily limits and Astral Conduit, last 5 + Mind modifier rounds, and are removed when the duration ends. The Aeon sheet supports HP/MP editing, natural attacks, spell and Technick rolls, ultimate attacks, and chapter progression details. Special actions for Pleiades, Alioth, and Betelgeuse and supported elemental affinities/defences are automated.

Version 0.2.27 moves weapon attacks into the Combat tab below Break Gauge, applies chat damage through the shared actor damage routine even for unlinked tokens handled by the GM, adds Foundry measured-template placement for all 25 area Magicks with tier-dependent radii, and includes Scorching/Gelid/Galvanic Strike bonus dice in a separate visible elemental damage roll for melee attacks.

Version 0.2.28 initializes nested HP, MP, Hero Point, racial effect, and inventory data for newly created Actors before preparing derived values, preventing fresh character sheets from failing to render when those fields have not yet been saved.

Version 0.2.29 uses Foundry VTT 14's native Scene Region placement for area Magicks. Cones attach to the caster's token, rotate with the mouse wheel, and confirm with left-click; the temporary preview is not saved to the scene. Confirmed Region geometry determines affected tokens before Spellcraft tiers and damage are resolved.

Version 0.2.30 fixes area Magick placement for Foundry VTT 12/13 by drawing an interactive Measured Template preview with the Foundry template controls: cone origin remains on the caster, mouse-wheel rotation is handled during placement, left-click confirms, and right-click cancels. Circular areas follow the cursor until confirmed. Foundry 14 continues to use Scene Regions.

Version 0.2.31 rolls area Magick damage once per damage effect and posts one chat roll for all affected tokens. The chat damage payload carries per-target amounts so successful defences, half-damage effects, and area riders still resolve separately for each target.

Version 0.2.32 adds a dedicated one-page NPC/adversary sheet, preserves printed stat-block values for NPC attacks, defences, resources, Break Threshold, and skills, and adds the Allies and Adversaries actor pack plus ten Bestiary actor packs. The packs contain 33 NPC Codex entries and 127 creatures, including their attacks, listed skills, protections, special-ability references, spell/performance links, equipment and loot notes. NPC Rules and Afflictions contains quick references for nonheroic characters, beasts, lichdom, lycanthropy, vampyrism, group scaling, and companions. Foundry v13 compatibility remains declared.

Version 0.2.33 refreshes only the player sheet with a larger portrait, cleaner header and resource cards, a right-side navigation rail that reveals page names on hover/focus, and a checkbox-based protection editor for damage resistances, damage immunities, vulnerabilities, condition immunities, and custom entries. NPC, bestiary, and Aeon sheets retain their own layouts.

Version 0.2.34 fixes legacy player sheets whose saved HP maximum was masked by an initialized zero `baseMax`. Missing maximum values are rebuilt from class progression and resource Technicks. The player overview now displays HP and MP as proportionally filled resource bars.

Version 0.2.35 replaces item roll dice glyphs with the item's image while preserving the existing roll action. A semantic icon resolver assigns Foundry Core Data artwork to generic item images and new compendium entries, including Magicks, Technicks, talents, features, classes, weapons, armour, and equipment. Existing custom item art is preserved, and older player and NPC sheets receive resolved icons when rendered.

Version 0.2.36 compares Spellcraft against each target's specific Fortitude, Reflex, or Will Defence for the Magick effects selected by the check, including area targets and composite effects that require beating multiple defences. The chat reports each distinct defence comparison, applies Phase/Teleport resistance checks, the ally Will Defence modifier for Dispel, and Reflex checks when Mend targets an attended item. It posts the illustrated Magick description before Spellcraft and damage rolls. Casting remains possible with no target selected; target-dependent effects wait for a target while the Spellcraft and damage rolls are still shown.

Version 0.2.43 adds 51 Last Resort power entries and 45 relic items in dedicated compendiums. Studying a relic checks level milestones and the matching talent tree, calculates the required study hours, consumes the relic, and teaches the linked power (with replacement at capacity). The player sheet shows known Last Resorts and a glowing use control that unlocks at or below one-quarter HP, permits one use per long rest, and chooses among learned powers. Damage scales at levels 10 and 15, Aether Blast asks for its element, supported damage/effects resolve against targeted tokens, and a possessed Obsidian Skull grants its +5 Spellcraft bonus.

Version 0.2.47 refines the Arcane Crimson contrast and surfaces. It fixes the outer Foundry sheet window retaining the legacy beige background, raises muted/auxiliary text contrast, and makes input, placeholder, select, disabled-control, modal, and item-sheet colors legible on the dark theme. No game rules or calculations change.

Version 0.2.48 sorts initiative from lowest to highest, so the smallest result acts first. The combat tracker display and turn sequence use the same ascending order; tied initiatives are ordered by combatant name, and unrolled combatants remain at the end.

Version 1.0.0 is the first stable release of the Last Arc: Tactics Analogue Foundry system. It adds the official system cover art to the Foundry Setup system listing using the package `media` entry with `type: "setup"`. Foundry VTT compatibility remains minimum 12 and verified 13.

## Attribution and status

Last Arc: Tactics Analogue is a game by its respective creators/publishers. This independent fan implementation is not affiliated with or endorsed by them. The repository contains no rulebook artwork. The system code is provided without an added license until the repository owner chooses one.
