# Arcane Crimson redesign validation

This checklist distinguishes source changes from validation in the live Foundry world. A visual or interaction check is only marked complete when performed against the current source version.

| Area | Implemented in source | Visually tested in Foundry | Functionality tested in Foundry |
|---|---|---|---|
| Player — Attributes | Yes: attribute tile layout and shared theme | No | No |
| Player — Combat | Yes: resource, defense, break gauge, and combat component theme | No | No |
| Player — Skills | Yes: trained-state cards and compact list layout | No | No |
| Player — Features | Yes: ability cards and Last Resort treatment | No | No |
| Player — Magick / Technicks | Yes: ability cards, school/action color language, shared controls | No | No |
| Player — Active Effects | Yes: effect cards and status controls | No | No |
| Player — Inventory | Yes: equipment rows, capacity and item controls | No | No |
| Player — Biography | Yes: editorial text areas and language field styling | No | No |
| Creature/NPC — General information | Yes: themed header, portrait, classifications, XP and level | No | No |
| Creature/NPC — Resources | Yes: themed HP/MP and compact combat stats | No | No |
| Creature/NPC — Defenses and attributes | Yes: stat cards and protection styling | No | No |
| Creature/NPC — Protections | Yes: separate immunity/resistance/vulnerability presentation | No | No |
| Creature/NPC — Attacks, Magick, Performances and skills | Yes: ability cards and roll control styling | No | No |
| Creature/NPC — Navigation | Yes: Overview, Actions, Effects, Inventory, Biography tabs | No | No |
| Aeons | Yes: shared theme and icon navigation across overview, spells, features and progression | No | No |
| Items | Yes: shared item sheet, description, detail and edit surfaces | No | No |
| Dialogs and modals | Yes: system Dialogs assigned Arcane Crimson class | No | No |
| Global navigation | Yes: compact square icon markers with focus/hover labels | No | No |
| Responsive layouts | Yes: narrow-screen layout rules added | No | No |

## Source checks completed

- JavaScript syntax check: passed.
- `system.json` and locale JSON parsing: passed.
- Sheet-template HTML tag balance check: passed.
- CSS brace balance check: passed.
- `git diff --check`: passed.

## Live Foundry inspection

Signed in to the user-provided Foundry 13 world as `Codex` and opened existing player, NPC, and Aeon sheets without editing their data. The running world serves an older system build (0.2.28); the workspace being changed is 0.2.46. Therefore those screenshots show the previous build and do not validate the Arcane Crimson source changes. A current-build installation in a test world is required before the visual and interaction columns can be checked off. No campaign data or world settings were changed.

Handlebars compilation, all interaction tests, current-build screenshots, and responsive visual checks remain outstanding because the Foundry world does not load this working tree.
