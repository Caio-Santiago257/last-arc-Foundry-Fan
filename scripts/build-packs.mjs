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
