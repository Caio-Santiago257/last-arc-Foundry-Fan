import { ASSET_ICON_FILES } from "./asset-icon-index.mjs";
import { SPELL_ICON_MAP } from "./spell-icon-map.mjs";

const ROOT = "systems/last-arc-analogue/assets/ffxiv-icons/";
const GENERIC_IMAGES = new Set([
  "icons/svg/item-bag.svg", "icons/svg/mystery-man.svg", "icons/svg/d20-grey.svg",
  "icons/svg/aura.svg", "icons/svg/book.svg", "icons/svg/target.svg", "icons/svg/sword.svg"
]);
const SPELL_OVERRIDES = {
  "Aphasia":"NIN/Hidden.webp", "Black Hole":"DRK/Salted_Earth.webp", "Corrode":"DRK/Edge_of_Darkness.webp", "Darkness":"DRK/Darkside.webp",
  "Entomb":"BLM/Freeze.webp", "Expiry":"DRK/Living_Dead.webp", "Infest":"NIN/Mug.webp", "Maim":"DRK/Bloodspiller.webp",
  "Miasma":"SCH/Bio_II.webp", "Mire":"NIN/Dokumori.webp", "Sap":"DRK/Abyssal_Drain.webp", "Torpor":"ROLE-HEALER/Repose.webp", "Void":"DRK/Flood_of_Darkness.webp",
  "Charm":"BRD/Mage's_Ballad.webp", "Fear":"DRK/Shadow_Wall.webp", "Gravity":"AST/Gravity.webp", "Haste":"AST/Lightspeed.webp",
  "Inertia":"NIN/Armor_Crush.webp", "Invisibility":"NIN/Hide.webp", "Levitation":"AST/The_Spire.webp", "Metamorphosis":"NIN/Huton.webp",
  "Muddle":"NIN/Trick_Attack.webp", "Phase":"NIN/Shukuchi.webp", "Polymorph":"SMN/SummonGem.webp", "Repose":"ROLE-HEALER/Repose.webp", "Teleport":"BLM/Aetherial_Manipulation.webp",
  "Aqua Blast":"SMN/Aerial_Blast.webp", "Boulder":"SMN/Rock_Buster.webp", "Cataclysm":"SMN/Earthen_Fury.webp", "Entangle":"SMN/Summon_Titan.webp",
  "Overgrowth":"WHM/Regen.webp", "Quake":"SMN/Earthen_Fury.webp", "Shockwave":"SMN/Akh_Morn.webp", "Succession":"SMN/SummonGem.webp",
  "Tempest":"SMN/Aerial_Slash.webp", "Tidal Wave":"SMN/Aerial_Blast.webp", "Torrent":"SCH/Art_of_War.webp", "Whirlwind":"SMN/Aerial_Slash.webp",
  "Windburst":"WHM/Aero.webp", "Wind Slash":"SMN/Aerial_Slash.webp",
  "Ark Blast":"SMN/Deathflare.webp", "Blizzard":"BLM/Blizzard.webp", "Chain Lightning":"BLM/Thunder_II.webp", "Ember":"BLM/Fire.webp",
  "Fireball":"BLM/Fire_II.webp", "Firestorm":"BLM/Fire_III.webp", "Flamethrower":"MCH/Flamethrower.webp", "Frost Wave":"BLM/Blizzard_II.webp",
  "Galvanic Strike":"RDM/Verthunder.webp", "Gelid Strike":"BLM/Blizzard_III.webp", "Ice Blast":"BLM/Blizzard_IV.webp", "Icicle":"RDM/Verstone.webp",
  "Inferno":"SMN/Inferno.webp", "Lightning Bolt":"BLM/Thunder.webp", "Scorching Strike":"RDM/Verflare.webp", "Shock":"RDM/Verthunder_II.webp",
  "Thunderstorm":"AST/Stellar_Detonation.webp", "Whiteout":"BLM/Blizzard.webp",
  "Banish":"PLD/Holy_Spirit.webp", "Barrier":"SCH/Succor.webp", "Cleanse":"ROLE-HEALER/Esuna.webp", "Curatio":"WHM/Assize.webp",
  "Cure":"WHM/Cure.webp", "Dispel":"ROLE-HEALER/Esuna.webp", "Faith":"WHM/Presence_of_Mind.webp", "Healing Wind":"WHM/Aero_II.webp",
  "Holy":"WHM/Holy.webp", "Illuminate":"SCH/Fey_Illumination.webp", "Luminescence":"WHM/Benediction.webp", "Mend":"WHM/Cure_II.webp",
  "Protect":"SCH/Adloquium.webp", "Regen":"WHM/Regen.webp", "Revive":"WHM/Raise.webp", "Shell":"SCH/Sacred_Soil.webp", "Smite":"PLD/Spirits_Within.webp", "Ward":"WHM/Divine_Benison.webp"
};

const CLASS_ICONS = {
  bard:"JOB_ICONS/Bard.webp", initiate:"ROLE-HEALER/Esuna.webp", mage:"JOB_ICONS/BlackMage.webp", ranger:"ROLE-RANGED/Foot_Graze.webp",
  rogue:"JOB_ICONS/Ninja.webp", warrior:"JOB_ICONS/Warrior.webp", archmage:"JOB_ICONS/BlackMage.webp", assassin:"JOB_ICONS/Ninja.webp",
  battlemage:"JOB_ICONS/RedMage.webp", berserker:"JOB_ICONS/Warrior.webp", bishop:"JOB_ICONS/WhiteMage.webp", "blade dancer":"JOB_ICONS/Dancer.webp",
  "fell knight":"JOB_ICONS/DarkKnight.webp", dragoon:"JOB_ICONS/Dragoon.webp", druid:"JOB_ICONS/Summoner.webp", gladiator:"JOB_ICONS/Paladin.webp", necromancer:"JOB_ICONS/Reaper.webp",
  paladin:"JOB_ICONS/Paladin.webp", purloiner:"JOB_ICONS/Ninja.webp", sabreur:"JOB_ICONS/Samurai.webp", summoner:"JOB_ICONS/Summoner.webp",
  shikari:"JOB_ICONS/Machinist.webp", thaumaturge:"JOB_ICONS/BlackMage.webp", troubador:"JOB_ICONS/Bard.webp", troubadour:"JOB_ICONS/Bard.webp",
  warlock:"JOB_ICONS/Reaper.webp", beastmaster:"JOB_ICONS/Summoner.webp", spellblade:"JOB_ICONS/RedMage.webp"
};
const TALENT_ICONS = {
  "arcane study":"BLM/Enochian.webp", "bardic study":"BRD/Mage's_Ballad.webp", "weapon proficiency":"ROLE-MELEE/Bloodbath.webp",
  "hp up":"WAR/Thrill_of_Battle.webp", "mp up":"BLM/Manafont.webp", "second wind":"ROLE-MELEE/Second_Wind.webp",
  "intensified spell":"BLM/Flare.webp", "distant spell":"BLM/Aetherial_Manipulation.webp", "spellshape":"RDM/Acceleration.webp",
  "scorching flame":"RDM/Verflare.webp", "thunderclap":"MNK/Thunderclap.webp", "numbing cold":"BLM/Freeze.webp", "amplification":"BLM/Triplecast.webp"
};
const EQUIPMENT_ICONS = {
  sword:"PLD/Fast_Blade.webp", dagger:"NIN/Spinning_Edge.webp", knife:"NIN/Throwing_Dagger.webp", axe:"WAR/Heavy_Swing.webp", bow:"BRD/Heavy_Shot.webp",
  crossbow:"MCH/Drill.webp", polearm:"DRG/True_Thrust.webp", staff:"BLM/Blizzard.webp", shield:"PLD/Sheltron.webp", armour:"PLD/Sentinel.webp", armor:"PLD/Sentinel.webp",
  potion:"items/Potion_icon1.webp", elixir:"items/Elixir_icon1.webp", ether:"items/Ether_icon2.webp", scroll:"items/120px-Clay_Tablet_Icon.webp", mount:"Mounts&Minions/Company_Chocobo_Mount.webp"
};
// Core Foundry art paths. These are served by Foundry itself, so they are not
// copied into the system package and remain portable across Foundry installs.
const CORE_WEAPON_BY_NAME = [
  [/greatsword|great sword|claymore/i, "icons/weapons/swords/greatsword-crossguard-steel.webp"],
  [/scimitar|curved sword/i, "icons/weapons/swords/scimitar-worn-blue.webp"],
  [/rapier/i, "icons/weapons/swords/sword-guard-bronze.webp"],
  [/shortsword|short sword/i, "icons/weapons/swords/sword-guard-worn-purple.webp"],
  [/katana/i, "icons/weapons/swords/sword-katana.webp"],
  [/sword|blade/i, "icons/weapons/swords/sword-broad-blue.webp"],
  [/greataxe|great axe|battleaxe|battle axe/i, "icons/weapons/axes/axe-battle-black.webp"],
  [/hatchet|handaxe|hand axe|francisca/i, "icons/weapons/axes/axe-battle-black.webp"],
  [/axe|chopper|tabar/i, "icons/weapons/axes/axe-battle-black.webp"],
  [/dagger|knife|kris|dirk/i, "icons/weapons/daggers/dagger-straight-blue.webp"],
  [/crossbow|slingbow/i, "icons/weapons/crossbows/crossbow-loaded-black.webp"],
  [/short bow/i, "icons/weapons/bows/shortbow-recurve.webp"],
  [/bow/i, "icons/weapons/bows/longbow-recurve-brown.webp"],
  [/glaive/i, "icons/weapons/polearms/glaive-simple.webp"],
  [/halberd|poleaxe/i, "icons/weapons/polearms/halberd-engraved-black.webp"],
  [/javelin/i, "icons/weapons/polearms/javelin.webp"],
  [/spear|pike|lance|trident|fork/i, "icons/weapons/polearms/spear-flared-green.webp"],
  [/quarterstaff|staff|wand/i, "icons/weapons/staves/staff-simple.webp"],
  [/hammer|pick/i, "icons/weapons/hammers/shorthammer-double-stone-engraved.webp"],
  [/mace|club|bludgeon|maul/i, "icons/weapons/maces/mace-flanged-steel.webp"],
  [/whip/i, "icons/sundries/survival/leather-strap-brown.webp"]
];
const CORE_WEAPON_BY_GROUP = {
  axes: "icons/weapons/axes/axe-battle-black.webp",
  bludgeons: "icons/weapons/clubs/club-banded-brown.webp",
  knives: "icons/weapons/daggers/dagger-straight-blue.webp",
  polearms: "icons/weapons/polearms/spear-flared-green.webp",
  swords: "icons/weapons/swords/sword-guard-worn-purple.webp",
  bows: "icons/weapons/bows/longbow-recurve-brown.webp",
  crossbows: "icons/weapons/crossbows/crossbow-loaded-black.webp",
  staves: "icons/weapons/staves/staff-simple.webp"
};
const CORE_RELIC_ICONS = {
  "academic's memoire": "icons/svg/book.svg", "dancer's memoire": "icons/svg/music.svg",
  "mediator's memoire": "icons/svg/book.svg", "minstrel's memoire": "icons/svg/music.svg",
  "animism writ": "icons/svg/book.svg", "clerical writ": "icons/svg/holy-symbol.svg",
  "devout writ": "icons/svg/holy-symbol.svg", "occult writ": "icons/svg/aura.svg",
  "arcanist's enchiridion": "icons/svg/book.svg", "conjurer's enchiridion": "icons/svg/aura.svg",
  "elementalist's enchiridion": "icons/svg/aura.svg", "illusionist's enchiridion": "icons/svg/target.svg",
  "archer's report": "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
  "hunter's report": "icons/svg/target.svg", "scout's report": "icons/svg/aura.svg",
  "tamer's report": "icons/svg/claw.svg", "charlatan's memorandum": "icons/svg/book.svg",
  "cutthroat's memorandum": "icons/weapons/daggers/dagger-straight-blue.webp",
  "footpad's memorandum": "icons/svg/aura.svg", "saboteur's memorandum": "icons/svg/item-bag.svg",
  "thief's memorandum": "icons/svg/target.svg", "barbaric treatise": "icons/weapons/axes/axe-battle-black.webp",
  "defensive treatise": "icons/svg/shield.svg", "fighting treatise": "icons/weapons/swords/sword-broad-blue.webp",
  "uhlan's treatise": "icons/weapons/polearms/spear-flared-green.webp",
  "antique music box": "icons/svg/music.svg", "petrified dragon egg": "icons/svg/claw.svg",
  "starsteel fragment": "icons/svg/d20-grey.svg", "ancient faestone": "icons/svg/aura.svg",
  "seeing stone": "icons/svg/target.svg", "cursed soulstone": "icons/svg/skull.svg",
  "glorious medal": "icons/svg/holy-symbol.svg", "black planchette": "icons/svg/aura.svg",
  "cleansed soulstone": "icons/svg/holy-symbol.svg", "black bag": "icons/svg/item-bag.svg",
  "bottled lightning": "icons/svg/aura.svg", "quicksilver trinket": "icons/svg/aura.svg",
  "obsidian arrowhead": "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
  "antique emberbox": "icons/svg/aura.svg", "prism stone": "icons/svg/aura.svg",
  "missing music": "icons/svg/music.svg", "corrupted testament": "icons/svg/book.svg",
  "obsidian skull": "icons/svg/skull.svg", "tainted grail": "icons/svg/holy-symbol.svg",
  "moonstone effigy": "icons/svg/aura.svg"
};
const CORE_CATEGORY_ICONS = {
  "bardic instruments": "icons/svg/music.svg", "orchestral scores": "icons/svg/book.svg",
  "black magick scrolls": "icons/svg/book.svg", "blue magick scrolls": "icons/svg/book.svg",
  "green magick scrolls": "icons/svg/book.svg", "red magick scrolls": "icons/svg/book.svg",
  "white magick scrolls": "icons/svg/book.svg", poisons: "icons/svg/biohazard.svg",
  ammunition: "icons/svg/target.svg", mounts: "icons/svg/claw.svg",
  prosthetics: "icons/svg/item-bag.svg", consumables: "icons/svg/item-bag.svg",
  accessories: "icons/svg/holy-symbol.svg", "crafting resources": "icons/svg/item-bag.svg",
  "adventuring gear": "icons/svg/item-bag.svg"
};

const fileSet = new Set(ASSET_ICON_FILES);
function asset(path) { return fileSet.has(path) ? `${ROOT}${encodeURI(path)}` : "icons/svg/aura.svg"; }
function textOf(item = {}, packName = "") {
  return [item.name, item.system?.category, item.system?.school, item.system?.sourceClass, item.system?.className, item.system?.tree, item.system?.weaponGroup, item.system?.description, packName].filter(Boolean).join(" ").toLowerCase();
}
function typeOf(item = {}, packName = "") {
  if (item.type) return item.type;
  if (packName.includes("magick") || packName === "spells") return "spell";
  if (packName.includes("equipage")) return packName.includes("armour") ? "armor" : "equipment";
  if (packName === "performances") return "performance";
  if (packName === "technicks") return "technick";
  if (packName.includes("talent")) return "talent";
  if (packName.includes("class")) return "class";
  if (packName === "races") return "race";
  return "other";
}
function nearestAsset(text, preferredFolders = []) {
  const words = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
  let best = "generic/character.webp", bestScore = -Infinity;
  for (const file of ASSET_ICON_FILES) {
    const folder = file.split("/")[0];
    const base = file.split("/").at(-1).replace(/\.webp$/i, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/);
    let score = preferredFolders.includes(folder) ? 5 : 0;
    for (const word of words) if (base.includes(word)) score += word.length > 4 ? 6 : 3;
    if (/JOB_ICONS|Macros|Tab Icons|Stat Icons|items|Mounts&Minions/.test(folder)) score -= 20;
    if (score > bestScore) { best = file; bestScore = score; }
  }
  return asset(best);
}

/** Map rule items to locally bundled, authored artwork; invalid legacy paths fall back safely. */
export function resolveItemIcon(item = {}, packName = "") {
  const existing = item.img;
  if (existing?.startsWith("icons/weapons/") || existing?.startsWith("icons/equipment/")) return existing;
  if (existing && !GENERIC_IMAGES.has(existing) && !existing.startsWith("icons/") && !existing.startsWith("systems/last-arc-analogue/")) return existing;
  const type = typeOf(item, packName);
  const name = String(item.name ?? "").trim();
  const text = textOf(item, packName);
  if (type === "spell") return asset(SPELL_OVERRIDES[name] ?? SPELL_ICON_MAP[name] ?? "generic/character.webp");
  if (type === "class" || type === "advanced-class") {
    for (const [key, icon] of Object.entries(CLASS_ICONS)) if (text.includes(key)) return asset(icon);
    return asset("JOB_ICONS/Astrologian.webp");
  }
  if (type === "armor") {
    if (/shield|pelta|targe|buckler/i.test(text)) return "icons/svg/shield.svg";
    return "icons/equipment/chest/breastplate-collared-steel-grey.webp";
  }
  if (type === "equipment" || packName.includes("equipage")) {
    const category = String(item.system?.category ?? "").toLowerCase();
    if (CORE_CATEGORY_ICONS[category]) return CORE_CATEGORY_ICONS[category];
    for (const [pattern, icon] of CORE_WEAPON_BY_NAME) if (pattern.test(name)) return icon;
    return "icons/svg/item-bag.svg";
  }
  if (type === "performance" || /bardic|performance|score/.test(text)) return nearestAsset(text, ["BRD", "ROLE-HEALER"]);
  if (["technick", "talent", "feature"].includes(type)) {
    for (const [key, icon] of Object.entries(TALENT_ICONS)) if (text.includes(key)) return asset(icon);
    const folders = /bard|music|perform/.test(text) ? ["BRD"] : /fire|flame|scorch|ember/.test(text) ? ["BLM", "RDM"] : /heal|cure|restore|life/.test(text) ? ["WHM", "SCH"] : /stealth|assassin|sneak|thief|dodge/.test(text) ? ["NIN"] : /shield|defen|guard|armou?r|protect/.test(text) ? ["PLD", "ROLE-TANK"] : /summon|aeon|spirit/.test(text) ? ["SMN"] : /nature|beast|druid|animal/.test(text) ? ["SMN", "SCH"] : /lightning|thunder|shock/.test(text) ? ["BLM", "RDM"] : /ice|frost|cold/.test(text) ? ["BLM"] : /arcane|spell|magick|mana|rune|eldritch/.test(text) ? ["BLM", "AST"] : ["ROLE-MELEE", "DRG", "WAR"];
    return nearestAsset(text, folders);
  }
  if (type === "weapon" || (!["equipment", "armor"].includes(type) && /weapon|sword|blade|dagger|knife|axe|bow|crossbow|polearm|staff|mace/.test(text))) {
    for (const [pattern, icon] of CORE_WEAPON_BY_NAME) if (pattern.test(name)) return icon;
    const groupIcon = CORE_WEAPON_BY_GROUP[String(item.system?.weaponGroup ?? "").toLowerCase()];
    if (groupIcon) return groupIcon;
    for (const [key, icon] of Object.entries(EQUIPMENT_ICONS)) if (text.includes(key)) return asset(icon);
    return "icons/svg/sword.svg";
  }
  if (type === "relic") return CORE_RELIC_ICONS[name.toLowerCase()] ?? "icons/svg/book.svg";
  for (const [key, icon] of Object.entries(EQUIPMENT_ICONS)) if (text.includes(key)) return asset(icon);
  if (/race|species|elf|dwarf|human|gnome|goblin/.test(text)) return asset("generic/character.webp");
  return nearestAsset(text, ["generic", "JOB_ICONS"]);
}

export function isGenericItemIcon(path) { return !path || GENERIC_IMAGES.has(path); }
