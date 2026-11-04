import { rollSpell } from "./spells.mjs";
import { rollPerformance } from "./performances.mjs";

const ATTRIBUTES = ["str", "vit", "agi", "int", "mnd", "cha"];
const LEVEL_XP = [0, 0, 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000, 55000, 66000, 78000, 91000, 105000, 120000, 136000, 153000, 171000, 190000];
const WEAPON_GROUPS = ["axes", "bludgeons", "bows", "crossbows", "knives", "polearms", "staves", "swords"];
const WEAPON_SKILLS = new Set(["one-handed", "two-handed", "light-weapon", "ranged", "unarmed"]);
const SKILLS = {
  "one-handed": "str", "two-handed": "str", "light-weapon": "agi", ranged: "agi", unarmed: "str",
  acrobatics: "agi", alchemy: "int", athletics: "str", deception: "cha", disable: "agi",
  "lore-terrestrial": "int", "lore-mystic": "int", "lore-occult": "int", medicine: "int", perception: "mnd",
  perform: "cha", persuasion: "cha", pilot: "agi", ride: "agi", smithing: "int", spellcraft: "mnd", stealth: "agi", survival: "mnd"
};
const ITEM_TYPES = ["race", "class", "advanced-class", "spell", "performance", "talent", "technick", "weapon", "armor", "equipment", "feature", "other"];
const CLASS_TALENT_TREES = {
  Bard: ["Academic", "Dancer", "Mediator", "Minstrel"],
  Initiate: ["Animist", "Cleric", "Devotee", "Occultist"],
  Mage: ["Arcanist", "Conjurer", "Elementalist", "Illusionist"],
  Ranger: ["Archer", "Hunter", "Scout", "Tamer"],
  Rogue: ["Charlatan", "Cutthroat", "Footpad", "Saboteur", "Thief"],
  Warrior: ["Barbarian", "Defender", "Fighter", "Uhlan"]
};
const ATTRIBUTE_LABELS = { str: "LA.Strength", vit: "LA.Vitality", agi: "LA.Agility", int: "LA.Intelligence", mnd: "LA.Mind", cha: "LA.Charisma" };
const SKILL_LABELS = {
  "one-handed": "LA.OneHanded", "two-handed": "LA.TwoHanded", "light-weapon": "LA.LightWeapon", ranged: "LA.Ranged", unarmed: "LA.Unarmed",
  acrobatics: "LA.Acrobatics", alchemy: "LA.Alchemy", athletics: "LA.Athletics", deception: "LA.Deception", disable: "LA.Disable",
  "lore-terrestrial": "LA.LoreTerrestrial", "lore-mystic": "LA.LoreMystic", "lore-occult": "LA.LoreOccult", medicine: "LA.Medicine", perception: "LA.Perception",
  perform: "LA.Perform", persuasion: "LA.Persuasion", pilot: "LA.Pilot", ride: "LA.Ride", smithing: "LA.Smithing", spellcraft: "LA.Spellcraft", stealth: "LA.Stealth", survival: "LA.Survival"
};
const SKILL_ICONS = {
  "one-handed": "fa-hand-paper", "two-handed": "fa-hands", "light-weapon": "fa-feather", ranged: "fa-bullseye", unarmed: "fa-fist-raised",
  acrobatics: "fa-running", alchemy: "fa-flask", athletics: "fa-dumbbell", deception: "fa-mask", disable: "fa-lock",
  "lore-terrestrial": "fa-book-open", "lore-mystic": "fa-book-open", "lore-occult": "fa-book-open", medicine: "fa-medkit", perception: "fa-eye",
  perform: "fa-theater-masks", persuasion: "fa-comments", pilot: "fa-compass", ride: "fa-horse", smithing: "fa-hammer", spellcraft: "fa-magic", stealth: "fa-user-secret", survival: "fa-tree"
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function armourPenaltyForSkill(key, attribute, penalty) {
  if (!penalty) return 0;
  return ["str", "agi"].includes(attribute) || ["alchemy", "smithing", "spellcraft", "perform"].includes(key) ? penalty : 0;
}

function signed(value) { return `${value >= 0 ? "+" : ""}${value}`; }

function formatTechnickPrerequisites(system = {}) {
  const requirements = system.prerequisites ?? {};
  const parts = [];
  for (const [key, minimum] of Object.entries(requirements.attributes ?? {})) parts.push(`${game.i18n.localize(ATTRIBUTE_LABELS[key] ?? key)} ${minimum}+`);
  if (requirements.characterLevel) parts.push(`${game.i18n.localize("LA.CharacterLevel")} ${requirements.characterLevel}+`);
  for (const key of requirements.skills ?? []) parts.push(`${game.i18n.localize(SKILL_LABELS[key] ?? key)} (${game.i18n.localize("LA.Trained")})`);
  if (requirements.anySkills?.length) parts.push(game.i18n.localize("LA.AnyPerformanceTrained"));
  if (requirements.technicks?.length) parts.push(requirements.technicks.join(", "));
  return parts.join("; ");
}

function describePerformanceEffect(effect = {}) {
  if (effect.type === "damage") return `${effect.formula} ${game.i18n.localize("LA.Damage")} (${game.i18n.localize("LA.Unaspected")})`;
  if (effect.type === "mpDamage") return `${effect.formula} MP ${game.i18n.localize("LA.Lost")}`;
  if (effect.type === "debuff") return effect.defence === "all" ? game.i18n.localize("LA.PerformanceAllDefencesMinusTwo")
    : effect.defence === "attacksAndSkills" ? game.i18n.localize("LA.PerformanceAttacksSkillsMinusTwo")
      : `${game.i18n.localize(`LA.${effect.defence === "fort" ? "Fortitude" : "Will"}`)} ${signed(effect.value)}`;
  const bonuses = effect.bonuses ?? {};
  if (bonuses.damageDice) {
    const modeLabel = bonuses.damageDice.weaponMode === "ranged" ? "LA.Ranged" : "LA.Melee";
    return `+1d${bonuses.damageDice.die} ${game.i18n.localize("LA.Damage")} (${game.i18n.localize(modeLabel)})`;
  }
  if (bonuses.weaponSkillBonus) return `${signed(bonuses.weaponSkillBonus)} ${game.i18n.localize("LA.WeaponSkills")}`;
  if (bonuses.skillBonus?.value) return `${signed(bonuses.skillBonus.value)} ${game.i18n.localize("LA.EligibleSkillChecks")}`;
  if (bonuses.skillBonuses?.spellcraft) return `${signed(bonuses.skillBonuses.spellcraft)} ${game.i18n.localize("LA.Spellcraft")}`;
  if (bonuses.spellDefenceBonuses?.ref) return `${signed(bonuses.spellDefenceBonuses.ref)} ${game.i18n.localize("LA.Reflex")} ${game.i18n.localize("LA.AgainstSpells")}`;
  if (bonuses.defenceBonuses?.ref) return `${signed(bonuses.defenceBonuses.ref)} ${game.i18n.localize("LA.Reflex")} ${game.i18n.localize("LA.Defence")}`;
  if (bonuses.substituteDefence?.will) return `${game.i18n.localize("LA.UsePerformAsWill")}`;
  if (bonuses.substituteDefence?.fort) return `${game.i18n.localize("LA.UsePerformAsFort")}`;
  return game.i18n.localize("LA.PerformanceEffectSummary");
}

Hooks.once("init", () => {
  CONFIG.Actor.documentClass = LastArcActor;
  CONFIG.Item.documentClass = LastArcItem;
  CONFIG.Combatant.documentClass = LastArcCombatant;
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["resources.hp", "resources.mp"], value: ["details.level"] },
    npc: { bar: ["resources.hp", "resources.mp"], value: ["details.level"] }
  };
  Hooks.on("updateCombat", (combat, changes) => {
    if (changes.turn === undefined && changes.round === undefined) return;
    const activeActor = combat.combatants.get(combat.combatantId)?.actor;
    if (activeActor && safeNumber(activeActor.system.combat?.shieldBlocksThisTurn)) activeActor.update({ "system.combat.shieldBlocksThisTurn": 0 });
  });
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("last-arc-analogue", LastArcActorSheet, { types: ["character"], makeDefault: true, label: "LA.CharacterSheet" });
  Actors.registerSheet("last-arc-analogue", LastArcNPCSheet, { types: ["npc"], makeDefault: true, label: "LA.NPCSheet" });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("last-arc-analogue", LastArcItemSheet, { makeDefault: true, label: "LA.ItemSheet" });
  loadTemplates(["systems/last-arc-analogue/templates/item-list.hbs"]);
});

class LastArcActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const system = this.system;
    system.attributes ??= {};
    system.skills ??= {};
    system.defences ??= {};
    system.resources ??= {};
    system.details ??= {};
    system.combat ??= {};
    system.combat.baseDamageReduction ??= safeNumber(system.combat.damageReduction);
    system.combat.baseSpeed ??= safeNumber(system.combat.speed);
    system.combat.basePhysicalDamageReduction ??= safeNumber(system.combat.physicalDamageReduction);
    system.combat.baseElementalDamageReduction ??= safeNumber(system.combat.elementalDamageReduction);
    system.combat.physicalDamageReduction ??= 0;
    system.combat.elementalDamageReduction ??= 0;
    system.combat.breakGauge = Math.max(0, Math.min(5, Math.floor(safeNumber(system.combat.breakGauge))));
    system.combat.injuries ??= [];
    system.combat.recoveryMinorActions = Math.max(0, Math.min(2, Math.floor(safeNumber(system.combat.recoveryMinorActions))));
    system.combat.persistentHpRecovery ??= false;
    for (const key of ATTRIBUTES) system.attributes[key] ??= { score: 10 };
    const classItems = this.items.filter(item => ["class", "advanced-class"].includes(item.type));
    const raceItem = this.items.find(item => item.type === "race");
    const technicks = this.items.filter(item => item.type === "technick");
    const equippedGear = this.items.filter(item => item.system.equipped);
    const gearSkillBonuses = equippedGear.reduce((result, item) => {
      const bonus = item.system.itemEffects?.skillBonus;
      if (bonus) {
        const scope = String(bonus.scope ?? "").toLowerCase();
        const keys = scope.includes("lore") ? ["lore-terrestrial", "lore-mystic", "lore-occult"]
          : ["perform", "spellcraft", "acrobatics", "athletics", "stealth"].filter(key => scope.includes(key.replace("-", " ")) || (key === "perform" && scope.includes("dance")));
        for (const key of keys) result[key] = safeNumber(result[key]) + safeNumber(bonus.value);
      }
      return result;
    }, {});
    const gearDefenceBonuses = equippedGear.reduce((result, item) => {
      for (const [key, value] of Object.entries(item.system.itemEffects?.defenceBonuses ?? {})) result[key] += safeNumber(value);
      return result;
    }, { fort: 0, ref: 0, will: 0 });
    const gearHpBonus = equippedGear.reduce((sum, item) => sum + safeNumber(item.system.itemEffects?.hpMaxBonus), 0);
    const gearBreakBonus = equippedGear.reduce((sum, item) => sum + safeNumber(item.system.itemEffects?.breakThresholdBonus), 0);
    const gearSpeedBonus = equippedGear.reduce((sum, item) => sum + safeNumber(item.system.itemEffects?.speedBonus), 0);
    const armourPenalty = equippedGear.filter(item => item.type === "armor" && item.system.armorType !== "shield")
      .filter(item => !technicks.some(tech => tech.name.toLowerCase() === `armour proficiency (${String(item.system.armorType).toLowerCase()})`))
      .reduce((penalty, item) => Math.min(penalty, safeNumber(item.system.armorCheckPenalty)), 0);
    system.combat.equipmentResistances = [...new Set(equippedGear.flatMap(item => item.system.itemEffects?.resistances ?? []))];
    system.combat.equipmentImmunities = [...new Set(equippedGear.flatMap(item => item.system.itemEffects?.immunities ?? []))];
    system.combat.equipmentAllStatusImmunities = equippedGear.some(item => item.system.itemEffects?.allStatusImmunities);
    system.combat.equipmentMindEffectImmunity = equippedGear.some(item => item.system.itemEffects?.mindEffectImmunity);
    const technickEffects = technicks.map(item => item.system.effects ?? {});
    const activePerformances = [...(this.effects ?? [])].map(effect => effect.getFlag("last-arc-analogue", "performanceEffect")).filter(effect => effect && !effect.immunity);
    const technickDefences = technickEffects.reduce((result, effect) => {
      for (const key of ["fort", "ref", "will"]) result[key] += safeNumber(effect.defenceBonuses?.[key]);
      return result;
    }, { fort: 0, ref: 0, will: 0 });
    const brawlerBonus = Math.max(0, ...technicks.filter(item => /^Brawler [I]+$/.test(item.name)).map(item => safeNumber(item.system.effects?.conditional?.defenceBonuses?.ref)));
    const technickSkillBonuses = technickEffects.reduce((result, effect) => {
      for (const [key, value] of Object.entries(effect.skillBonuses ?? {})) result[key] = safeNumber(result[key]) + safeNumber(value);
      return result;
    }, {});
    const countTechnickEffect = key => technickEffects.reduce((sum, effect) => sum + safeNumber(effect[key]), 0);
    const performanceSkillBonus = key => activePerformances.reduce((sum, effect) => {
      const scoped = effect.skillBonus;
      const all = scoped && (scoped.allExcept ?? []).includes(key) ? 0 : safeNumber(scoped?.value);
      return sum + all + safeNumber(effect.skillBonuses?.[key]);
    }, 0);
    const performanceDefenceBonuses = activePerformances.reduce((result, effect) => {
      for (const [key, value] of Object.entries(effect.defenceBonuses ?? {})) result[key] += safeNumber(value);
      return result;
    }, { fort: 0, ref: 0, will: 0 });
    const activeClasses = classItems.filter(item => safeNumber(item.system.classLevel) > 0);
    const equippedArmours = this.items.filter(item => item.type === "armor" && item.system.equipped);
    const armourTotals = equippedArmours.reduce((result, item) => {
      result.damageReduction += safeNumber(item.system.damageReduction);
      result.reflexBonus += safeNumber(item.system.reflexBonus);
      result.physicalDamageReduction += safeNumber(item.system.physicalDamageReduction);
      result.elementalDamageReduction += safeNumber(item.system.elementalDamageReduction);
      result.maxAgilityBonus = Math.min(result.maxAgilityBonus, safeNumber(item.system.maxAgilityBonus, 99));
      return result;
    }, { damageReduction: 0, reflexBonus: 0, physicalDamageReduction: 0, elementalDamageReduction: 0, maxAgilityBonus: 99 });
    system.combat.damageReduction = safeNumber(system.combat.baseDamageReduction) + armourTotals.damageReduction;
    system.combat.physicalDamageReduction = safeNumber(system.combat.basePhysicalDamageReduction) + armourTotals.physicalDamageReduction;
    system.combat.elementalDamageReduction = safeNumber(system.combat.baseElementalDamageReduction) + armourTotals.elementalDamageReduction;
    system.combat.equippedArmour = equippedArmours.map(item => item.name);
    system.details.className = activeClasses.filter(item => item.type === "class").map(item => item.name).join(", ");
    system.details.advancedClass = activeClasses.filter(item => item.type === "advanced-class").map(item => item.name).join(", ");
    const classLevels = classItems.reduce((sum, item) => sum + Math.max(0, safeNumber(item.system.classLevel)), 0);
    const level = Math.max(1, classLevels || safeNumber(system.details?.level, 1));
    system.details.level = level;
    system.details.xp = Math.max(0, safeNumber(system.details.xp));
    system.details.nextLevel = level < LEVEL_XP.length - 1 ? LEVEL_XP[level + 1] : 0;
    for (const key of ATTRIBUTES) {
      const score = safeNumber(system.attributes?.[key]?.score, 10);
      system.attributes[key] ??= {};
      system.attributes[key].modifier = Math.floor((score - 10) / 2);
    }
    const injuryPenalties = { str: 0, agi: 0 };
    for (const injury of system.combat.injuries) {
      if (injury.type === "severed-arm") { injuryPenalties.str -= 5; injuryPenalties.agi -= 5; }
      if (injury.type === "severed-leg") injuryPenalties.agi -= 5;
    }
    system.combat.injuryAttributePenalties = injuryPenalties;
    const gaugePenalty = [0, -1, -2, -5, -10, -10][system.combat.breakGauge];
    system.combat.breakGaugePenalty = gaugePenalty;
    system.combat.unconscious = system.combat.breakGauge >= 5 || (safeNumber(system.resources?.hp?.max) > 0 && safeNumber(system.resources?.hp?.value) <= 0 && !system.combat.dead);
    for (const key of ATTRIBUTES) system.attributes[key].checkModifier = system.attributes[key].modifier + safeNumber(injuryPenalties[key]) + gaugePenalty;
    const halfLevel = Math.floor(level / 2);
    system.halfLevel = halfLevel;
    system.initiative = { total: 0 };
    for (const [key, attribute] of Object.entries(SKILLS)) {
      const skill = system.skills?.[key] ?? {};
      system.skills ??= {};
      system.skills[key] = {
        ...skill,
        attribute,
        halfLevel,
        attributeMod: system.attributes[attribute].modifier,
        classSkill: WEAPON_SKILLS.has(key) || classItems.some(item => item.system.classSkills?.includes(key)) || raceItem?.system.classSkills?.includes(key) || false,
        total: halfLevel + (skill.trained ? 5 : 0) + safeNumber(skill.classBonus) + classItems.reduce((sum, item) => sum + safeNumber(item.system.skillBonuses?.[key]) + safeNumber(item.system.selectedEffects?.skillBonuses?.[key]), 0) + safeNumber(system.details.racialEffects?.skillBonuses?.[key]) + safeNumber(technickSkillBonuses[key]) + performanceSkillBonus(key) + safeNumber(gearSkillBonuses[key]) + armourPenaltyForSkill(key, attribute, armourPenalty) + safeNumber(skill.misc) + system.attributes[attribute].modifier + safeNumber(injuryPenalties[attribute]) + gaugePenalty
      };
    }
    for (const defence of ["fort", "ref", "will"]) {
      const attribute = { fort: "vit", ref: "agi", will: "mnd" }[defence];
      const record = system.defences?.[defence] ?? {};
      const classBonus = Math.max(0, ...classItems.map(item => safeNumber(item.system.defenceBonuses?.[defence]) + safeNumber(item.system.selectedEffects?.defenceBonuses?.[defence])));
      const attributeModifier = defence === "ref" && activeClasses.some(item => ["Divine Benison", "Dark Pact"].some(name => item.system.classFeatures?.some(feature => feature.name === name)))
        ? Math.max(system.attributes.agi.modifier, system.attributes.mnd.modifier)
        : system.attributes[attribute].modifier;
      system.defences ??= {};
      system.defences[defence] = {
        ...record,
        base: 10,
        attributeMod: attributeModifier,
        classBonus,
        total: 10 + (defence === "ref" ? Math.min(attributeModifier, armourTotals.maxAgilityBonus) : attributeModifier) + classBonus + (defence === "ref" ? armourTotals.reflexBonus : 0) + safeNumber(system.details.racialEffects?.defenceBonuses?.[defence]) + technickDefences[defence] + performanceDefenceBonuses[defence] + gearDefenceBonuses[defence] + (defence === "ref" && system.combat.emptyHands && !system.combat.flatFooted ? brawlerBonus : 0) + level + safeNumber(record.misc) + gaugePenalty + safeNumber(injuryPenalties[attribute])
      };
    }
    const hp = system.resources?.hp ?? {};
    const mp = system.resources?.mp ?? {};
    system.resources.hp = { value: safeNumber(hp.value), max: safeNumber(system.resources.hp.baseMax, safeNumber(hp.max)) + gearHpBonus, baseMax: safeNumber(system.resources.hp.baseMax, safeNumber(hp.max)) };
    system.resources.mp = { value: safeNumber(mp.value), max: safeNumber(mp.max) };
    system.combat.breakThresholdBonus = countTechnickEffect("breakThresholdBonus") + gearBreakBonus;
    const size = String(raceItem?.system.size ?? system.combat.creatureSize ?? "medium").toLowerCase();
    const sizeBonus = ({ large: 5, huge: 10, gargantuan: 20, colossal: 50 })[size] ?? 0;
    system.combat.breakThresholdSizeBonus = sizeBonus;
    system.combat.breakThreshold = Math.max(0, safeNumber(system.defences.fort.total) + safeNumber(system.combat.breakThresholdBonus) + safeNumber(system.combat.damageThreshold) + sizeBonus);
    const legPenalty = system.combat.injuries.some(injury => injury.type === "severed-leg");
    system.combat.speed = Math.floor((safeNumber(system.combat.baseSpeed, safeNumber(system.combat.speed)) + gearSpeedBonus) / (legPenalty ? 2 : 1));
    system.combat.passivePerception = 10 + safeNumber(system.skills.perception?.total);
    const classInitiative = classItems.map(item => item.system.initiativeDie).filter(Boolean).sort((a, b) => Number((b.match(/d(\d+)/i) ?? [0, 0])[1]) - Number((a.match(/d(\d+)/i) ?? [0, 0])[1]))[0];
    const initiativeSteps = Math.min(technicks.filter(item => item.name === "Improved Initiative").length, 5);
    const initiativeSizes = [12, 10, 8, 6, 4, 3];
    const baseDie = classInitiative || system.combat.initiativeDie || "1d20";
    const baseDieSize = Number((baseDie.match(/d(\d+)/i) ?? [0, 20])[1]);
    const dieIndex = initiativeSizes.findIndex(size => size <= baseDieSize);
    system.combat.initiativeDie = initiativeSteps ? `1d${initiativeSizes[Math.min(initiativeSizes.length - 1, Math.max(0, dieIndex) + initiativeSteps)]}` : baseDie;
    system.combat.heroPointsPerDayBonus = countTechnickEffect("heroPointsPerDay");
    system.combat.extraSecondWinds = countTechnickEffect("extraSecondWinds");
    system.combat.additionalCounterattacks = technicks.some(item => item.system.effects?.counterattacksPerTurnFromAgi) ? Math.max(0, system.attributes.agi.modifier) : 0;
    system.combat.performanceWeaponSkillBonus = activePerformances.reduce((sum, effect) => sum + safeNumber(effect.weaponSkillBonus), 0);
    system.combat.performanceAttackBonus = activePerformances.reduce((sum, effect) => sum + safeNumber(effect.attackBonus), 0);
    system.combat.performanceDamageDice = activePerformances.map(effect => effect.damageDice).filter(Boolean);
    system.combat.performanceSpellDefenceBonuses = activePerformances.reduce((result, effect) => {
      for (const [key, value] of Object.entries(effect.spellDefenceBonuses ?? {})) result[key] += safeNumber(value);
      return result;
    }, { fort: 0, ref: 0, will: 0 });
    system.combat.performanceDefenceSubstitutions = activePerformances.reduce((result, effect) => {
      for (const [key, value] of Object.entries(effect.substituteDefence ?? {})) if (value) result[key] = Math.max(safeNumber(result[key]), safeNumber(effect.performTotal));
      return result;
    }, {});
    system.combat.rangedCriticalMultiplier = technicks.some(item => item.system.effects?.rangedCriticalMultiplier) ? 3 : 2;
    system.combat.weaponProficiencies = [...new Set(technicks.map(item => item.system.selectedWeaponGroup).filter(Boolean))];
    system.details.additionalLanguages = technicks.reduce((sum, item) => sum + (item.system.effects?.languages ? (item.system.selectedLanguages?.length ?? Math.max(1, 1 + system.attributes.int.modifier)) : 0), 0);
    system.details.additionalSpellSlots = technicks.reduce((sum, item) => sum + safeNumber(item.system.effects?.spellSlotsPerCopy) * Math.max(1, 1 + system.attributes.int.modifier), 0);
    system.details.additionalPerformanceSlots = technicks.reduce((sum, item) => sum + safeNumber(item.system.effects?.performanceSlotsPerCopy) * Math.max(0, 1 + system.attributes.int.modifier), 0);
    system.inventory ??= {};
    system.inventoryBulk = this.items.reduce((sum, item) => sum + safeNumber(item.system.quantity, 1) * safeNumber(item.system.bulk), 0);
    system.inventory.maxBulk = Math.floor((5 + safeNumber(system.attributes.str.score)) / (legPenalty ? 2 : 1));
    system.inventory.overBulk = Math.floor((10 + safeNumber(system.attributes.str.score)) / (legPenalty ? 2 : 1));
  }

  async applyDamage(amount, { type = "unaspected", bypassDR = false } = {}) {
    let damage = Math.max(0, Math.floor(safeNumber(amount)));
    const kind = String(type).toLowerCase();
    const kindGroup = ["blunt", "piercing", "slashing"].includes(kind) ? "physical" : ["cold", "dark", "electric", "fire", "holy"].includes(kind) ? "elemental" : kind;
    const parseTypes = value => Array.isArray(value) ? value.map(entry => String(entry).trim().toLowerCase()) : String(value ?? "").split(/[,;\n]+/).map(entry => entry.trim().toLowerCase()).filter(Boolean);
    const immunities = [...parseTypes(this.system.combat?.immunities), ...parseTypes(this.system.combat?.equipmentImmunities)];
    const resistances = [...parseTypes(this.system.combat?.resistances), ...parseTypes(this.system.combat?.equipmentResistances)];
    const vulnerabilities = parseTypes(this.system.combat?.vulnerabilities);
    const matches = values => values.some(entry => [kind, kindGroup, "all"].includes(entry));
    if (matches(immunities)) damage = 0;
    else if (matches(vulnerabilities)) damage *= 2;
    else if (matches(resistances)) damage = Math.floor(damage / 2);
    const physicalDR = ["physical", "blunt", "piercing", "slashing"].includes(kind) ? safeNumber(this.system.combat?.physicalDamageReduction) : 0;
    const elementalDR = ["fire", "cold", "electric"].includes(kind) ? safeNumber(this.system.combat?.elementalDamageReduction) : 0;
    const dr = bypassDR ? 0 : Math.max(0, safeNumber(this.system.combat?.damageReduction) + physicalDR + elementalDR);
    const applied = Math.max(0, damage - dr);
    const hp = this.system.resources.hp;
    const oldHp = safeNumber(hp.value);
    const newHp = Math.max(0, oldHp - applied);
    const threshold = safeNumber(this.system.combat.breakThreshold);
    const beatsThreshold = applied > threshold;
    let gauge = safeNumber(this.system.combat.breakGauge);
    const update = { "system.resources.hp.value": newHp, "system.combat.recoveryMinorActions": 0 };
    if (applied > 0 && beatsThreshold) gauge = Math.min(5, gauge + 1);
    if (newHp <= 0 && oldHp > 0) gauge = 5;
    const lethal = beatsThreshold && newHp <= 0;
    let savedByHeroPoint = false;
    if (lethal && this.type === "character" && safeNumber(this.system.resources.heroPoints?.value) > 0) {
      const spend = await Dialog.confirm({
        title: game.i18n.localize("LA.DeathPrevented"),
        content: `<p>${game.i18n.localize("LA.SpendHeroPointForDeath")}</p>`,
        yes: () => true, no: () => false, defaultYes: false
      });
      if (spend) {
        update["system.resources.heroPoints.value"] = safeNumber(this.system.resources.heroPoints.value) - 1;
        savedByHeroPoint = true;
      } else update["system.combat.dead"] = true;
    } else if (lethal) update["system.combat.dead"] = true;
    if (newHp <= 0 || gauge >= 5) gauge = 5;
    update["system.combat.breakGauge"] = gauge;
    if (savedByHeroPoint) {
      const injury = await this._rollInjuryAndDismemberment();
      if (injury) {
        const injuries = [...(this.system.combat.injuries ?? []), injury];
        update["system.combat.injuries"] = injuries;
      }
    }
    await this.update(update);
    const outcome = update["system.combat.dead"] ? `<strong>${game.i18n.localize("LA.Dead")}</strong>` : gauge >= 5 ? `<strong>${game.i18n.localize("LA.Unconscious")}</strong>` : `${game.i18n.localize("LA.BreakGauge")}: ${gauge}/5`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<p><strong>${game.i18n.localize("LA.ApplyDamage")}:</strong> ${applied} (${foundry.utils.escapeHTML(type)}). ${game.i18n.localize("LA.Health")}: ${newHp}/${hp.max}. ${game.i18n.localize("LA.BreakThreshold")}: ${threshold}; ${outcome}.</p>` });
    return applied;
  }

  async _rollInjuryAndDismemberment() {
    const roll = await (new Roll("1d100")).evaluate();
    const result = roll.total <= 5 ? { type: "severed-arm", name: game.i18n.localize("LA.SeveredArm"), description: game.i18n.localize("LA.SeveredArmEffect") }
      : roll.total <= 10 ? { type: "severed-leg", name: game.i18n.localize("LA.SeveredLeg"), description: game.i18n.localize("LA.SeveredLegEffect") }
        : roll.total <= 90 ? { type: "injury", name: game.i18n.localize("LA.Injury"), description: game.i18n.localize("LA.InjuryEffect") }
          : null;
    const text = result ? `<p><strong>${result.name}:</strong> ${result.description}</p>` : `<p>${game.i18n.localize("LA.NoInjury")}</p>`;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `${game.i18n.localize("LA.InjuryAndDismemberment")} — ${text}` });
    return result ? { ...result, id: foundry.utils.randomID(), date: Date.now() } : null;
  }

  async useSecondWind() {
    if (this.type !== "character") return ui.notifications.warn(game.i18n.localize("LA.SecondWindHeroicOnly"));
    if (this.system.combat.secondWindUsed) return ui.notifications.warn(game.i18n.localize("LA.SecondWindUsed"));
    const hp = this.system.resources.hp;
    if (safeNumber(hp.value) > safeNumber(hp.max) / 2) return ui.notifications.warn(game.i18n.localize("LA.SecondWindHalfHp"));
    if (this.system.combat.unconscious || this.system.combat.dead) return ui.notifications.warn(game.i18n.localize("LA.CannotActUnconscious"));
    const healed = Math.max(Math.floor(safeNumber(hp.max) / 4), safeNumber(this.system.attributes.vit.score));
    await this.update({ "system.resources.hp.value": Math.min(safeNumber(hp.max), safeNumber(hp.value) + healed), "system.combat.secondWindUsed": true, "system.combat.recoveryMinorActions": 0 });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<p><strong>${game.i18n.localize("LA.SecondWind")}:</strong> ${healed} HP.</p>` });
  }

  async rest(hours, comfortable) {
    const duration = Math.max(0, Math.min(24, Math.floor(safeNumber(hours))));
    if (duration <= 0) return;
    if (!comfortable) return ui.notifications.warn(game.i18n.localize("LA.RestNeedsComfort"));
    const now = Date.now();
    const periodStart = safeNumber(this.system.combat.restPeriodStartedAt);
    const previousHours = periodStart && now - periodStart < 24 * 60 * 60 * 1000 ? safeNumber(this.system.combat.restHoursInPeriod) : 0;
    const effectiveHours = Math.min(duration, Math.max(0, 8 - previousHours));
    const level = safeNumber(this.system.details.level, 1);
    const hp = this.system.resources.hp;
    const mp = this.system.resources.mp;
    const restCanHealHp = !this.system.combat.persistentHpRecovery && ![...this.effects].some(effect => /poison|disease|zombif/i.test(`${effect.name} ${effect.description ?? ""}`));
    const hpRecovery = restCanHealHp ? Math.max(0, (safeNumber(this.system.attributes.vit.modifier) + level) * effectiveHours) : 0;
    const mpRecovery = Math.max(0, (safeNumber(this.system.attributes.mnd.modifier) + level) * effectiveHours);
    const totalHours = previousHours + effectiveHours;
    const update = {
      "system.resources.hp.value": Math.min(safeNumber(hp.max), safeNumber(hp.value) + hpRecovery),
      "system.resources.mp.value": Math.min(safeNumber(mp.max), safeNumber(mp.value) + mpRecovery),
      "system.combat.restHoursInPeriod": totalHours,
      "system.combat.restPeriodStartedAt": previousHours ? periodStart : now,
      "system.combat.recoveryMinorActions": 0
    };
    if (totalHours >= 8) update["system.combat.secondWindUsed"] = false;
    await this.update(update);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<p><strong>${game.i18n.localize("LA.RestAndRecovery")} (${duration} ${game.i18n.localize("LA.Hours")}):</strong> +${hpRecovery} HP, +${mpRecovery} MP${totalHours >= 8 ? `; ${game.i18n.localize("LA.DailyAbilitiesRestored")}` : ""}.</p>` });
  }

  async takeRecoveryAction() {
    if (this.system.combat.unconscious || this.system.combat.dead) return ui.notifications.warn(game.i18n.localize("LA.CannotActUnconscious"));
    const gauge = safeNumber(this.system.combat.breakGauge);
    const persistent = (this.system.combat.injuries ?? []).filter(injury => injury.type === "injury").length;
    if (gauge <= persistent) return ui.notifications.info(game.i18n.localize("LA.NoRemovableBreakPenalty"));
    const next = safeNumber(this.system.combat.recoveryMinorActions) + 1;
    if (next < 3) {
      await this.update({ "system.combat.recoveryMinorActions": next });
      return ui.notifications.info(game.i18n.format("LA.RecoveryActionsProgress", { count: next }));
    }
    await this.update({ "system.combat.breakGauge": Math.max(persistent, gauge - 1), "system.combat.recoveryMinorActions": 0 });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<p>${game.i18n.localize("LA.RecoveryStepRemoved")}</p>` });
  }

  async applyHealing(amount) {
    const hp = this.system.resources.hp;
    const healed = Math.max(0, Math.floor(safeNumber(amount)));
    const actual = Math.min(healed, Math.max(0, safeNumber(hp.max) - safeNumber(hp.value)));
    if (!actual) return 0;
    await this.update({ "system.resources.hp.value": safeNumber(hp.value) + actual, "system.combat.persistentHpRecovery": false });
    return actual;
  }
}

class LastArcItem extends Item {
  async roll() {
    const actor = this.parent;
    if (actor?.system.combat.dead || actor?.system.combat.unconscious) {
      ui.notifications.warn(game.i18n.localize(actor.system.combat.dead ? "LA.Dead" : "LA.CannotActUnconscious"));
      return null;
    }
    if (actor && safeNumber(actor.system.combat.recoveryMinorActions) > 0) await actor.update({ "system.combat.recoveryMinorActions": 0 });
    if (this.type === "spell") return rollSpell(this);
    if (this.type === "performance") return rollPerformance(this);
    if (this.type === "talent" && actor) return this.rollTalent(actor);
    let formula = this.system.damage?.formula || this.system.roll?.formula;
    const title = this.name;
    let damageTitle = title;
    if (this.type === "armor" && this.system.armorType === "shield" && actor) {
      const skillKey = this.system.weaponSkill || "one-handed";
      const skillBonus = safeNumber(actor.system.skills?.[skillKey]?.total);
      const proficient = actor.items.some(item => item.type === "technick" && item.name === "Shield Proficiency");
      const proficiencyPenalty = proficient ? 0 : -5;
      const blockPenalty = -Math.max(0, safeNumber(actor.system.combat.shieldBlocksThisTurn)) * (proficient ? 5 : 10);
      const bonus = skillBonus + safeNumber(this.system.attack?.bonus) + proficiencyPenalty + blockPenalty;
      const block = await (new Roll(`1d20 + (${bonus})`, actor.getRollData())).evaluate();
      const specialNote = this.system.specialRules ? `<br><small>${foundry.utils.escapeHTML(this.system.specialRules)}</small>` : "";
      await block.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${game.i18n.localize("LA.ShieldBlock")}: ${foundry.utils.escapeHTML(title)} (${game.i18n.localize(SKILL_LABELS[skillKey] ?? skillKey)} ${signed(skillBonus)}; ${game.i18n.localize("LA.WeaponBonus")} ${signed(safeNumber(this.system.attack?.bonus))}${proficiencyPenalty ? `; ${game.i18n.localize("LA.UnproficientPenalty")}` : ""}${blockPenalty ? `; ${game.i18n.localize("LA.BlockPenalty")} ${signed(blockPenalty)}` : ""})${specialNote}` });
      if (game.combat) await actor.update({ "system.combat.shieldBlocksThisTurn": safeNumber(actor.system.combat.shieldBlocksThisTurn) + 1 });
      return block;
    }
    if (this.type === "weapon" && actor) {
      if (actor.system.combat.injuries?.some(injury => injury.type === "severed-arm") && (this.system.weaponSkill === "two-handed" || safeNumber(this.system.hands) >= 2)) {
        ui.notifications.warn(game.i18n.localize("LA.CannotUseTwoHandedSeveredArm"));
        return null;
      }
      const weaponGroup = String(this.system.weaponGroup ?? "").toLowerCase();
      const proficiencyPenalty = weaponGroup && !actor.system.combat.weaponProficiencies?.includes(weaponGroup) ? -5 : 0;
      const performanceAttackBonus = safeNumber(actor.system.combat.performanceWeaponSkillBonus) + safeNumber(actor.system.combat.performanceAttackBonus);
      const skillKey = this.system.weaponSkill || (weaponGroup === "bows" || weaponGroup === "crossbows" ? "ranged" : weaponGroup === "staves" ? "spellcraft" : "one-handed");
      const skillBonus = safeNumber(actor.system.skills?.[skillKey]?.total);
      const bonus = skillBonus + safeNumber(this.system.attack?.bonus) + proficiencyPenalty + performanceAttackBonus;
      const attack = await (new Roll(`1d20 + (${bonus})`, actor.getRollData())).evaluate();
      const specialNote = this.system.specialRules ? `<br><small>${foundry.utils.escapeHTML(this.system.specialRules)}</small>` : "";
      await attack.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${game.i18n.localize("LA.AttackRoll")}: ${foundry.utils.escapeHTML(title)} (${game.i18n.localize(SKILL_LABELS[skillKey] ?? skillKey)} ${signed(skillBonus)}; ${game.i18n.localize("LA.WeaponBonus")} ${signed(safeNumber(this.system.attack?.bonus))}${proficiencyPenalty ? `; ${game.i18n.localize("LA.UnproficientPenalty")}` : ""})${specialNote}` });
      const naturalTwenty = attack.dice.some(die => die.results?.some(result => result.result === 20));
      const weaponMode = ["bows", "crossbows"].includes(weaponGroup) || /ranged|range|distance/i.test(String(this.system.range ?? "")) ? "ranged" : "melee";
      if (formula) {
        const levelBonus = Math.floor(safeNumber(actor.system.details.level) / 2);
        const strengthMultiplier = weaponGroup === "staves" || weaponGroup === "crossbows" || weaponMode === "ranged" && weaponGroup !== "bows" ? 0 : this.system.weaponSkill === "two-handed" ? 2 : 1;
        const strengthBonus = safeNumber(actor.system.attributes.str?.modifier) * strengthMultiplier;
        const flatBonus = levelBonus + strengthBonus;
        if (flatBonus) formula = `(${formula}) + (${flatBonus})`;
      }
      const damageBonuses = (actor.system.combat.performanceDamageDice ?? []).filter(entry => entry.weaponMode === weaponMode);
      if (formula && damageBonuses.length) formula = `${formula} + ${damageBonuses.map(entry => `1d${safeNumber(entry.die)}`).join(" + ")}`;
      if (formula && ["bows", "crossbows"].includes(weaponGroup) && naturalTwenty && safeNumber(actor.system.combat.rangedCriticalMultiplier) > 2) {
        const multiplier = safeNumber(actor.system.combat.rangedCriticalMultiplier);
        formula = `(${formula}) * ${multiplier}`;
        damageTitle = `${title} — Critical ×${multiplier}`;
      }
    }
    if (formula) {
      const roll = await (new Roll(formula, actor?.getRollData?.() ?? {})).evaluate();
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: damageTitle });
      return roll;
    }
    const details = [this.system.description, this.system.specialRules].filter(Boolean).map(text => `<p>${foundry.utils.escapeHTML(text)}</p>`).join("");
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<h3>${foundry.utils.escapeHTML(title)}</h3>${details}` });
    return null;
  }

  async rollTalent(actor) {
    const target = [...(game.user?.targets ?? [])][0]?.actor;
    const name = this.name.toLowerCase();
    if (/^abyssal drain [i]+$/.test(name) || name === "mana tap") {
      if (!target) { ui.notifications.warn(game.i18n.localize("LA.SelectTalentTarget")); return null; }
      const skill = safeNumber(actor.system.skills?.spellcraft?.total);
      const check = await (new Roll(`1d20 + (${skill})`, actor.getRollData())).evaluate();
      const defence = name === "mana tap" ? "will" : "fort";
      const defenceTotal = safeNumber(target.system.defences?.[defence]?.total, 10);
      const success = check.total > defenceTotal;
      const cost = name.startsWith("abyssal drain") ? Math.ceil(safeNumber(actor.system.resources.mp.max) / 4) : 0;
      if (cost && safeNumber(actor.system.resources.mp.value) < cost) { ui.notifications.warn(game.i18n.localize("LA.NotEnoughMana")); return null; }
      if (cost) await actor.update({ "system.resources.mp.value": safeNumber(actor.system.resources.mp.value) - cost });
      await check.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${foundry.utils.escapeHTML(this.name)} — Spellcraft vs ${game.i18n.localize(defence === "fort" ? "LA.Fortitude" : "LA.Will")} ${defenceTotal}` });
      if (name.startsWith("abyssal drain")) {
        const formula = name.endsWith("ii") ? "8d6" : "4d6";
        const damage = await (new Roll(formula, actor.getRollData())).evaluate();
        const rolledDamage = Math.floor(damage.total);
        const amount = success ? rolledDamage : Math.floor(rolledDamage / 2);
        await damage.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${foundry.utils.escapeHTML(this.name)} — ${foundry.utils.escapeHTML(target.name)} (${success ? rolledDamage : `${game.i18n.localize("LA.HalfDamage")}: ${amount}`})` });
        const applied = await target.applyDamage(amount, { type: "dark" });
        const hp = actor.system.resources.hp;
        const healed = Math.min(applied, Math.max(0, safeNumber(hp.max) - safeNumber(hp.value)));
        await actor.applyHealing(healed);
        await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p>${game.i18n.localize("LA.Healing")}: ${healed} HP (${safeNumber(hp.value) + healed}/${safeNumber(hp.max)}).</p>` });
        return damage;
      }
      if (success) {
        const drain = await (new Roll("4d6", actor.getRollData())).evaluate();
        const lost = Math.min(safeNumber(target.system.resources.mp.value), drain.total);
        await drain.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${foundry.utils.escapeHTML(this.name)} — MP drained` });
        await target.update({ "system.resources.mp.value": safeNumber(target.system.resources.mp.value) - lost });
        await actor.update({ "system.resources.mp.value": Math.min(safeNumber(actor.system.resources.mp.max), safeNumber(actor.system.resources.mp.value) + lost) });
        return drain;
      }
      return check;
    }
    const detail = [this.system.description, this.system.prerequisites ? `${game.i18n.localize("LA.Requirements")}: ${this.system.prerequisites}` : ""].filter(Boolean).map(text => `<p>${foundry.utils.escapeHTML(text)}</p>`).join("");
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<h3>${foundry.utils.escapeHTML(this.name)}</h3>${detail}` });
  }
}

class LastArcActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["last-arc", "sheet", "actor"], template: "systems/last-arc-analogue/templates/actor-sheet.hbs",
      width: 1050, height: 820, resizable: true, tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "overview" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  get template() { return "systems/last-arc-analogue/templates/actor-sheet.hbs"; }
  async getData(options) {
    const context = await super.getData(options);
    context.system = this.actor.system;
    context.isCharacter = this.actor.type === "character";
    context.attributeList = ATTRIBUTES.map(key => ({ key, label: ATTRIBUTE_LABELS[key], ...this.actor.system.attributes[key] }));
    context.skills = Object.entries(SKILLS).map(([key, attribute]) => ({ key, label: SKILL_LABELS[key], icon: SKILL_ICONS[key], attribute, attributeLabel: ATTRIBUTE_LABELS[attribute], ...this.actor.system.skills[key] }));
    context.defenceList = ["fort", "ref", "will"].map(key => ({ key, label: `LA.${key === "fort" ? "Fortitude" : key === "ref" ? "Reflex" : "Will"}`, ...this.actor.system.defences[key] }));
    context.itemGroups = ITEM_TYPES.map(type => ({ type, label: game.i18n.localize(`LA.ItemType.${type}`), items: this.actor.items.filter(item => item.type === type) }));
    context.activeEffects = [...this.actor.effects].map(effect => {
      const performance = effect.getFlag("last-arc-analogue", "performanceEffect");
      const duration = performance?.expiresAfter ? game.i18n.localize("LA.UntilPerformersNextTurn")
        : effect.duration?.rounds ? `${effect.duration.rounds} ${game.i18n.localize("LA.Rounds")}` : game.i18n.localize("LA.UntilRemoved");
      return { id: effect.id, name: effect.name, img: effect.img, description: performance?.description ?? effect.description ?? "", duration };
    });
    context.canLevelUp = this.actor.system.details.level < LEVEL_XP.length - 1
      && this.actor.system.details.xp >= this.actor.system.details.nextLevel
      && this.actor.items.some(item => ["class", "advanced-class"].includes(item.type) && safeNumber(item.system.classLevel) > 0);
    context.gaugeSteps = [0, 1, 2, 3, 4, 5].map(step => ({ step, current: safeNumber(this.actor.system.combat.breakGauge) === step, bottom: step === 5, label: game.i18n.localize(["LA.BreakGaugeNormal", "LA.BreakGaugeMinusOne", "LA.BreakGaugeMinusTwo", "LA.BreakGaugeMinusFive", "LA.BreakGaugeMinusTen", "LA.BreakGaugeBottom"][step]) }));
    context.canSecondWind = this.actor.type === "character" && !this.actor.system.combat.secondWindUsed && !this.actor.system.combat.unconscious && !this.actor.system.combat.dead && safeNumber(this.actor.system.resources.hp.value) <= safeNumber(this.actor.system.resources.hp.max) / 2;
    context.canWakeCheck = this.actor.system.combat.unconscious && !this.actor.system.combat.dead && !this.actor.system.combat.persistentHpRecovery;
    context.injuries = this.actor.system.combat.injuries ?? [];
    context.recoveryActions = safeNumber(this.actor.system.combat.recoveryMinorActions);
    context.breakGaugePenaltyLabel = signed(this.actor.system.combat.breakGaugePenalty);
    context.isGM = game.user.isGM;
    context.atMaxLevel = this.actor.system.details.level >= LEVEL_XP.length - 1;
    context.showTripleCrit = this.actor.system.combat.rangedCriticalMultiplier > 2;
    context.hasWeaponProficiencies = Boolean(this.actor.system.combat.weaponProficiencies?.length);
    context.weaponProficiencyList = (this.actor.system.combat.weaponProficiencies ?? []).map(group => game.i18n.localize(`LA.WeaponGroup.${group}`));
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".rollable").on("click", this._onRoll.bind(this));
    html.find(".item-create").on("click", this._onItemCreate.bind(this));
    html.find(".item-edit").on("click", this._onItemEdit.bind(this));
    html.find(".item-delete").on("click", this._onItemDelete.bind(this));
    html.find(".item-roll").on("click", this._onItemRoll.bind(this));
    html.find("input[data-item-equipped]").on("change", async event => {
      const item = this.actor.items.get(event.currentTarget.dataset.itemId);
      if (item) await item.update({ "system.equipped": event.currentTarget.checked });
    });
    html.find(".apply-damage").on("click", this._onApplyDamage.bind(this));
    html.find(".la-second-wind").on("click", async event => { event.preventDefault(); await this.actor.useSecondWind(); });
    html.find(".la-rest").on("click", this._onRest.bind(this));
    html.find(".la-recovery-action").on("click", async event => { event.preventDefault(); await this.actor.takeRecoveryAction(); });
    html.find(".la-wake-check").on("click", this._onWakeCheck.bind(this));
    html.find(".la-injury-delete").on("click", this._onInjuryDelete.bind(this));
    html.find(".resource-control").on("click", this._onResourceControl.bind(this));
    html.find(".roll-attributes").on("click", this._onRollAttributes.bind(this));
    html.find(".la-level-up").on("click", this._onLevelUp.bind(this));
    html.find(".active-effect-delete").on("click", this._onActiveEffectDelete.bind(this));
  }

  async _onLevelUp(event) {
    event.preventDefault();
    const level = safeNumber(this.actor.system.details.level, 1);
    const nextLevel = level + 1;
    const xpRequired = LEVEL_XP[nextLevel];
    if (!xpRequired || safeNumber(this.actor.system.details.xp) < xpRequired) return;

    const ownedClasses = this.actor.items.filter(item => ["class", "advanced-class"].includes(item.type) && safeNumber(item.system.classLevel) > 0);
    const classes = ownedClasses.filter(item => ["class", "advanced-class"].includes(item.type)
      && (item.type !== "advanced-class" || safeNumber(item.system.classLevel) < 10));
    if (!ownedClasses.length) return ui.notifications.error(game.i18n.localize("LA.NoLevelClass"));
    const classPack = game.packs.get("last-arc-analogue.classes");
    const ownedClassNames = new Set(classes.filter(item => item.type === "class").map(item => item.name));
    const advancedPack = game.packs.get("last-arc-analogue.advanced-classes");
    const baseAvailable = classPack ? (await classPack.getDocuments()).filter(item => !ownedClassNames.has(item.name)) : [];
    const advancedAvailable = nextLevel >= 8 && advancedPack ? (await advancedPack.getDocuments()).filter(item =>
      !this.actor.items.some(owned => owned.type === "advanced-class" && owned.name === item.name)
      && this._meetsAdvancedClassPrerequisites(item, nextLevel)
    ) : [];
    const availableClasses = [...baseAvailable, ...advancedAvailable];
    const classChoices = [...classes.map(item => ({ item, isNew: false })), ...availableClasses.map(item => ({ item, isNew: true }))];
    const selectedClass = classChoices.length === 1 ? classChoices[0] : await this._chooseLevelClass(classes, availableClasses);
    if (!selectedClass) return;

    let attributeIncreases = null;
    if (nextLevel % 4 === 0) {
      attributeIncreases = await this._chooseAttributeIncreases();
      if (!attributeIncreases) return;
    }

    const projectedAttributes = {};
    for (const key of ATTRIBUTES) projectedAttributes[key] = safeNumber(this.actor.system.attributes[key].score, 10);
    for (const key of attributeIncreases ?? []) projectedAttributes[key] += 1;
    const nextClassLevel = selectedClass.isNew ? Math.max(1, safeNumber(selectedClass.item.system.classLevel, 1)) : safeNumber(selectedClass.item.system.classLevel) + 1;
    const newTechnicks = [];
    if (selectedClass.isNew && selectedClass.item.system.startingTechnicks?.length) {
      const startingTechnick = await this._chooseTechnick({ bonusTechnicks: selectedClass.item.system.startingTechnicks, classItem: selectedClass.item, characterLevel: nextLevel, projectedAttributes, priorSelections: newTechnicks });
      if (!startingTechnick) return;
      newTechnicks.push(startingTechnick);
    }
    const bonusLevels = selectedClass.item.system.bonusTechnickLevels ?? [];
    const hasClassBonus = !selectedClass.isNew
      && selectedClass.item.type === "class"
      && bonusLevels.map(Number).includes(nextClassLevel);
    if (hasClassBonus) {
      const technick = await this._chooseTechnick({
        bonusTechnicks: selectedClass.item.system.bonusTechnicks ?? [],
        classItem: selectedClass.item,
        characterLevel: nextLevel,
        projectedAttributes,
        priorSelections: newTechnicks
      });
      if (!technick) return;
      newTechnicks.push(technick);
    }

    const result = await this._applyClassDrop(selectedClass.item.toObject(), { levelUp: true });
    if (!result) return;

    if (attributeIncreases?.length) {
      const oldMaxHP = safeNumber(this.actor.system.resources.hp.max);
      const oldMaxMP = safeNumber(this.actor.system.resources.mp.max);
      const update = {};
      for (const key of attributeIncreases) update[`system.attributes.${key}.score`] = safeNumber(this.actor.system.attributes[key].score, 10) + 1;
      await this.actor.update(update);
      await this._recalculateClassResources(oldMaxHP, oldMaxMP);
    }
    for (const technick of newTechnicks) await this._grantTechnick(technick);
    if (attributeIncreases?.includes("int")) await this._learnOpenPerformanceSlots();
    ui.notifications.info(game.i18n.format("LA.LevelUpComplete", { level: nextLevel }));
  }

  _meetsAdvancedClassPrerequisites(item, characterLevel = safeNumber(this.actor.system.details.level, 1)) {
    const requirements = item.system ?? {};
    if (characterLevel < safeNumber(requirements.minimumCharacterLevel, 7) + 1) return false;
    if ((requirements.trainedSkills ?? []).some(key => !this.actor.system.skills[key]?.trained)) return false;
    const known = values => new Set(values.map(value => String(value).normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()));
    const techItems = this.actor.items.filter(entry => entry.type === "technick");
    const technicks = known(techItems.flatMap(entry => [entry.name, ...(entry.system.selectedWeaponGroup ? [`Weapon Proficiency (${entry.system.selectedWeaponGroup})`] : []), ...(entry.system.selectedSkill ? [`Skill Focus (${entry.system.selectedSkill})`] : [])]));
    if ((requirements.requiredTechnickGroups ?? []).some(group => !group.some(name => technicks.has(name.toLowerCase())))) return false;
    const talents = this.actor.items.filter(entry => entry.type === "talent");
    const talentNames = known(talents.map(entry => entry.name));
    const usedTalents = new Set();
    for (const rule of requirements.requiredTalentGroups ?? []) {
      const candidates = talents.filter(talent => !usedTalents.has(talent.id) && (rule.trees?.includes(talent.system.tree) || rule.names?.some(name => talentNames.has(name.toLowerCase()) && name.toLowerCase() === talent.name.toLowerCase())));
      const needed = safeNumber(rule.count, 1);
      if (candidates.length < needed) return false;
      for (const talent of candidates.slice(0, needed)) usedTalents.add(talent.id);
    }
    return true;
  }

  async _chooseLevelClass(classes, availableClasses) {
    const options = [
      ...classes.map((item, index) => `<option value="owned-${index}">${game.i18n.format("LA.AdvanceClassOption", { name: foundry.utils.escapeHTML(item.name), level: safeNumber(item.system.classLevel) })}</option>`),
      ...availableClasses.map((item, index) => `<option value="new-${index}">${game.i18n.format("LA.StartClassOption", { name: foundry.utils.escapeHTML(item.name) })}</option>`)
    ].join("");
    return new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.SelectLevelClass"),
      content: `<form><p>${game.i18n.localize("LA.SelectLevelClassHint")}</p><select name="class">${options}</select></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => {
          const [kind, rawIndex] = String(html.find("[name=class]").val() ?? "").split("-");
          const index = Number(rawIndex);
          resolve(kind === "owned" ? { item: classes[index], isNew: false } : kind === "new" ? { item: availableClasses[index], isNew: true } : null);
        } },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null)
    }).render(true));
  }

  async _chooseAttributeIncreases() {
    const options = ATTRIBUTES.map(key => `<option value="${key}">${game.i18n.localize(ATTRIBUTE_LABELS[key])}</option>`).join("");
    return new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.SelectAttributeIncrease"),
      content: `<form><p>${game.i18n.localize("LA.AttributeIncreaseHint")}</p><label>${game.i18n.localize("LA.AttributeIncreaseOne")}<select name="first">${options}</select></label><label>${game.i18n.localize("LA.AttributeIncreaseTwo")}<select name="second">${options}</select></label></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => resolve([html.find('[name="first"]').val(), html.find('[name="second"]').val()]) },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null)
    }).render(true));
  }

  async _chooseTechnick({ bonusTechnicks = null, classItem = null, characterLevel, projectedAttributes = {}, projectedTrainedSkills = [], priorSelections = [] } = {}) {
    const pack = game.packs.get("last-arc-analogue.technicks");
    if (!pack) {
      ui.notifications.error(game.i18n.localize("LA.TechnickPackUnavailable"));
      return null;
    }
    const all = await pack.getDocuments();
    const normalize = name => String(name ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    const bonusNames = bonusTechnicks?.map(normalize) ?? null;
    const bonusWeaponGroups = (bonusTechnicks ?? []).map(name => String(name).match(/^Weapon Proficiency \((.+)\)$/i)?.[1]?.toLowerCase()).filter(Boolean);
    const docs = all.filter(item => {
      const isWeaponChoice = item.name === "Weapon Proficiency" && bonusWeaponGroups.length > 0;
      if (bonusNames && !bonusNames.includes(normalize(item.name)) && !isWeaponChoice) return false;
      return this._meetsTechnickPrerequisites(item, { characterLevel, projectedAttributes, projectedTrainedSkills, priorSelections, classItem, allowedWeaponGroups: bonusNames ? bonusWeaponGroups : WEAPON_GROUPS });
    });
    if (!docs.length) {
      ui.notifications.error(game.i18n.localize("LA.NoEligibleTechnicks"));
      return null;
    }
    const rows = docs.map((item, index) => {
      const requirements = this._technickPrerequisiteText(item);
      return `<label class="la-technick-choice"><input type="checkbox" name="technick" value="${index}"><span><strong>${foundry.utils.escapeHTML(item.name)}</strong><small>${foundry.utils.escapeHTML(item.system.description ?? "")}</small>${requirements ? `<small class="la-technick-requirement">${game.i18n.localize("LA.Requirements")}: ${foundry.utils.escapeHTML(requirements)}</small>` : ""}</span></label>`;
    }).join("");
    const selection = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.SelectTechnick"),
      content: `<form class="la-technick-choice-form"><p>${game.i18n.localize(bonusNames ? "LA.SelectClassBonusTechnickHint" : "LA.SelectTechnickHint")}</p><fieldset>${rows}</fieldset></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => {
          const checked = html.find('input[name="technick"]:checked');
          if (checked.length !== 1) {
            ui.notifications.warn(game.i18n.localize("LA.ChooseOneTechnick"));
            resolve(null);
            return;
          }
          resolve(docs[Number(checked.val())] ?? null);
        } },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null),
      render: html => html.find('input[name="technick"]').on("change", event => {
        if (event.currentTarget.checked) html.find('input[name="technick"]').not(event.currentTarget).prop("checked", false);
      })
    }).render(true));
    if (!selection) return null;

    return this._configureTechnick(selection.toObject(), { classItem, projectedAttributes, projectedTrainedSkills, priorSelections, weaponGroups: bonusNames ? bonusWeaponGroups : null });
  }

  async _choosePerformances(count) {
    const required = Math.max(0, Math.floor(safeNumber(count)));
    if (!required) return [];
    const pack = game.packs.get("last-arc-analogue.performances");
    if (!pack) {
      ui.notifications.error(game.i18n.localize("LA.PerformancePackUnavailable"));
      return null;
    }
    const learned = new Set(this.actor.items.filter(item => item.type === "performance").map(item => item.name));
    const choices = (await pack.getDocuments()).filter(item => !learned.has(item.name));
    if (choices.length < required) {
      ui.notifications.error(game.i18n.format("LA.NotEnoughUnlearnedPerformances", { required, available: choices.length }));
      return null;
    }
    const rows = choices.map((item, index) => `<label class="la-choice-row"><input type="checkbox" name="performance" value="${index}"><span><strong>${foundry.utils.escapeHTML(item.name)}</strong><small>${foundry.utils.escapeHTML(item.system.description ?? "")}</small></span></label>`).join("");
    const selected = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.LearnPerformances"),
      content: `<form class="la-performance-choice-form"><p>${game.i18n.format("LA.SelectPerformancesHint", { count: required })}</p><p class="la-performance-choice-count">${game.i18n.format("LA.SelectedPerformancesCount", { selected: 0, count: required })}</p><fieldset>${rows}</fieldset></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => {
          const checked = html.find('input[name="performance"]:checked').map((_, input) => Number(input.value)).get();
          if (checked.length !== required) {
            ui.notifications.warn(game.i18n.format("LA.SelectPerformancesError", { required, selected: checked.length }));
            resolve(null);
          } else resolve(checked.map(index => choices[index]).filter(Boolean));
        } },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null),
      render: html => html.find('input[name="performance"]').on("change", event => {
        if (html.find('input[name="performance"]:checked').length > required) event.currentTarget.checked = false;
        const current = html.find('input[name="performance"]:checked').length;
        html.find(".la-performance-choice-count").text(game.i18n.format("LA.SelectedPerformancesCount", { selected: current, count: required }));
      })
    }).render(true));
    return selected;
  }

  async _learnOpenPerformanceSlots() {
    const copies = this.actor.items.filter(item => item.type === "technick" && item.name === "Bardic Study").length;
    const slots = copies * Math.max(0, 1 + safeNumber(this.actor.system.attributes.int?.modifier));
    const missing = Math.max(0, slots - this.actor.items.filter(item => item.type === "performance").length);
    if (!missing) return [];
    const selections = await this._choosePerformances(missing);
    if (!selections) return null;
    return this.actor.createEmbeddedDocuments("Item", selections.map(item => item.toObject()));
  }

  async _configureTechnick(itemData, { classItem = null, projectedAttributes = {}, projectedTrainedSkills = [], priorSelections = [], weaponGroups = null } = {}) {
    const choiceType = itemData.system.choice?.type;
    if (!choiceType) return itemData;
    let choices = [];
    if (choiceType === "trainedSkill") {
      choices = Object.keys(SKILLS).filter(key => (this.actor.system.skills[key]?.trained || projectedTrainedSkills.includes(key)) && !this.actor.items.some(item => item.type === "technick" && item.system.selectedSkill === key) && !priorSelections.some(item => item.system.choice?.type === "trainedSkill" && item.system.selectedSkill === key));
    } else if (choiceType === "classSkillTraining") {
      const classSkills = new Set([...this.actor.items.filter(item => ["class", "advanced-class"].includes(item.type)).flatMap(item => item.system.classSkills ?? []), ...(classItem?.system.classSkills ?? []), ...WEAPON_SKILLS]);
      choices = [...classSkills].filter(key => SKILLS[key] && !this.actor.system.skills[key]?.trained && !projectedTrainedSkills.includes(key) && !priorSelections.some(item => item.system.selectedSkill === key && item.system.choice?.type === "classSkillTraining"));
    } else if (choiceType === "weaponGroup") {
      choices = (weaponGroups ?? itemData.system.choice.options ?? WEAPON_GROUPS).filter(group => !this.actor.items.some(item => item.type === "technick" && item.system.selectedWeaponGroup === group) && !priorSelections.some(item => item.system.selectedWeaponGroup === group));
    }
    if (["trainedSkill", "classSkillTraining", "weaponGroup"].includes(choiceType)) {
      if (!choices.length) {
        ui.notifications.error(game.i18n.localize("LA.NoTechnickChoices"));
        return null;
      }
      const options = choices.map((key, index) => `<option value="${index}">${game.i18n.localize(SKILL_LABELS[key] ?? `LA.WeaponGroup.${key}`)}</option>`).join("");
      const chosen = await new Promise(resolve => new Dialog({
        title: game.i18n.localize("LA.TechnickChoice"),
        content: `<form><label>${game.i18n.localize(choiceType === "weaponGroup" ? "LA.WeaponGroupChoice" : "LA.SkillChoice")}<select name="choice">${options}</select></label></form>`,
        buttons: {
          choose: { label: game.i18n.localize("LA.Choose"), callback: html => resolve(choices[Number(html.find("[name=choice]").val())] ?? null) },
          cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
        },
        default: "choose", close: () => resolve(null)
      }).render(true));
      if (!chosen) return null;
      if (choiceType === "weaponGroup") {
        itemData.system.selectedWeaponGroup = chosen;
        itemData.system.selectedWeaponGroupLabel = game.i18n.localize(`LA.WeaponGroup.${chosen}`);
      } else {
        itemData.system.selectedSkill = chosen;
        itemData.system.selectedSkillLabel = game.i18n.localize(SKILL_LABELS[chosen] ?? chosen);
      }
      if (choiceType === "trainedSkill") itemData.system.effects.skillBonuses = { [chosen]: 5 };
    } else if (choiceType === "languages") {
      const intelligence = safeNumber(projectedAttributes.int, this.actor.system.attributes.int.score);
      const count = Math.max(1, 1 + Math.floor((intelligence - 10) / 2));
      const names = await new Promise(resolve => new Dialog({
        title: game.i18n.localize("LA.TechnickChoice"),
        content: `<form><p>${game.i18n.format("LA.EnterLanguagesHint", { count })}</p><input name="languages" type="text"></form>`,
        buttons: {
          choose: { label: game.i18n.localize("LA.Choose"), callback: html => resolve(String(html.find("[name=languages]").val() ?? "").split(",").map(value => value.trim()).filter(Boolean)) },
          cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
        },
        default: "choose", close: () => resolve(null)
      }).render(true));
      if (!names || names.length !== count) {
        ui.notifications.warn(game.i18n.format("LA.EnterLanguagesError", { count }));
        return null;
      }
      itemData.system.selectedLanguages = names;
    }
    return itemData;
  }

  _meetsTechnickPrerequisites(item, { characterLevel, projectedAttributes = {}, projectedTrainedSkills = [], priorSelections = [], classItem = null, allowedWeaponGroups = WEAPON_GROUPS } = {}) {
    const requirements = item.system.prerequisites ?? {};
    const score = key => safeNumber(projectedAttributes[key], this.actor.system.attributes[key]?.score);
    if (safeNumber(characterLevel, this.actor.system.details.level) < safeNumber(requirements.characterLevel)) return false;
    for (const [key, minimum] of Object.entries(requirements.attributes ?? {})) if (score(key) < safeNumber(minimum)) return false;
    const trained = key => this.actor.system.skills[key]?.trained || projectedTrainedSkills.includes(key);
    if ((requirements.skills ?? []).some(key => !trained(key))) return false;
    if ((requirements.anySkills ?? []).length && !requirements.anySkills.some(trained)) return false;
    const normalize = name => String(name ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    const owned = new Set([...this.actor.items.filter(entry => entry.type === "technick").map(entry => normalize(entry.name)), ...priorSelections.map(entry => normalize(entry.name))]);
    if (requirements.technicks?.some(name => !owned.has(normalize(name)))) return false;
    if (!item.system.repeatable && owned.has(normalize(item.name))) return false;
    if (item.system.choice?.type === "classSkillTraining") {
      const classSkills = new Set([...this.actor.items.filter(entry => ["class", "advanced-class"].includes(entry.type)).flatMap(entry => entry.system.classSkills ?? []), ...(classItem?.system.classSkills ?? []), ...WEAPON_SKILLS]);
      if (![...classSkills].some(key => SKILLS[key] && !trained(key) && !priorSelections.some(entry => entry.system.choice?.type === "classSkillTraining" && entry.system.selectedSkill === key))) return false;
    }
    if (item.system.choice?.type === "weaponGroup") {
      const choices = allowedWeaponGroups ?? item.system.choice.options ?? WEAPON_GROUPS;
      if (!choices.some(group => !this.actor.items.some(entry => entry.type === "technick" && entry.system.selectedWeaponGroup === group) && !priorSelections.some(entry => entry.system.selectedWeaponGroup === group))) return false;
    }
    if (item.system.choice?.type === "trainedSkill" && !Object.keys(SKILLS).some(key => trained(key) && !this.actor.items.some(entry => entry.type === "technick" && entry.system.selectedSkill === key) && !priorSelections.some(entry => entry.system.choice?.type === "trainedSkill" && entry.system.selectedSkill === key))) return false;
    return true;
  }

  _technickPrerequisiteText(item) {
    return formatTechnickPrerequisites(item.system);
  }

  async _grantTechnick(itemData) {
    let performances = [];
    let spells = [];
    if (itemData.name === "Bardic Study") {
      const slots = Math.max(0, safeNumber(itemData.system.effects?.performanceSlotsPerCopy) * (1 + safeNumber(this.actor.system.attributes.int?.modifier)));
      performances = await this._choosePerformances(slots);
      if (!performances) return null;
    }
    if (itemData.name === "Arcane Study") {
      const slots = Math.max(1, safeNumber(itemData.system.effects?.spellSlotsPerCopy, 1) * (1 + safeNumber(this.actor.system.attributes.int?.modifier)));
      spells = await this._chooseSpells(slots);
      if (!spells) return null;
    }
    const oldMaxHP = safeNumber(this.actor.system.resources.hp.max);
    const oldMaxMP = safeNumber(this.actor.system.resources.mp.max);
    const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    if (performances.length) await this.actor.createEmbeddedDocuments("Item", performances.map(item => item.toObject()));
    if (spells.length) await this.actor.createEmbeddedDocuments("Item", spells.map(item => item.toObject()));
    if (itemData.system.selectedSkill && itemData.system.choice?.type === "classSkillTraining") {
      await this.actor.update({ [`system.skills.${itemData.system.selectedSkill}.trained`]: true });
    }
    if (itemData.system.selectedLanguages?.length) {
      const current = String(this.actor.system.details.languages ?? "").split(",").map(name => name.trim()).filter(Boolean);
      await this.actor.update({ "system.details.languages": [...new Set([...current, ...itemData.system.selectedLanguages])].join(", ") });
    }
    await this._recalculateClassResources(oldMaxHP, oldMaxMP);
    return created;
  }

  _meetsSpellLearningPrerequisites(spell) {
    const requirements = spell.system.prerequisites ?? {};
    const level = safeNumber(this.actor.system.details.level, 1);
    if (level < safeNumber(requirements.characterLevel)) return false;
    for (const [attribute, minimum] of Object.entries(requirements.attributes ?? {})) {
      if (safeNumber(this.actor.system.attributes[attribute]?.score) < safeNumber(minimum)) return false;
    }
    for (const skill of requirements.skills ?? []) if (!this.actor.system.skills[skill]?.trained) return false;
    const known = new Set(this.actor.items.filter(item => ["technick", "spell"].includes(item.type)).map(item => item.name.toLowerCase()));
    for (const technick of requirements.technicks ?? []) if (!known.has(String(technick).toLowerCase())) return false;
    if (requirements.classes?.length) {
      const classNames = new Set(this.actor.items.filter(item => ["class", "advanced-class"].includes(item.type)).map(item => item.name.toLowerCase()));
      if (!requirements.classes.some(name => classNames.has(String(name).toLowerCase()))) return false;
    }
    if (requirements.schools?.length && !requirements.schools.some(school => String(school).toLowerCase() === String(spell.system.school ?? "").toLowerCase())) return false;
    return true;
  }

  async _chooseSpells(count) {
    const required = Math.max(1, Math.floor(safeNumber(count, 1)));
    const packNames = ["magick-black", "magick-blue", "magick-green", "magick-red", "magick-white"];
    const packs = packNames.map(name => game.packs.get(`last-arc-analogue.${name}`)).filter(Boolean);
    if (!packs.length) {
      ui.notifications.error(game.i18n.localize("LA.MagickPacksUnavailable"));
      return null;
    }
    const documents = (await Promise.all(packs.map(pack => pack.getDocuments()))).flat();
    const known = new Set(this.actor.items.filter(item => item.type === "spell").map(item => item.name.toLowerCase()));
    const choices = documents.filter(item => !known.has(item.name.toLowerCase()) && this._meetsSpellLearningPrerequisites(item));
    if (choices.length < required) {
      ui.notifications.error(game.i18n.format("LA.NotEnoughLearnableSpells", { required, available: choices.length }));
      return null;
    }
    const rows = choices.map((item, index) => {
      const description = foundry.utils.escapeHTML(item.system.description ?? "");
      const detail = `${foundry.utils.escapeHTML(item.system.school ?? "")} · ${safeNumber(item.system.mpCost)} MP`;
      const requirements = item.system.prerequisites?.summary ?? "";
      return `<label class="la-choice-row"><input type="checkbox" name="spell" value="${index}"><span><strong>${foundry.utils.escapeHTML(item.name)}</strong><small>${detail}${requirements ? ` · ${game.i18n.localize("LA.Requirements")}: ${foundry.utils.escapeHTML(requirements)}` : ""}</small><small>${description}</small></span></label>`;
    }).join("");
    const selected = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.LearnMagicks"),
      content: `<form class="la-spell-choice-form"><p>${game.i18n.format("LA.SelectMagicksHint", { count: required })}</p><p class="la-spell-choice-count">${game.i18n.format("LA.SelectedMagicksCount", { selected: 0, count: required })}</p><fieldset>${rows}</fieldset></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => {
          const checked = html.find('input[name="spell"]:checked').map((_, input) => Number(input.value)).get();
          if (checked.length !== required) {
            ui.notifications.warn(game.i18n.format("LA.SelectMagicksError", { required, selected: checked.length }));
            resolve(null);
          } else resolve(checked.map(index => choices[index]).filter(Boolean));
        } },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null),
      render: html => html.find('input[name="spell"]').on("change", event => {
        if (html.find('input[name="spell"]:checked').length > required) event.currentTarget.checked = false;
        const current = html.find('input[name="spell"]:checked').length;
        html.find(".la-spell-choice-count").text(game.i18n.format("LA.SelectedMagicksCount", { selected: current, count: required }));
      })
    }).render(true));
    return selected;
  }

  async _startingTechnickData(names = [], classItem, projectedTrainedSkills = []) {
    const pack = game.packs.get("last-arc-analogue.technicks");
    if (!pack) return [];
    const documents = await pack.getDocuments();
    const normalize = name => String(name ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    const granted = [];
    for (const sourceName of names) {
      const group = String(sourceName).match(/^Weapon Proficiency \((.+)\)$/i)?.[1]?.toLowerCase();
      const lookupName = group ? "Weapon Proficiency" : sourceName;
      const document = documents.find(item => normalize(item.name) === normalize(lookupName));
      if (!document) continue;
      const data = document.toObject();
      if (group) {
        data.system.selectedWeaponGroup = group;
        data.system.selectedWeaponGroupLabel = game.i18n.localize(`LA.WeaponGroup.${group}`);
      }
      if (!this._meetsTechnickPrerequisites(data, { characterLevel: 1, projectedTrainedSkills, priorSelections: granted, classItem })) continue;
      granted.push(data);
    }
    return granted;
  }

  async _onDropItem(event, data) {
    const dropped = await Item.implementation.fromDropData(data);
    if (dropped.type === "feature" && dropped.system.category === "High Arcana") {
      ui.notifications.warn(game.i18n.localize("LA.HighArcanaLevelOnly"));
      return false;
    }
    if (dropped.type === "technick") return this._applyTechnickDrop(dropped.toObject());
    if (dropped.type === "performance") return this._applyPerformanceDrop(dropped.toObject());
    if (!["race", "class", "advanced-class"].includes(dropped.type)) return super._onDropItem(event, data);
    const itemData = dropped.toObject();
    if (dropped.type === "race") return this._applyRaceDrop(itemData);
    return this._applyClassDrop(itemData);
  }

  async _applyTechnickDrop(itemData) {
    const classItem = this.actor.items.find(item => ["class", "advanced-class"].includes(item.type));
    if (!this._meetsTechnickPrerequisites(itemData, { characterLevel: this.actor.system.details.level, classItem })) {
      ui.notifications.warn(game.i18n.format("LA.TechnickPrerequisiteFailed", { requirements: foundry.utils.escapeHTML(this._technickPrerequisiteText(itemData) || game.i18n.localize("LA.NoPrerequisites")) }));
      return false;
    }
    const configured = await this._configureTechnick(itemData, { classItem });
    if (!configured) return false;
    return this._grantTechnick(configured);
  }

  async _applyPerformanceDrop(itemData) {
    const capacity = this.actor.items.filter(item => item.type === "technick" && item.name === "Bardic Study").length
      * Math.max(0, 1 + safeNumber(this.actor.system.attributes.int?.modifier));
    const learned = this.actor.items.filter(item => item.type === "performance");
    if (!capacity || learned.length >= capacity) {
      ui.notifications.warn(game.i18n.localize("LA.NoPerformanceSlots"));
      return false;
    }
    if (learned.some(item => item.name === itemData.name)) {
      ui.notifications.warn(game.i18n.localize("LA.PerformanceAlreadyKnown"));
      return false;
    }
    const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    return created;
  }

  async _applyRaceDrop(itemData) {
    const previousIntelligenceModifier = safeNumber(this.actor.system.attributes.int?.modifier);
    const currentRace = this.actor.items.find(item => item.type === "race");
    const oldRaceFeatures = this.actor.items.filter(item => item.type === "feature" && item.flags?.["last-arc-analogue"]?.racialFeature);
    const prior = this.actor.system.details.raceAdjustments ?? {};
    if (currentRace && !(await Dialog.confirm({ title: game.i18n.localize("LA.ReplaceRace"), content: game.i18n.localize("LA.ReplaceRacePrompt") }))) return false;
    const update = {};
    const oldHP = safeNumber(this.actor.system.resources.hp.max);
    const oldMP = safeNumber(this.actor.system.resources.mp.max);
    const choices = await this._chooseItemOption(itemData, "race");
    if (choices === null) return false;
    const baseAdjustments = itemData.system.attributeAdjustments ?? {};
    const choiceAdjustments = choices.effects?.attributeAdjustments ?? {};
    const appliedAdjustments = {};
    for (const key of ATTRIBUTES) {
      const oldAdjustment = safeNumber(prior[key]);
      const newAdjustment = safeNumber(baseAdjustments[key]) + safeNumber(choiceAdjustments[key]);
      appliedAdjustments[key] = newAdjustment;
      const score = safeNumber(this.actor.system.attributes[key].score, 10) - oldAdjustment + newAdjustment;
      update[`system.attributes.${key}.score`] = score;
    }
    const racialEffects = foundry.utils.mergeObject(foundry.utils.deepClone(itemData.system.effects ?? {}), choices.effects ?? {}, { inplace: false });
    update["system.details.race"] = itemData.name;
    update["system.details.raceSize"] = itemData.system.size ?? "";
    update["system.details.raceAdjustments"] = appliedAdjustments;
    update["system.details.racialEffects"] = racialEffects;
    update["system.details.attributeCaps"] = itemData.system.attributeCaps ?? {};
    update["system.combat.speed"] = safeNumber(itemData.system.speed, this.actor.system.combat.speed);
    update["system.combat.specialSenses"] = choices.effects.specialSenses ?? itemData.system.specialSenses ?? "";
    update["system.details.languages"] = itemData.system.languages ?? "";
    itemData.system.selectedChoices = choices.selectedChoices;
    itemData.system.selectedEffects = choices.effects;
    if (currentRace) await currentRace.delete();
    if (oldRaceFeatures.length) await this.actor.deleteEmbeddedDocuments("Item", oldRaceFeatures.map(item => item.id));
    await this.actor.update(update);
    const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    const features = (itemData.system.traits ?? []).map((trait, index) => {
      const [rawName, ...detail] = String(trait).split(":");
      const hasTitle = detail.length > 0;
      return {
        name: hasTitle ? rawName.trim() : `${itemData.name}: ${rawName.trim()}`,
        type: "feature",
        img: itemData.img || "icons/svg/item-bag.svg",
        system: { category: "Racial Trait", sourceRace: itemData.name, description: hasTitle ? detail.join(":").trim() : rawName.trim(), sort: index },
        flags: { "last-arc-analogue": { racialFeature: true, raceItemId: created.id } }
      };
    });
    if (features.length) await this.actor.createEmbeddedDocuments("Item", features);
    await this._recalculateClassResources(oldHP, oldMP);
    if (safeNumber(this.actor.system.attributes.int?.modifier) > previousIntelligenceModifier) await this._learnOpenPerformanceSlots();
    return created;
  }

  async _applyClassDrop(itemData, { levelUp = false } = {}) {
    if (itemData.system.needsRuleData) {
      ui.notifications.warn(`${itemData.name}: add its progression, defence, HP/MP, and skills to the compendium item before applying it.`);
      return false;
    }
    // Advanced-class compendium entries are canonical. Resolve them before any
    // prerequisite or talent-tree choice so stale world copies cannot leak a
    // base-class tree into the advanced-class selection flow.
    if (itemData.type === "advanced-class") {
      const pack = game.packs.get("last-arc-analogue.advanced-classes");
      const canonical = pack && (await pack.getDocuments()).find(entry => entry.name === itemData.name);
      if (canonical) {
        itemData.system = { ...itemData.system, ...foundry.utils.deepClone(canonical.system) };
        itemData.name = canonical.name;
        itemData.img = canonical.img;
      }
      // Tree names may be shared with a base class (for example, Mage and
      // Archmage both list Arcanist). Keep only trees with talents authored
      // for this advanced class, or the selector will offer Mage talents.
      const talentPack = game.packs.get("last-arc-analogue.talents");
      if (talentPack) {
        const talents = await talentPack.getDocuments();
        const classTrees = new Set(talents.filter(talent => talent.system.className === itemData.name).map(talent => talent.system.tree));
        itemData.system.talentTrees = (itemData.system.talentTrees ?? []).filter(tree => classTrees.has(tree));
      }
    }
    if (itemData.type === "advanced-class") {
      const effectiveLevel = levelUp ? safeNumber(this.actor.system.details.level, 1) + 1 : safeNumber(this.actor.system.details.level, 1);
      if (!this._meetsAdvancedClassPrerequisites(itemData, effectiveLevel)) {
        ui.notifications.warn(game.i18n.format("LA.AdvancedClassPrerequisiteFailed", { name: foundry.utils.escapeHTML(itemData.name), requirements: foundry.utils.escapeHTML(itemData.system.prerequisiteSummary ?? "See the class entry for its requirements.") }));
        return false;
      }
    }
    const choices = levelUp
      ? { selectedChoices: itemData.system.selectedChoices ?? [], effects: itemData.system.selectedEffects ?? {} }
      : await this._chooseItemOption(itemData, itemData.type);
    if (choices === null) return false;
    const selectedSubclass = choices.selectedChoices?.[0]?.value ?? itemData.system.selectedSubclass ?? "";
    itemData.system.talentTrees ??= CLASS_TALENT_TREES[itemData.name] ?? [];
    const existing = this.actor.items.find(item => item.type === itemData.type && item.name === itemData.name && (item.system.selectedSubclass ?? "") === selectedSubclass);
    const oldMaxHP = safeNumber(this.actor.system.resources.hp.max);
    const oldMaxMP = safeNumber(this.actor.system.resources.mp.max);
    if (existing) {
      const nextLevel = safeNumber(existing.system.classLevel, 1) + 1;
      const classTrees = existing.type === "advanced-class"
        ? itemData.system.talentTrees ?? []
        : existing.system.talentTrees?.length ? existing.system.talentTrees : itemData.system.talentTrees?.length ? itemData.system.talentTrees : CLASS_TALENT_TREES[existing.name] ?? [];
      const talentLevels = existing.type === "advanced-class" ? itemData.system.talentLevels ?? [] : existing.system.talentLevels?.length ? existing.system.talentLevels : itemData.system.talentLevels ?? [];
      const priorTrees = existing.system.selectedTalentTrees ?? [];
      const validPriorTrees = priorTrees.filter(tree => classTrees.includes(tree));
      const legacyTreeMismatch = existing.type === "advanced-class" && (priorTrees.length !== validPriorTrees.length || !priorTrees.length);
      const obsoleteTalents = existing.type === "advanced-class" ? this.actor.items.filter(entry => entry.type === "talent"
        && entry.flags?.["last-arc-analogue"]?.classItemId === existing.id
        && !classTrees.includes(entry.system.sourceTree ?? entry.system.tree)) : [];
      let talentSelection = null;
      if (talentLevels.includes(nextLevel) || legacyTreeMismatch) talentSelection = await this._chooseClassTalent({ name: existing.name, system: { ...existing.system, talentTrees: classTrees } });
      if ((talentLevels.includes(nextLevel) || legacyTreeMismatch) && classTrees.length && !talentSelection) return false;
      const highArcanaSelections = [];
      if (existing.type === "advanced-class" && existing.name === "Archmage") {
        const earnedLevels = new Set(this.actor.items.filter(entry => entry.type === "feature" && entry.flags?.["last-arc-analogue"]?.archmageHighArcana)
          .map(entry => safeNumber(entry.flags["last-arc-analogue"].archmageHighArcana.classLevel)));
        for (let classLevel = 6; classLevel <= Math.min(10, nextLevel); classLevel++) {
          if (earnedLevels.has(classLevel)) continue;
          const choice = await this._chooseHighArcana([...highArcanaSelections.map(entry => entry.item.name)]);
          if (!choice) return false;
          highArcanaSelections.push({ item: choice, classLevel });
        }
      }
      if (obsoleteTalents.length) await this.actor.deleteEmbeddedDocuments("Item", obsoleteTalents.map(entry => entry.id));
      const selectedTrees = [...new Set([...validPriorTrees, ...(talentSelection ? [talentSelection.tree] : [])])];
      await existing.update({
        "system.classLevel": nextLevel,
        "system.talentTrees": classTrees,
        "system.talentLevels": talentLevels,
        "system.classFeatures": existing.type === "advanced-class" ? itemData.system.classFeatures ?? [] : existing.system.classFeatures?.length ? existing.system.classFeatures : itemData.system.classFeatures ?? [],
        "system.levelProgression": existing.type === "advanced-class" ? itemData.system.levelProgression ?? [] : existing.system.levelProgression ?? itemData.system.levelProgression ?? [],
        "system.featureReference": existing.type === "advanced-class" ? itemData.system.featureReference ?? "" : existing.system.featureReference ?? itemData.system.featureReference ?? "",
        "system.hpPerLevel": existing.type === "advanced-class" ? safeNumber(itemData.system.hpPerLevel) : safeNumber(existing.system.hpPerLevel) || safeNumber(itemData.system.hpPerLevel),
        "system.mpPerLevel": existing.type === "advanced-class" ? safeNumber(itemData.system.mpPerLevel) : safeNumber(existing.system.mpPerLevel) || safeNumber(itemData.system.mpPerLevel),
        "system.defenceBonuses": existing.type === "advanced-class" ? itemData.system.defenceBonuses ?? {} : Object.keys(existing.system.defenceBonuses ?? {}).length ? existing.system.defenceBonuses : itemData.system.defenceBonuses ?? {},
        "system.selectedTalentTrees": selectedTrees
      });
      if (talentSelection) await this._createTalentItem(talentSelection.talent, existing);
      for (const selection of highArcanaSelections) await this._createHighArcanaItem(selection.item, existing, selection.classLevel);
      await this._grantClassFeatures(existing, nextLevel);
      await this._recalculateClassResources(oldMaxHP, oldMaxMP);
      return existing;
    }
    itemData.system.classLevel = Math.max(1, safeNumber(itemData.system.classLevel, 1));
    itemData.system.selectedSubclass = selectedSubclass ?? "";
    itemData.system.selectedChoices = choices.selectedChoices;
    itemData.system.selectedEffects = choices.effects;
    const classes = this.actor.items.filter(item => ["class", "advanced-class"].includes(item.type));
    itemData.system.isStartingClass = classes.length === 0;
    let trainedSkills = [];
    if (!classes.length && itemData.system.trainedSkillCount && itemData.system.classSkills?.length) {
      const count = Math.max(0, safeNumber(itemData.system.trainedSkillCount) + this.actor.system.attributes.int.modifier + safeNumber(this.actor.system.details.racialEffects?.bonusTrainedSkills));
      trainedSkills = await this._chooseClassSkills(itemData, count);
      if (trainedSkills === null) return false;
      itemData.system.trainedSkills = trainedSkills;
    }
    const talentSelection = itemData.system.talentTrees.length ? await this._chooseClassTalent(itemData) : null;
    if (itemData.system.talentTrees.length && !talentSelection) return false;
    if (talentSelection) itemData.system.selectedTalentTrees = [talentSelection.tree];
    const awardedTechnicks = [];
    if (!levelUp) {
      const newCharacterLevel = safeNumber(this.actor.system.details.level, 1) + (classes.length ? 1 : 0);
      const startingTechnicks = classes.length === 0
        ? await this._startingTechnickData(itemData.system.startingTechnicks ?? [], itemData, trainedSkills)
        : [];
      awardedTechnicks.push(...startingTechnicks);
      if (classes.length > 0 && itemData.type === "class" && itemData.system.startingTechnicks?.length) {
        const startingChoice = await this._chooseTechnick({ bonusTechnicks: itemData.system.startingTechnicks, classItem: itemData, characterLevel: newCharacterLevel, projectedTrainedSkills: trainedSkills, priorSelections: awardedTechnicks });
        if (!startingChoice) return false;
        awardedTechnicks.push(startingChoice);
      }
      if (newCharacterLevel === 1 || newCharacterLevel % 2 === 0) {
        const generalChoice = await this._chooseTechnick({ classItem: itemData, characterLevel: newCharacterLevel, projectedTrainedSkills: trainedSkills, priorSelections: awardedTechnicks });
        if (!generalChoice) return false;
        awardedTechnicks.push(generalChoice);
      }
    }
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    if (trainedSkills.length) await this.actor.update(Object.fromEntries(trainedSkills.map(key => [`system.skills.${key}.trained`, true])));
    if (talentSelection) await this._createTalentItem(talentSelection.talent, created[0]);
    await this._grantClassFeatures(created[0], safeNumber(itemData.system.classLevel, 1));
    await this._recalculateClassResources(oldMaxHP, oldMaxMP);
    for (const technick of awardedTechnicks) await this._grantTechnick(technick);
    return created;
  }

  async _chooseClassTalent(classItem) {
    const pack = game.packs.get("last-arc-analogue.talents");
    if (!pack) {
      ui.notifications.error(game.i18n.localize("LA.TalentPackUnavailable"));
      return null;
    }
    const documents = await pack.getDocuments();
    const ownedNames = new Set(this.actor.items.filter(item => item.type === "talent" && !item.system.repeatable).map(item => item.name));
    const classTalents = item => classItem.type !== "advanced-class" || item.system.className === classItem.name;
    const allTrees = classItem.system.talentTrees?.length ? classItem.system.talentTrees : CLASS_TALENT_TREES[classItem.name] ?? [];
    const trees = allTrees.filter(tree => documents.some(item => classTalents(item) && item.system.tree === tree
      && (item.system.repeatable || !ownedNames.has(item.name))
      && this._meetsTalentPrerequisites(item)));
    if (!trees.length) {
      ui.notifications.warn(game.i18n.localize("LA.NoEligibleClassTalents"));
      return null;
    }
    const tree = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.SelectTalentTree"),
      content: `<form><p>${game.i18n.format("LA.SelectTalentTreeHint", { className: foundry.utils.escapeHTML(classItem.name) })}</p><select name="tree">${trees.map((name, index) => `<option value="${index}">${foundry.utils.escapeHTML(name)}</option>`).join("")}</select></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => resolve(trees[Number(html.find("[name=tree]").val())] ?? null) },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null)
    }).render(true));
    if (!tree) return null;
    const talents = documents.filter(item => classTalents(item) && item.system.tree === tree
      && (item.system.repeatable || !ownedNames.has(item.name))
      && this._meetsTalentPrerequisites(item));
    if (!talents.length) {
      ui.notifications.error(game.i18n.format("LA.NoTalentsForTree", { tree: foundry.utils.escapeHTML(tree) }));
      return null;
    }
    const descriptions = talents.map(item => foundry.utils.escapeHTML(item.system.description ?? ""));
    const options = talents.map((item, index) => `<option value="${index}" data-description="${descriptions[index]}">${foundry.utils.escapeHTML(item.name)}</option>`).join("");
    const talent = await new Promise(resolve => new Dialog({
      title: game.i18n.format("LA.SelectTalent", { tree: foundry.utils.escapeHTML(tree) }),
      content: `<form class="la-talent-choice-form"><label>${game.i18n.localize("LA.Talent")}<select name="talent">${options}</select></label><p class="la-talent-preview">${descriptions[0]}</p><p class="la-hint">${game.i18n.localize("LA.TalentPrerequisiteHint")}</p></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => resolve(talents[Number(html.find("[name=talent]").val())]?.toObject() ?? null) },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null),
      render: html => html.find("[name=talent]").on("change", event => html.find(".la-talent-preview").text(event.currentTarget.selectedOptions[0]?.dataset.description ?? ""))
    }).render(true));
    return talent ? { tree, talent } : null;
  }

  async _chooseHighArcana(priorSelections = []) {
    const pack = game.packs.get("last-arc-analogue.high-arcana");
    if (!pack) {
      ui.notifications.error(game.i18n.localize("LA.HighArcanaPackUnavailable"));
      return null;
    }
    const learned = new Set([
      ...this.actor.items.filter(item => item.type === "feature" && item.system.category === "High Arcana").map(item => item.name),
      ...priorSelections
    ].map(name => String(name).toLowerCase()));
    const options = (await pack.getDocuments()).filter(item => !learned.has(item.name.toLowerCase()));
    if (!options.length) {
      ui.notifications.error(game.i18n.localize("LA.NoHighArcanaChoices"));
      return null;
    }
    const choices = options.map((item, index) => `<option value="${index}">${foundry.utils.escapeHTML(item.name)}</option>`).join("");
    const descriptions = options.map(item => foundry.utils.escapeHTML(item.system.description ?? ""));
    const selected = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.SelectHighArcana"),
      content: `<form class="la-talent-choice-form"><p>${game.i18n.localize("LA.SelectHighArcanaHint")}</p><label>${game.i18n.localize("LA.HighArcana")}<select name="highArcana">${choices}</select></label><p class="la-talent-preview">${descriptions[0]}</p></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => resolve(options[Number(html.find('[name="highArcana"]').val())] ?? null) },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null),
      render: html => html.find('[name="highArcana"]').on("change", event => html.find(".la-talent-preview").text(descriptions[Number(event.currentTarget.value)] ?? ""))
    }).render(true));
    return selected;
  }

  async _createHighArcanaItem(source, classItem, classLevel) {
    const data = source.toObject();
    delete data._id;
    delete data.folder;
    data.system.category = "High Arcana";
    data.system.sourceClass = classItem.name;
    data.flags ??= {};
    data.flags["last-arc-analogue"] ??= {};
    data.flags["last-arc-analogue"].archmageHighArcana = { classItemId: classItem.id, classLevel };
    return this.actor.createEmbeddedDocuments("Item", [data]);
  }

  _meetsTalentPrerequisites(item) {
    const raw = String(item.system.prerequisites ?? "").trim();
    if (!raw || /^(?:see the rulebook|see page)\b/i.test(raw) || /^none$/i.test(raw)) return true;
    const normalize = value => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    const known = new Set(this.actor.items.filter(entry => ["talent", "technick"].includes(entry.type)).flatMap(entry => [entry.name, ...(entry.system.selectedWeaponGroup ? [`Weapon Proficiency (${entry.system.selectedWeaponGroup})`] : []), ...(entry.system.selectedSkill ? [`Skill Focus (${entry.system.selectedSkill})`] : [])]).map(normalize));
    const trainedSkillNames = { "perform dance": "perform", "perform instrument": "perform", "perform oratory": "perform", "lore arcane": "lore-terrestrial", "lore mystic": "lore-mystic", "lore occult": "lore-occult", "lore terrestrial": "lore-terrestrial" };
    const parts = raw.replace(/\bTrained in\s+/gi, "trained:").split(/,|\band\b/i).map(value => value.trim()).filter(Boolean);
    return parts.every(part => {
      const trained = part.match(/^trained:\s*(.*)$/i);
      if (trained) return Boolean(this.actor.system.skills[trainedSkillNames[normalize(trained[1].replace(/[()]/g, ""))]]?.trained);
      return known.has(normalize(part));
    });
  }

  async _createTalentItem(itemData, classItem) {
    delete itemData._id;
    delete itemData.folder;
    itemData.system ??= {};
    itemData.system.sourceClass = classItem.name;
    itemData.system.sourceTree = itemData.system.tree;
    itemData.flags ??= {};
    itemData.flags["last-arc-analogue"] ??= {};
    itemData.flags["last-arc-analogue"].classItemId = classItem.id;
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  async _grantClassFeatures(classItem, classLevel) {
    const features = (classItem.system.classFeatures ?? []).filter(feature => safeNumber(feature.level, 1) <= classLevel);
    const owned = this.actor.items.filter(item => item.type === "feature" && item.flags?.["last-arc-analogue"]?.classItemId === classItem.id);
    const desired = new Map(features.map(feature => [`${feature.level}:${feature.name}`, feature]));
    const byKey = new Map();
    const staleIds = [];
    for (const item of owned) {
      const key = item.flags["last-arc-analogue"].featureKey;
      if (!desired.has(key) || byKey.has(key)) staleIds.push(item.id);
      else byKey.set(key, item);
    }
    if (staleIds.length) await this.actor.deleteEmbeddedDocuments("Item", staleIds);
    const rows = [];
    for (const [key, feature] of desired) {
      const existing = byKey.get(key);
      const description = feature.description ?? "";
      if (existing) {
        if (existing.name !== `${classItem.name}: ${feature.name}` || existing.system.description !== description) {
          await existing.update({ name: `${classItem.name}: ${feature.name}`, "system.category": "Class Feature", "system.sourceClass": classItem.name, "system.classLevel": feature.level, "system.description": description, "system.automation": feature.automation ?? {} });
        }
        continue;
      }
      rows.push({
        name: `${classItem.name}: ${feature.name}`,
        type: "feature",
        img: classItem.img || "icons/svg/item-bag.svg",
        system: { category: "Class Feature", sourceClass: classItem.name, classLevel: feature.level, description, automation: feature.automation ?? {} },
        flags: { "last-arc-analogue": { classItemId: classItem.id, featureKey: key, advancedClassFeature: true } }
      });
    }
    if (rows.length) await this.actor.createEmbeddedDocuments("Item", rows);
  }

  async _recalculateClassResources(oldMaxHP, oldMaxMP) {
    const classes = this.actor.items.filter(item => ["class", "advanced-class"].includes(item.type));
    const hpMax = classes.reduce((sum, item) => {
      const levels = Math.max(0, safeNumber(item.system.classLevel));
      if (!levels) return sum;
      const initial = item.system.isStartingClass ? safeNumber(item.system.hpAtFirstLevel) : 0;
      return sum + initial + Math.max(0, levels - (item.system.isStartingClass ? 1 : 0)) * Math.max(1, safeNumber(item.system.hpPerLevel) + this.actor.system.attributes.vit.modifier) + (item.system.isStartingClass ? this.actor.system.attributes.vit.modifier : 0);
    }, 0);
    const mpMax = classes.reduce((sum, item) => {
      const levels = Math.max(0, safeNumber(item.system.classLevel));
      if (!levels) return sum;
      const initial = item.system.isStartingClass ? safeNumber(item.system.mpAtFirstLevel) : 0;
      return sum + initial + Math.max(0, levels - (item.system.isStartingClass ? 1 : 0)) * Math.max(1, safeNumber(item.system.mpPerLevel) + this.actor.system.attributes.mnd.modifier) + (item.system.isStartingClass ? this.actor.system.attributes.mnd.modifier : 0);
    }, 0);
    const technickResources = this.actor.items.filter(item => item.type === "technick").reduce((totals, item) => {
      const resources = item.system.effects?.resources ?? {};
      totals.hp += safeNumber(resources.hpMaxFlat) + safeNumber(resources.hpMaxPerLevel) * safeNumber(this.actor.system.details.level, 1);
      totals.mp += safeNumber(resources.mpMaxFlat) + safeNumber(resources.mpMaxPerLevel) * safeNumber(this.actor.system.details.level, 1);
      return totals;
    }, { hp: 0, mp: 0 });
    const finalHPMax = hpMax + technickResources.hp;
    const finalMPMax = mpMax + technickResources.mp;
    if (!classes.length && !this.actor.items.some(item => item.type === "technick")) return;
    const hpGain = finalHPMax - oldMaxHP;
    const mpGain = finalMPMax - oldMaxMP;
    await this.actor.update({
      "system.resources.hp.max": finalHPMax,
      "system.resources.hp.value": Math.max(0, Math.min(finalHPMax, safeNumber(this.actor.system.resources.hp.value) + hpGain)),
      "system.resources.mp.max": finalMPMax,
      "system.resources.mp.value": Math.max(0, Math.min(finalMPMax, safeNumber(this.actor.system.resources.mp.value) + mpGain))
    });
  }

  async _chooseClassSkills(itemData, count) {
    const available = [...new Set([...(itemData.system.classSkills ?? []), ...WEAPON_SKILLS])].filter(key => SKILLS[key]);
    const required = Math.min(count, available.length);
    if (!required) return [];
    if (count > available.length) {
      ui.notifications.error(game.i18n.format("LA.NotEnoughClassSkills", { required: count, available: available.length }));
      return null;
    }
    const options = available.map(key => `<label class="la-skill-choice"><input type="checkbox" name="skills" value="${foundry.utils.escapeHTML(key)}"><span>${game.i18n.localize(SKILL_LABELS[key])}</span></label>`).join("");
    return new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.SelectTrainedSkills"),
      content: `<form class="la-skill-choice-form"><p>${game.i18n.format("LA.SelectTrainedSkillsHint", { count: required })}</p><p class="la-skill-choice-count">${game.i18n.format("LA.SelectedSkillsCount", { selected: 0, count: required })}</p><fieldset>${options}</fieldset></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => {
          const values = html.find("input[name=skills]:checked").map((_, input) => input.value).get();
          if (values.length !== required) {
            ui.notifications.warn(game.i18n.format("LA.SelectTrainedSkillsError", { required, selected: values.length }));
            resolve(null);
          } else resolve(values);
        } },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null),
      render: html => html.find("input[name=skills]").on("change", () => {
        const selected = html.find("input[name=skills]:checked").length;
        html.find(".la-skill-choice-count").text(game.i18n.format("LA.SelectedSkillsCount", { selected, count: required }));
      })
    }).render(true));
  }

  async _chooseItemOption(itemData, kind) {
    let groups = itemData.system.choiceGroups ?? [];
    if (typeof groups === "string") {
      try { groups = JSON.parse(groups); } catch { groups = []; }
    }
    if (!groups.length) return { selectedChoices: [], effects: {} };
    const selectedChoices = [];
    const effects = {};
    for (const group of groups) {
      const answer = await new Promise(resolve => {
        const options = (group.options ?? []).map((option, index) => `<option value="${index}">${foundry.utils.escapeHTML(option.name ?? option)}</option>`).join("");
        new Dialog({
          title: group.label ?? game.i18n.localize(kind === "race" ? "LA.ChooseTraitOption" : "LA.ChooseSubclass"),
          content: `<form><label>${foundry.utils.escapeHTML(group.label ?? "") }<select name="choice">${options}</select></label></form>`,
          buttons: {
            choose: { label: game.i18n.localize("LA.Choose"), callback: html => resolve(group.options[Number(html.find("[name=choice]").val())]) },
            cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
          },
          default: "choose", close: () => resolve(null)
        }).render(true);
      });
      if (!answer) return null;
      selectedChoices.push({ group: group.key ?? group.label, value: answer.name ?? answer });
      this._mergeEffects(effects, answer.effects ?? {});
    }
    return { selectedChoices, effects };
  }

  _mergeEffects(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        target[key] ??= {};
        this._mergeEffects(target[key], value);
      } else if (typeof value === "number") target[key] = safeNumber(target[key]) + value;
      else target[key] = value;
    }
  }

  async _onRoll(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const kind = target.dataset.roll;
    const key = target.dataset.key;
    const actor = this.actor;
    if (safeNumber(actor.system.combat.recoveryMinorActions) > 0) await actor.update({ "system.combat.recoveryMinorActions": 0 });
    if (actor.system.combat.dead || actor.system.combat.unconscious) return ui.notifications.warn(game.i18n.localize(actor.system.combat.dead ? "LA.Dead" : "LA.CannotActUnconscious"));
    let label = target.dataset.label || game.i18n.localize("LA.Roll");
    let bonus = safeNumber(target.dataset.bonus);
    if (kind === "skill") { label = game.i18n.localize(SKILL_LABELS[key] ?? label); bonus = actor.system.skills[key]?.total ?? bonus; }
    if (kind === "attribute") { label = game.i18n.localize(ATTRIBUTE_LABELS[key] ?? label); bonus = actor.system.attributes[key]?.modifier ?? bonus; }
    if (kind === "attack") label = game.i18n.localize("LA.AttackRoll");
    if (kind === "initiative") label = game.i18n.localize("LA.Initiative");
    const formula = kind === "initiative" ? (actor.system.combat.initiativeDie || "1d20") : `1d20 + (${bonus})`;
    const roll = await (new Roll(formula, actor.getRollData())).evaluate();
    const dcField = kind === "skill" ? target.closest(".skill-row")?.querySelector("[name='dc']") : null;
    const dc = dcField && dcField.value !== "" ? safeNumber(dcField.value) : null;
    const result = dc === null ? "" : `<p class="la-result ${roll.total >= dc ? "success" : "failure"}">${game.i18n.localize(roll.total >= dc ? "LA.Success" : "LA.Failure")} (CD ${dc})</p>`;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<strong>${foundry.utils.escapeHTML(label)}</strong> ${signed(bonus)}${result}` });
  }

  async _updateObject(event, formData) {
    const previousIntelligenceModifier = safeNumber(this.actor.system.attributes.int?.modifier);
    await super._updateObject(event, formData);
    const currentIntelligenceModifier = safeNumber(this.actor.system.attributes.int?.modifier);
    if (currentIntelligenceModifier > previousIntelligenceModifier) await this._learnOpenPerformanceSlots();
  }

  async _onActiveEffectDelete(event) {
    event.preventDefault();
    const id = event.currentTarget.closest("[data-effect-id]").dataset.effectId;
    if (this.actor.effects.has(id)) await this.actor.deleteEmbeddedDocuments("ActiveEffect", [id]);
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type || "other";
    const item = await Item.create({ name: game.i18n.localize(`LA.ItemType.${type}`), type }, { parent: this.actor });
    item.sheet.render(true);
  }
  _onItemEdit(event) { this.actor.items.get(event.currentTarget.closest(".item").dataset.itemId)?.sheet.render(true); }
  async _onItemDelete(event) {
    const row = event.currentTarget.closest(".item");
    const item = this.actor.items.get(row.dataset.itemId);
    if (item && await Dialog.confirm({ title: game.i18n.localize("LA.Delete"), content: game.i18n.localize("LA.ConfirmDelete") })) {
      const oldMaxHP = safeNumber(this.actor.system.resources.hp.max);
      const oldMaxMP = safeNumber(this.actor.system.resources.mp.max);
      await item.delete();
      if (item.type === "technick") await this._recalculateClassResources(oldMaxHP, oldMaxMP);
    }
  }
  async _onItemRoll(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.closest(".item").dataset.itemId);
    try { await item?.roll(); }
    catch (error) {
      console.error(`Last Arc | Failed to roll item ${item?.name ?? "unknown"}`, error);
      ui.notifications.error(game.i18n.localize("LA.ItemRollFailed"));
    }
  }
  async _onApplyDamage(event) {
    event.preventDefault();
    const amount = await new Promise(resolve => new Dialog({ title: game.i18n.localize("LA.ApplyDamage"), content: `<form><label>${game.i18n.localize("LA.Damage")}<input type="number" name="damage" min="0" value="0"></label><label>${game.i18n.localize("LA.DamageType")}<input name="damageType" value="unaspected"></label></form>`, buttons: { apply: { label: game.i18n.localize("LA.ApplyDamage"), callback: html => resolve({ amount: html.find("[name=damage]").val(), type: html.find("[name=damageType]").val() }) }, cancel: { label: "×", callback: () => resolve(null) } }, default: "apply", close: () => resolve(null) }).render(true));
    if (amount) await this.actor.applyDamage(amount.amount, { type: amount.type });
  }
  async _onRest(event) {
    event.preventDefault();
    const result = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.RestAndRecovery"),
      content: `<form><label>${game.i18n.localize("LA.HoursRested")}<input type="number" name="hours" min="1" max="24" value="8"></label><label class="checkbox"><input type="checkbox" name="comfortable"> ${game.i18n.localize("LA.RestComfortHint")}</label></form>`,
      buttons: { rest: { label: game.i18n.localize("LA.Rest"), callback: html => resolve({ hours: html.find('[name="hours"]').val(), comfortable: html.find('[name="comfortable"]').prop("checked") }) }, cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) } },
      default: "rest", close: () => resolve(null)
    }).render(true));
    if (result) await this.actor.rest(result.hours, result.comfortable);
  }
  async _onWakeCheck(event) {
    event.preventDefault();
    if (!await Dialog.confirm({ title: game.i18n.localize("LA.RegainConsciousness"), content: `<p>${game.i18n.localize("LA.RegainConsciousnessHint")}</p>` })) return;
    const roll = await (new Roll(`1d20 + (${safeNumber(this.actor.system.attributes.vit.modifier)})`, this.actor.getRollData())).evaluate();
    const natural = roll.dice[0]?.results?.[0]?.result;
    const success = roll.total >= 10;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: `${game.i18n.localize("LA.RegainConsciousness")} — DC 10` });
    if (success) {
      const gauge = safeNumber(this.actor.system.combat.breakGauge);
      const persistent = (this.actor.system.combat.injuries ?? []).filter(injury => injury.type === "injury").length;
      const hp = this.actor.system.resources.hp;
      await this.actor.update({ "system.combat.breakGauge": Math.max(persistent, gauge - 1), "system.resources.hp.value": Math.min(safeNumber(hp.max), safeNumber(this.actor.system.details.level, 1)), "system.combat.prone": true, "system.combat.persistentHpRecovery": false });
      return;
    }
    if (natural === 1 || roll.total <= 5) await this.actor.update({ "system.combat.dead": true });
    else await this.actor.update({ "system.combat.persistentHpRecovery": true });
  }
  async _onInjuryDelete(event) {
    event.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("LA.GMOnlyInjuryCare"));
    const id = event.currentTarget.closest("[data-injury-id]")?.dataset.injuryId;
    const injuries = (this.actor.system.combat.injuries ?? []).filter(injury => injury.id !== id);
    if (injuries.length === (this.actor.system.combat.injuries ?? []).length) return;
    if (await Dialog.confirm({ title: game.i18n.localize("LA.ResolveInjury"), content: `<p>${game.i18n.localize("LA.ResolveInjuryHint")}</p>` })) await this.actor.update({ "system.combat.injuries": injuries });
  }
  async _onResourceControl(event) {
    const el = event.currentTarget;
    const resource = el.dataset.resource;
    const delta = safeNumber(el.dataset.delta);
    const current = safeNumber(foundry.utils.getProperty(this.actor.system, `${resource}.value`));
    const max = safeNumber(foundry.utils.getProperty(this.actor.system, `${resource}.max`));
    await this.actor.update({ [`system.${resource}.value`]: Math.min(max || Number.MAX_SAFE_INTEGER, Math.max(0, current + delta)) });
  }
  async _onRollAttributes(event) {
    event.preventDefault();
    const values = [];
    const rolls = [];
    for (let i = 0; i < 3; i++) {
      const roll = await (new Roll("2d6")).evaluate();
      rolls.push(roll);
      values.push(6 + roll.total, 19 - roll.total);
    }
    for (let index = 0; index < rolls.length; index++) {
      await rolls[index].toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${game.i18n.localize("LA.AttributeGeneration")} — ${values[index * 2]} / ${values[index * 2 + 1]}`
      });
    }
    const choices = ATTRIBUTES.map(key => `<label class="la-attribute-assignment-choice"><span>${game.i18n.localize(ATTRIBUTE_LABELS[key])}</span><select name="attribute-${key}" required><option value="" selected disabled>—</option>${values.map((value, valueIndex) => `<option value="${valueIndex}">${valueIndex + 1}. ${value}</option>`).join("")}</select></label>`).join("");
    const assignment = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.AssignAttributes"),
      content: `<form class="la-attribute-assignment-form"><p>${game.i18n.localize("LA.AssignAttributesHint")}</p><fieldset>${choices}</fieldset></form>`,
      buttons: {
        choose: { label: game.i18n.localize("LA.Choose"), callback: html => {
          const selections = ATTRIBUTES.map(key => html.find(`[name="attribute-${key}"]`).val());
          const indices = selections.map(Number);
          if (selections.some(value => value === null || value === "") || new Set(indices).size !== ATTRIBUTES.length || indices.some(index => !Number.isInteger(index) || index < 0 || index >= values.length)) {
            ui.notifications.warn(game.i18n.localize("LA.AssignAttributesUnique"));
            resolve(null);
            return;
          }
          resolve(indices);
        } },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "choose", close: () => resolve(null),
      render: html => {
        const selects = html.find(".la-attribute-assignment-form select");
        const updateOptions = () => {
          const selected = new Set(selects.map((_, select) => select.value).get());
          selects.each(function() {
            const current = this.value;
            [...this.options].forEach(option => { option.disabled = selected.has(option.value) && option.value !== current; });
          });
        };
        selects.on("change", updateOptions);
        updateOptions();
      }
    }).render(true));
    if (!assignment) return;
    const update = {};
    ATTRIBUTES.forEach((key, index) => { update[`system.attributes.${key}.score`] = values[assignment[index]]; });
    await this.actor.update(update);
    const summary = ATTRIBUTES.map((key, index) => `<li>${foundry.utils.escapeHTML(game.i18n.localize(ATTRIBUTE_LABELS[key]))}: <strong>${values[assignment[index]]}</strong></li>`).join("");
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: `<p><strong>${game.i18n.localize("LA.AttributeAssignments")}</strong></p><ul>${summary}</ul>` });
  }
}

class LastArcNPCSheet extends LastArcActorSheet {}

// Use the actor's class-derived die in the combat tracker as well as on the sheet.
class LastArcCombatant extends Combatant {
  _getInitiativeFormula() {
    return this.actor?.system?.combat?.initiativeDie || super._getInitiativeFormula();
  }
}

class LastArcItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { classes: ["last-arc", "sheet", "item"], template: "systems/last-arc-analogue/templates/item-sheet.hbs", width: 540, height: 610 });
  }
  get template() { return "systems/last-arc-analogue/templates/item-sheet.hbs"; }
  getData(options) {
    const context = super.getData(options);
    context.system = foundry.utils.deepClone(this.item.system);
    context.system.classSkillsText = Array.isArray(context.system.classSkills) ? context.system.classSkills.join("\n") : "";
    context.system.traitsText = Array.isArray(context.system.traits) ? context.system.traits.join("\n") : "";
    context.system.choiceGroupsText = JSON.stringify(context.system.choiceGroups ?? [], null, 2);
    context.system.automationText = JSON.stringify(context.system.automation ?? {}, null, 2);
    context.raceTraits = (context.system.traits ?? []).map(trait => {
      const [name, ...detail] = String(trait).split(":");
      return { name: detail.length ? name.trim() : "", description: detail.length ? detail.join(":").trim() : name.trim() };
    });
    context.itemTypeLabel = `LA.ItemType.${this.item.type}`;
    context.isClass = ["class", "advanced-class"].includes(this.item.type);
    context.isRace = this.item.type === "race";
    context.isTechnick = this.item.type === "technick";
    context.isWeapon = this.item.type === "weapon";
    context.isArmor = this.item.type === "armor";
    context.isEquippable = this.item.type === "armor" || Boolean(context.system.equippable);
    context.weaponGroups = WEAPON_GROUPS.map(key => ({ key, label: `LA.WeaponGroup.${key}` }));
    context.weaponSkills = ["one-handed", "two-handed", "light-weapon", "ranged", "unarmed", "spellcraft"].map(key => ({ key, label: SKILL_LABELS[key] ?? "LA.Spellcraft" }));
    context.system.selectedSkillLabel ??= SKILL_LABELS[context.system.selectedSkill] ? game.i18n.localize(SKILL_LABELS[context.system.selectedSkill]) : context.system.selectedSkill;
    context.system.selectedWeaponGroupLabel ??= context.system.selectedWeaponGroup ? game.i18n.localize(`LA.WeaponGroup.${context.system.selectedWeaponGroup}`) : "";
    context.technickPrerequisiteText = formatTechnickPrerequisites(context.system);
    context.isTalent = this.item.type === "talent";
    context.isSpell = this.item.type === "spell";
    context.isPerformance = this.item.type === "performance";
    context.performanceTiers = (context.system.automation?.tiers ?? []).map(tier => ({ dc: tier.dc, summary: (tier.effects ?? []).map(describePerformanceEffect).join("; ") }));
    context.isNonRollable = ["race", "class", "advanced-class", "feature", "talent", "technick"].includes(this.item.type);
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".item-roll").on("click", async event => {
      event.preventDefault();
      try { await this.item.roll(); }
      catch (error) {
        console.error(`Last Arc | Failed to roll item ${this.item.name}`, error);
        ui.notifications.error(game.i18n.localize("LA.ItemRollFailed"));
      }
    });
  }
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    const itemSystem = data.system ?? {};
    const skillsText = itemSystem.classSkillsText ?? "";
    const traitsText = itemSystem.traitsText ?? "";
    const choicesText = itemSystem.choiceGroupsText ?? "[]";
    const automationText = itemSystem.automationText;
    delete itemSystem.classSkillsText;
    delete itemSystem.traitsText;
    delete itemSystem.choiceGroupsText;
    delete itemSystem.automationText;
    if (skillsText) itemSystem.classSkills = skillsText.split(/[,\n]/).map(key => key.trim()).filter(key => SKILLS[key]);
    itemSystem.traits = traitsText.split(/\n/).map(line => line.trim()).filter(Boolean);
    try { itemSystem.choiceGroups = JSON.parse(choicesText || "[]"); }
    catch { return ui.notifications.error(game.i18n.localize("LA.InvalidChoiceJSON")); }
    if (automationText !== undefined) {
      try { itemSystem.automation = JSON.parse(automationText || "{}"); }
      catch { return ui.notifications.error(game.i18n.localize("LA.InvalidSpellAutomationJSON")); }
    }
    return this.item.update(data);
  }
}
