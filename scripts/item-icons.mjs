const GENERIC_IMAGES = new Set([
  "icons/svg/item-bag.svg",
  "icons/svg/mystery-man.svg",
  "icons/svg/d20-grey.svg",
  "icons/magic/symbols/rune-sigil-blue.webp",
  "icons/magic/symbols/rune-sigil-red.webp",
  "icons/magic/symbols/rune-sigil-purple.webp",
  "icons/magic/symbols/rune-sigil-gold.webp",
  "icons/magic/symbols/rune-sigil-orange.webp"
]);

const IMAGE = {
  sword: "icons/skills/melee/strike-sword-steel-yellow.webp",
  dagger: "icons/skills/melee/strike-dagger-poison-green.webp",
  axe: "icons/weapons/axes/axe-battle-black.webp",
  bow: "icons/weapons/bows/bow-ornamental-carved-brown.webp",
  shield: "icons/magic/defensive/shield-barrier-blue.webp",
  armour: "icons/equipment/chest/breastplate-banded-steel-grey.webp",
  book: "icons/svg/book.svg",
  music: "icons/skills/trades/music-notes-sound-blue.webp",
  holy: "icons/magic/holy/prayer-hands-glowing-yellow-white.webp",
  stealth: "icons/magic/nature/stealth-hide-eyes-green.webp",
  target: "icons/svg/target.svg",
  aura: "icons/svg/aura.svg",
  greenRune: "icons/magic/symbols/rune-sigil-green.webp",
  blueRune: "icons/magic/symbols/rune-sigil-horned-blue.webp",
  redRune: "icons/magic/symbols/rune-sigil-red-orange.webp",
  purpleRune: "icons/magic/symbols/rune-sigil-horned-white-purple.webp",
  goldRune: "icons/magic/symbols/rune-sigil-rough-white-teal.webp",
  fire: "icons/magic/fire/explosion-fireball-large-orange.webp",
  ice: "icons/magic/water/barrier-ice-crystal-wall-faceted-blue.webp",
  lightning: "icons/magic/lightning/bolt-forked-blue.webp",
  nature: "icons/magic/nature/plant-poison-spit-green.webp",
  healing: "icons/magic/life/heart-cross-green.webp",
  spellShield: "icons/magic/defensive/shield-barrier-blue.webp",
  wind: "icons/magic/air/air-wave-gust-blue.webp",
  dark: "icons/magic/unholy/hand-claw-fog-green.webp",
  potion: "icons/consumables/potions/bottle-round-corked-blue.webp",
  scroll: "icons/sundries/scrolls/scroll-plain-tan.webp",
  potionGreen: "icons/consumables/potions/bottle-round-corked-green.webp",
  potionRed: "icons/consumables/potions/bottle-round-corked-orante-red.webp",
  gear: "icons/tools/smithing/anvil.webp"
};

const CLASS_IMAGES = {
  bard: IMAGE.music, initiate: IMAGE.holy, mage: IMAGE.book, ranger: IMAGE.target,
  rogue: IMAGE.stealth, warrior: IMAGE.sword, archmage: IMAGE.purpleRune,
  assassin: IMAGE.stealth, battlemage: IMAGE.sword, berserker: IMAGE.axe,
  bishop: IMAGE.holy, "blade dancer": IMAGE.dagger, dragoon: IMAGE.sword,
  druid: IMAGE.nature, gladiator: IMAGE.sword, necromancer: IMAGE.dark,
  paladin: IMAGE.holy, purloiner: IMAGE.stealth, sabreur: IMAGE.sword,
  summoner: IMAGE.aura, thaumaturge: IMAGE.purpleRune, troubadour: IMAGE.music,
  warlock: IMAGE.dark, "beastmaster": IMAGE.nature, "spellblade": IMAGE.blueRune
};
const TREE_IMAGES = {
  academic: IMAGE.book, dancer: IMAGE.dagger, mediator: IMAGE.holy, minstrel: IMAGE.music,
  animist: IMAGE.nature, cleric: IMAGE.holy, devotee: IMAGE.holy, occultist: IMAGE.dark,
  arcanist: IMAGE.purpleRune, conjurer: IMAGE.healing, elementalist: IMAGE.fire, illusionist: IMAGE.stealth,
  archer: IMAGE.bow, hunter: IMAGE.target, scout: IMAGE.stealth, tamer: IMAGE.nature,
  charlatan: IMAGE.book, cutthroat: IMAGE.dagger, footpad: IMAGE.stealth, saboteur: IMAGE.gear,
  thief: IMAGE.stealth, barbarian: IMAGE.axe, defender: IMAGE.shield, fighter: IMAGE.sword,
  uhlan: IMAGE.sword, thaumaturge: IMAGE.purpleRune, blackguard: IMAGE.dark, sniper: IMAGE.target,
  spellblade: IMAGE.sword, spellbreaker: IMAGE.shield, viking: IMAGE.axe, priest: IMAGE.holy,
  dervish: IMAGE.dagger, dragoneer: IMAGE.sword, lancer: IMAGE.sword, beastcaller: IMAGE.nature,
  shapeshifter: IMAGE.nature, reaver: IMAGE.dark, champion: IMAGE.sword, necromant: IMAGE.dark,
  templar: IMAGE.holy, brigand: IMAGE.dagger, trickster: IMAGE.stealth, fencer: IMAGE.dagger,
  marksman: IMAGE.target, skirmisher: IMAGE.bow, evoker: IMAGE.aura, balladeer: IMAGE.music,
  diabolist: IMAGE.dark
};

function textOf(item = {}, packName = "") {
  return [item.name, item.system?.category, item.system?.school, item.system?.sourceClass,
    item.system?.className, item.system?.tree, item.system?.weaponGroup, item.system?.description, packName]
    .filter(Boolean).join(" ").toLowerCase();
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

/** Return a Foundry Core Data image for an item, preserving custom artwork. */
export function resolveItemIcon(item = {}, packName = "") {
  const existing = item.img;
  if (existing && !GENERIC_IMAGES.has(existing)) return existing;

  const type = typeOf(item, packName);
  const text = textOf(item, packName);
  if (type === "spell") {
    if (/fire|flame|ember|blaze|scorch|inferno|flare|eruption|meteor/.test(text)) return IMAGE.fire;
    if (/ice|frost|blizzard|snow|cold|freeze|gelid/.test(text)) return IMAGE.ice;
    if (/lightning|thunder|electric|galvanic|shock|bolt/.test(text)) return IMAGE.lightning;
    if (/heal|cure|life|raise|regen|restor|white magick/.test(text)) return IMAGE.healing;
    if (/wind|air|tornado|whirl|gust/.test(text)) return IMAGE.wind;
    if (/dark|black hole|void|shadow|drain|death|doom|necrot/.test(text)) return IMAGE.dark;
    if (/green magick|nature|thorn|vine|plant|growth/.test(text)) return IMAGE.nature;
    if (/shield|protect|barrier|guard|wall/.test(text)) return IMAGE.spellShield;
    if (/black magick/.test(text)) return IMAGE.purpleRune;
    if (/blue magick/.test(text)) return IMAGE.blueRune;
    if (/green magick/.test(text)) return IMAGE.greenRune;
    if (/red magick/.test(text)) return IMAGE.redRune;
    if (/white magick/.test(text)) return IMAGE.goldRune;
    return IMAGE.blueRune;
  }
  if (type === "performance" || /bardic|performance|score/.test(text)) {
    if (/ranged|arrow|bow/.test(text)) return IMAGE.target;
    if (/melee|weapon|damage|strike|attack/.test(text)) return IMAGE.sword;
    if (/reflex|fortitude|defen|protect|shield/.test(text)) return IMAGE.shield;
    if (/spellcraft|magick|arcane/.test(text)) return IMAGE.purpleRune;
    if (/skill|check|knowledge/.test(text)) return IMAGE.book;
    if (/heal|restore|life/.test(text)) return IMAGE.healing;
    if (/mp|mana/.test(text)) return IMAGE.blueRune;
    return IMAGE.music;
  }
  if (type === "class" || type === "advanced-class") {
    for (const [name, image] of Object.entries(CLASS_IMAGES)) if (text.includes(name)) return image;
    return IMAGE.book;
  }
  if (type === "technick" || type === "talent" || type === "feature") {
    if (/intensified spell/.test(text)) return IMAGE.redRune;
    if (/distant spell/.test(text)) return IMAGE.blueRune;
    if (/lingering spell/.test(text)) return IMAGE.purpleRune;
    if (/enlarged spell/.test(text)) return IMAGE.greenRune;
    if (/multi.?spell/.test(text)) return IMAGE.goldRune;
    if (/subtle spell/.test(text)) return IMAGE.stealth;
    for (const [tree, image] of Object.entries(TREE_IMAGES)) if (text.includes(tree)) return image;
    if (/arcane|spell|magick|mana|rune|eldritch|thaumatur/.test(text)) return IMAGE.purpleRune;
    if (/heal|cure|restore|life|vital|second wind/.test(text)) return IMAGE.healing;
    if (/fire|flame|scorch|ember|burn/.test(text)) return IMAGE.fire;
    if (/ice|frost|cold/.test(text)) return IMAGE.ice;
    if (/lightning|thunder|shock/.test(text)) return IMAGE.lightning;
    if (/stealth|assassin|sneak|thief|shadow|dodge|evade/.test(text)) return IMAGE.stealth;
    if (/bow|archer|ranged|aim|shot|arrow/.test(text)) return IMAGE.target;
    if (/shield|defen|guard|armou?r|fortitude|protect/.test(text)) return IMAGE.shield;
    if (/axe|berserk|rage/.test(text)) return IMAGE.axe;
    if (/sword|blade|strike|weapon|attack|melee|warrior|dragoon/.test(text)) return IMAGE.sword;
    if (/summon|aeon|spirit|aura/.test(text)) return IMAGE.aura;
    if (/bard|music|perform|song|dance/.test(text)) return IMAGE.music;
    if (/holy|paladin|bishop|divine/.test(text)) return IMAGE.holy;
    if (/nature|beast|druid|animal|survival/.test(text)) return IMAGE.nature;
    if (/necrom|death|curse|dark|void/.test(text)) return IMAGE.dark;
    if (/knowledge|study|lore|learn|book|scholar|arcane/.test(text)) return IMAGE.book;
    return IMAGE.goldRune;
  }
  if (type === "weapon" || /weapon|sword|blade|dagger|knife|axe|bow|crossbow|polearm|staff|mace/.test(text)) {
    if (/bow|ranged|crossbow/.test(text)) return IMAGE.bow;
    if (/axe/.test(text)) return IMAGE.axe;
    if (/knife|dagger/.test(text)) return IMAGE.dagger;
    if (/staff/.test(text)) return IMAGE.book;
    return IMAGE.sword;
  }
  if (type === "armor" || /armou?r|shield/.test(text)) return /shield/.test(text) ? IMAGE.shield : IMAGE.armour;
  if (/scroll|score|sheet music/.test(text)) return IMAGE.scroll;
  if (/potion|elixir|tonic/.test(text)) return /heal|red/.test(text) ? IMAGE.potionRed : IMAGE.potionGreen;
  if (/poison|venom/.test(text)) return IMAGE.potionGreen;
  if (/tool|craft|smith|gear|mount|prosthe|ammunition|resource/.test(text)) return IMAGE.gear;
  if (/race|species|elf|dwarf|human|gnome|goblin/.test(text)) return IMAGE.aura;
  return IMAGE.goldRune;
}
