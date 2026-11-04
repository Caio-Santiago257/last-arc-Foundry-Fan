import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, "packs-source");
const outputDir = join(root, "packs");
await mkdir(outputDir, { recursive: true });

const { SPELLS } = await import("./spell-catalog.mjs");
const { PERFORMANCES } = await import("./performance-catalog.mjs");
const { AEONS } = await import("./aeon-catalog.mjs");
const EQUIPAGE_PACKS = {
  "Axes": "equipage-axes", "Bludgeons": "equipage-bludgeons", "Knives": "equipage-knives", "Polearms": "equipage-polearms",
  "Swords": "equipage-swords", "Bows": "equipage-bows", "Crossbows": "equipage-crossbows", "Staves": "equipage-staves",
  "Shields": "equipage-shields", "Light Armour": "equipage-light-armour", "Heavy Armour": "equipage-heavy-armour",
  "Mystic Armour": "equipage-mystic-armour", "Bardic Instruments": "equipage-instruments", "Accessories": "equipage-accessories",
  "Consumables": "equipage-consumables", "Poisons": "equipage-poisons", "Ammunition": "equipage-ammunition",
  "Black Magick Scrolls": "equipage-scrolls-black", "Blue Magick Scrolls": "equipage-scrolls-blue", "Green Magick Scrolls": "equipage-scrolls-green",
  "Red Magick Scrolls": "equipage-scrolls-red", "White Magick Scrolls": "equipage-scrolls-white", "Orchestral Scores": "equipage-scores",
  "Adventuring Gear": "equipage-adventuring-gear", "Prosthetics": "equipage-prosthetics", "Mounts": "equipage-mounts", "Crafting Resources": "equipage-resources"
};
const schoolPacks = new Map([
  ["Black Magick", "magick-black"], ["Blue Magick", "magick-blue"], ["Green Magick", "magick-green"],
  ["Red Magick", "magick-red"], ["White Magick", "magick-white"]
]);
for (const [school, packName] of schoolPacks) {
  const rows = SPELLS.filter(spell => spell.system.school === school).map(source => makePackRow("spells", source));
  await writeFile(join(outputDir, `${packName}.db`), rows.map(row => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  console.log(`${packName}: ${rows.length} documents`);
}
const performanceRows = PERFORMANCES.map(source => makePackRow("performances", source));
await writeFile(join(outputDir, "performances.db"), performanceRows.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
console.log(`performances: ${performanceRows.length} documents`);

for (const file of await readdir(sourceDir)) {
  if (!file.endsWith(".json")) continue;
  const packName = file.slice(0, -5);
  if (packName === "spells") continue;
  const raw = JSON.parse(await readFile(join(sourceDir, file), "utf8"));
  if (packName === "equipage") {
    for (const [category, pack] of Object.entries(EQUIPAGE_PACKS)) {
      const rows = raw.filter(entry => entry.system?.category === category).map(entry => makePackRow(pack, entry));
      await writeFile(join(outputDir, `${pack}.db`), rows.map(row => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "utf8");
      console.log(`${pack}: ${rows.length} documents`);
    }
    continue;
  }
  const rows = raw.map(entry => makePackRow(packName, entry));
  await writeFile(join(outputDir, `${packName}.db`), rows.map(row => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  console.log(`${packName}: ${rows.length} documents`);
}

const technickSource = JSON.parse(await readFile(join(sourceDir, "technicks.json"), "utf8"));
const aeonRows = AEONS.map(aeon => makeAeonActor(aeon, SPELLS, technickSource));
await writeFile(join(outputDir, "aeons.db"), aeonRows.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
console.log(`aeons: ${aeonRows.length} actor documents`);

function makeAeonActor(aeon, spells, technicks) {
  const first = aeon.levels[0];
  const image = aeon.img ?? `icons/creatures/magical/elemental-${aeon.affinity === "electric" ? "air" : aeon.affinity === "cold" ? "ice" : aeon.affinity === "fire" ? "fire" : aeon.affinity === "dark" ? "earth" : "earth"}.webp`;
  const makeEmbedded = (key, source) => ({
    _id: createHash("sha256").update(`aeons:${aeon.id}:${key}`).digest("hex").slice(0, 16),
    name: source.name, type: source.type, img: source.img ?? image, system: source.system ?? {}, effects: source.effects ?? [], folder: null, sort: 0, ownership: { default: 0 }, flags: source.flags ?? {}
  });
  const items = [makeEmbedded("attack", {
    name: `${aeon.name} Natural Attack`, type: "weapon",
    system: { weaponGroup: "natural", weaponSkill: "unarmed", range: "Melee", damage: { formula: first.damage, type: first.damageType }, attack: { bonus: 0 }, aeonPrimaryAttack: true }
  })];
  for (const feature of aeon.features) items.push(makeEmbedded(`feature:${feature.name}`, {
    name: `${aeon.name}: ${feature.name}`, type: "feature",
    system: { category: feature.ultimate ? "Aeon Ultimate" : "Aeon Trait", description: feature.description, automation: feature.ultimate ? { kind: "aeonUltimate", attackDefence: aeon.id === "betelgeuse" ? "fort" : "ref", damageType: aeon.affinity } : feature.automation ?? {} }
  }));
  for (const entry of aeon.spellProgression.filter(entry => entry.level <= 1)) for (const name of entry.spells) {
    const spell = spells.find(candidate => candidate.name.toLowerCase() === name.toLowerCase());
    if (!spell) throw new Error(`Aeon spell missing from catalogue: ${aeon.name} / ${name}`);
    const source = makePackRow(`aeon-${aeon.id}`, spell);
    source.system.aeonEntity = aeon.spellOwners?.[name] ?? "";
    source.flags = { "last-arc-analogue": { aeonGranted: { kind: "spell", name, level: 1 } } };
    items.push(makeEmbedded(`spell:${name}`, source));
  }
  for (const entry of aeon.technickProgression.filter(entry => entry.level <= 1)) for (const label of entry.technicks) {
    const match = label.match(/^([^(]+?)(?:\s*\((.+)\))?$/);
    const baseName = match?.[1]?.trim() ?? label;
    const selection = match?.[2]?.trim() ?? "";
    const canonical = technicks.find(candidate => candidate.name.toLowerCase() === baseName.toLowerCase());
    if (!canonical) throw new Error(`Aeon Technick missing from catalogue: ${aeon.name} / ${label}`);
    const source = structuredClone(canonical);
    if (/^Weapon Proficiency$/i.test(baseName)) source.system.selectedWeaponGroup = selection;
    if (/^Skill Focus$/i.test(baseName)) source.system.selectedSkill = selection;
    source.flags = { "last-arc-analogue": { aeonGranted: { kind: "technick", name: label, level: 1 } } };
    items.push(makeEmbedded(`technick:${label}`, source));
  }
  const size = aeon.size === "huge" ? 3 : aeon.size === "large" ? 2 : 1;
  const levels = aeon.levels.map((row, index) => ({ ...row, level: index + 1 }));
  return {
    _id: createHash("sha256").update(`aeon-actor:${aeon.id}`).digest("hex").slice(0, 16),
    name: `${aeon.name} (${aeon.epithet})`, type: "npc", img: image,
    system: {
      details: { level: 1, className: "Aeon", race: aeon.size, biography: `<p>${aeon.description}</p>` },
      attributes: Object.fromEntries(["str", "vit", "agi", "int", "mnd", "cha"].map(key => [key, { score: 10 }])),
      skills: { perception: { trained: true }, spellcraft: { trained: true }, unarmed: { trained: true } },
      defences: { ref: { total: first.ref }, fort: { total: first.fort }, will: { total: first.will } },
      resources: { hp: { value: first.hp, max: first.hp, baseMax: first.hp }, mp: { value: first.mp, max: first.mp } },
      combat: { creatureSize: aeon.size, speed: aeon.speed.land, baseSpeed: aeon.speed.land, initiativeDie: "1d20", damageReduction: first.dr, baseDamageReduction: first.dr, immunities: [], resistances: [], vulnerabilities: [] },
      aeon: { isAeon: true, aeonId: aeon.id, name: aeon.name, epithet: aeon.epithet, affinity: aeon.affinity, size: aeon.size, reach: aeon.reach, speed: aeon.speed, description: aeon.description, features: aeon.features, spellProgression: aeon.spellProgression, spellOwners: aeon.spellOwners ?? {}, technickProgression: aeon.technickProgression, levels, summonerClassLevel: 1, summonerCharacterLevel: 8, ownerSummonerUuid: "", entityNames: aeon.id === "pleiades" ? ["Maiden", "Pythoness"] : [], immunities: ({ sirius: ["fire"], altair: ["electric"], arcturus: ["cold"], rasalas: ["electric"], betelgeuse: ["blind", "slow", "zombify"], fomalhaut: ["slow"] })[aeon.id] ?? [], resistances: ({ pleiades: ["holy"], alioth: ["electric"], betelgeuse: ["dark"] })[aeon.id] ?? [], vulnerabilities: ({ sirius: ["cold"], arcturus: ["fire"], alioth: ["cold"], betelgeuse: ["holy"] })[aeon.id] ?? [] }
    },
    prototypeToken: { name: aeon.name, texture: { src: image }, width: size, height: size, actorLink: true, disposition: 1, displayName: 20, displayBars: 20, bar1: { attribute: "resources.hp" }, bar2: { attribute: "resources.mp" } },
    items, effects: [], folder: null, sort: 0, ownership: { default: 0 }, flags: {}
  };
}

function makePackRow(packName, entry) {
  // A string-only list is useful for names whose copyrighted rule text should
  // be entered by each GM from a copy they are authorized to use.
  const source = typeof entry === "string" ? { name: entry } : entry;
  const id = createHash("sha256").update(`${packName}:${source.name}`).digest("hex").slice(0, 16);
  return {
    _id: id,
    name: source.name,
    type: source.type ?? inferType(packName),
    img: source.img ?? "icons/svg/item-bag.svg",
    system: source.system ?? { description: "" },
    effects: source.effects ?? [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {}
  };
}

function inferType(pack) {
  return ({ races: "race", classes: "class", "advanced-classes": "advanced-class", talents: "talent", technicks: "technick", spells: "spell", performances: "performance", equipment: "equipment" })[pack] ?? "other";
}
