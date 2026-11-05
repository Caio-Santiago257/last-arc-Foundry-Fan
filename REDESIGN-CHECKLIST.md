# Arcane Crimson redesign validation

This checklist distinguishes source changes from validation in the live Foundry world. A visual or interaction check is only marked complete when performed against the current source version.

| Area | Implemented in source | Visually tested in Foundry | Functionality tested in Foundry |
|---|---|---|---|
| Player — Attributes | Yes: attribute tile layout and shared theme | Baseline inspected; final .47 not installed | No |
| Player — Combat | Yes: resource, defense, break gauge, and combat component theme | Baseline inspected; final .47 not installed | No |
| Player — Skills | Yes: trained-state cards and compact list layout | Not verified on final .47 | No |
| Player — Features | Yes: ability cards and Last Resort treatment | Not verified on final .47 | No |
| Player — Magick / Technicks | Yes: ability cards, school/action color language, shared controls | Not verified on final .47 | No |
| Player — Active Effects | Yes: effect cards and status controls | Not verified on final .47 | No |
| Player — Inventory | Yes: equipment rows, capacity and item controls | Not verified on final .47 | No |
| Player — Biography | Yes: editorial text areas and language field styling | Not verified on final .47 | No |
| Creature/NPC — General information | Yes: themed header, portrait, classifications, XP and level | Not verified on final .47 | No |
| Creature/NPC — Resources | Yes: themed HP/MP and compact combat stats | Not verified on final .47 | No |
| Creature/NPC — Defenses and attributes | Yes: stat cards and protection styling | Not verified on final .47 | No |
| Creature/NPC — Protections | Yes: separate immunity/resistance/vulnerability presentation | Not verified on final .47 | No |
| Creature/NPC — Attacks, Magick, Performances and skills | Yes: ability cards and roll control styling | Not verified on final .47 | No |
| Creature/NPC — Navigation | Yes: Overview, Actions, Effects, Inventory, Biography tabs | Not verified on final .47 | No |
| Aeons | Yes: shared theme and icon navigation across overview, spells, features and progression | Not verified on final .47 | No |
| Items | Yes: shared item sheet, description, detail and edit surfaces | Not verified on final .47 | No |
| Dialogs and modals | Yes: system Dialogs assigned Arcane Crimson class | Not verified on final .47 | No |
| Global navigation | Yes: compact square icon markers with focus/hover labels | Not verified on final .47 | No |
| Responsive layouts | Yes: narrow-screen layout rules added | Not verified on final .47 | No |

## Source checks completed

- JavaScript syntax check: passed.
- `system.json` and locale JSON parsing: passed.
- Sheet-template HTML tag balance check: passed.
- CSS brace balance check: passed.
- `git diff --check`: passed.

## Initiative ordering update (0.2.48)

The system now supplies a Foundry V13 Combat document subclass whose tracker comparator and `setupTurns()` both sort initiative ascending. Combatants without a roll remain after rolled combatants; equal rolls are resolved by name and then ID. The roll formula and the values rolled are unchanged. This change has not yet been exercised in a live encounter.

## Live Foundry inspection

Signed in to the user-provided Foundry 13 world as `Codex` and opened the existing Arquimago Teste player sheet without editing its data. The live `/systems/last-arc-analogue/system.json` manifest reports 0.2.46. The screenshot exposed two concrete issues: the outer `.window-content` retained the beige core surface because the CSS selector targeted it as a descendant of the same `.last-arc` app node, and the base `.last-arc.sheet.actor` selector had greater specificity than the Arcane Crimson variable override, leaving old dark text/muted colors inherited into inputs. The source correction is in 0.2.47. Since the running world still serves 0.2.46, post-fix visual and interaction validation, the remaining tabs, other actor types, and final screenshots remain pending installation of 0.2.47. No campaign data or world settings were changed.

Handlebars compilation, all interaction tests, current-build screenshots, and responsive visual checks remain outstanding because the Foundry world does not load this working tree.
