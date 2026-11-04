import { rollSpell } from "./spells.mjs";

const ATTRIBUTES = ["str", "vit", "agi", "int", "mnd", "cha"];
const LEVEL_XP = [0, 0, 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000, 55000, 66000, 78000, 91000, 105000, 120000, 136000, 153000, 171000, 190000];
const WEAPON_GROUPS = ["axes", "bows", "bludgeons", "crossbows", "knives", "polearms", "swords"];
const SKILLS = {
  acrobatics: "agi", alchemy: "int", athletics: "str", deception: "cha", disable: "agi",
  "lore-terrestrial": "int", "lore-mystic": "int", "lore-occult": "int", medicine: "int", perception: "mnd",
  perform: "cha", persuasion: "cha", pilot: "agi", ride: "agi", smithing: "int", spellcraft: "mnd", stealth: "agi", survival: "mnd"
};
const ITEM_TYPES = ["race", "class", "advanced-class", "spell", "talent", "technick", "weapon", "armor", "equipment", "feature", "other"];
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
  acrobatics: "LA.Acrobatics", alchemy: "LA.Alchemy", athletics: "LA.Athletics", deception: "LA.Deception", disable: "LA.Disable",
  "lore-terrestrial": "LA.LoreTerrestrial", "lore-mystic": "LA.LoreMystic", "lore-occult": "LA.LoreOccult", medicine: "LA.Medicine", perception: "LA.Perception",
  perform: "LA.Perform", persuasion: "LA.Persuasion", pilot: "LA.Pilot", ride: "LA.Ride", smithing: "LA.Smithing", spellcraft: "LA.Spellcraft", stealth: "LA.Stealth", survival: "LA.Survival"
};
const SKILL_ICONS = {
  acrobatics: "fa-running", alchemy: "fa-flask", athletics: "fa-dumbbell", deception: "fa-mask", disable: "fa-lock",
  "lore-terrestrial": "fa-book-open", "lore-mystic": "fa-book-open", "lore-occult": "fa-book-open", medicine: "fa-medkit", perception: "fa-eye",
  perform: "fa-theater-masks", persuasion: "fa-comments", pilot: "fa-compass", ride: "fa-horse", smithing: "fa-hammer", spellcraft: "fa-magic", stealth: "fa-user-secret", survival: "fa-tree"
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

Hooks.once("init", () => {
  CONFIG.Actor.documentClass = LastArcActor;
  CONFIG.Item.documentClass = LastArcItem;
  CONFIG.Combatant.documentClass = LastArcCombatant;
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["resources.hp", "resources.mp"], value: ["details.level"] },
    npc: { bar: ["resources.hp", "resources.mp"], value: ["details.level"] }
  };
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
    system.combat.physicalDamageReduction ??= 0;
    system.combat.elementalDamageReduction ??= 0;
    for (const key of ATTRIBUTES) system.attributes[key] ??= { score: 10 };
    const classItems = this.items.filter(item => ["class", "advanced-class"].includes(item.type));
    const raceItem = this.items.find(item => item.type === "race");
    const technicks = this.items.filter(item => item.type === "technick");
    const technickEffects = technicks.map(item => item.system.effects ?? {});
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
    const activeClasses = classItems.filter(item => safeNumber(item.system.classLevel) > 0);
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
        classSkill: classItems.some(item => item.system.classSkills?.includes(key)) || raceItem?.system.classSkills?.includes(key) || false,
        total: halfLevel + (skill.trained ? 5 : 0) + safeNumber(skill.classBonus) + classItems.reduce((sum, item) => sum + safeNumber(item.system.skillBonuses?.[key]) + safeNumber(item.system.selectedEffects?.skillBonuses?.[key]), 0) + safeNumber(system.details.racialEffects?.skillBonuses?.[key]) + safeNumber(technickSkillBonuses[key]) + safeNumber(skill.misc) + system.attributes[attribute].modifier
      };
    }
    for (const defence of ["fort", "ref", "will"]) {
      const attribute = { fort: "vit", ref: "agi", will: "mnd" }[defence];
      const record = system.defences?.[defence] ?? {};
      const classBonus = Math.max(0, ...classItems.map(item => safeNumber(item.system.defenceBonuses?.[defence]) + safeNumber(item.system.selectedEffects?.defenceBonuses?.[defence])));
      system.defences ??= {};
      system.defences[defence] = {
        ...record,
        base: 10,
        attributeMod: system.attributes[attribute].modifier,
        classBonus,
        total: 10 + system.attributes[attribute].modifier + classBonus + safeNumber(system.details.racialEffects?.defenceBonuses?.[defence]) + technickDefences[defence] + (defence === "ref" && system.combat.emptyHands && !system.combat.flatFooted ? brawlerBonus : 0) + level + safeNumber(record.misc)
      };
    }
    const hp = system.resources?.hp ?? {};
    const mp = system.resources?.mp ?? {};
    system.resources.hp = { value: safeNumber(hp.value), max: safeNumber(hp.max) };
    system.resources.mp = { value: safeNumber(mp.value), max: safeNumber(mp.max) };
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
    system.combat.breakThresholdBonus = countTechnickEffect("breakThresholdBonus");
    system.combat.additionalCounterattacks = technicks.some(item => item.system.effects?.counterattacksPerTurnFromAgi) ? Math.max(0, system.attributes.agi.modifier) : 0;
    system.combat.rangedCriticalMultiplier = technicks.some(item => item.system.effects?.rangedCriticalMultiplier) ? 3 : 2;
    system.combat.weaponProficiencies = [...new Set(technicks.map(item => item.system.selectedWeaponGroup).filter(Boolean))];
    system.details.additionalLanguages = technicks.reduce((sum, item) => sum + (item.system.effects?.languages ? (item.system.selectedLanguages?.length ?? Math.max(1, 1 + system.attributes.int.modifier)) : 0), 0);
    system.details.additionalSpellSlots = technicks.reduce((sum, item) => sum + safeNumber(item.system.effects?.spellSlotsPerCopy) * Math.max(1, 1 + system.attributes.int.modifier), 0);
    system.details.additionalPerformanceSlots = technicks.reduce((sum, item) => sum + safeNumber(item.system.effects?.performanceSlotsPerCopy) * Math.max(1, 1 + system.attributes.int.modifier), 0);
    system.inventory ??= {};
    system.inventoryBulk = this.items.reduce((sum, item) => sum + safeNumber(item.system.quantity, 1) * safeNumber(item.system.bulk), 0);
    system.inventory.maxBulk = 5 + safeNumber(system.attributes.str.score);
    system.inventory.overBulk = 10 + safeNumber(system.attributes.str.score);
  }

  async applyDamage(amount, { type = "unaspected", bypassDR = false } = {}) {
    const damage = Math.max(0, Math.floor(safeNumber(amount)));
    const kind = String(type).toLowerCase();
    const physicalDR = ["physical", "blunt", "piercing", "slashing"].includes(kind) ? safeNumber(this.system.combat?.physicalDamageReduction) : 0;
    const elementalDR = ["fire", "cold", "electric"].includes(kind) ? safeNumber(this.system.combat?.elementalDamageReduction) : 0;
    const dr = bypassDR ? 0 : Math.max(0, safeNumber(this.system.combat?.damageReduction) + physicalDR + elementalDR);
    const applied = Math.max(0, damage - dr);
    const hp = this.system.resources.hp;
    await this.update({ "system.resources.hp.value": Math.max(0, hp.value - applied) });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<p><strong>${game.i18n.localize("LA.ApplyDamage")}:</strong> ${applied} (${foundry.utils.escapeHTML(type)}). ${game.i18n.localize("LA.Health")}: ${Math.max(0, hp.value - applied)}/${hp.max}.</p>` });
    return applied;
  }
}

class LastArcItem extends Item {
  async roll() {
    const actor = this.parent;
    if (this.type === "spell") return rollSpell(this);
    let formula = this.system.damage?.formula || this.system.roll?.formula;
    const title = this.name;
    let damageTitle = title;
    if (this.type === "weapon" && actor) {
      const weaponGroup = String(this.system.weaponGroup ?? "").toLowerCase();
      const proficiencyPenalty = weaponGroup && !actor.system.combat.weaponProficiencies?.includes(weaponGroup) ? -5 : 0;
      const bonus = safeNumber(this.system.attack?.bonus) + proficiencyPenalty;
      const attack = await (new Roll(`1d20 + (${bonus})`, actor.getRollData())).evaluate();
      await attack.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${game.i18n.localize("LA.AttackRoll")}: ${foundry.utils.escapeHTML(title)} (${signed(bonus)}${proficiencyPenalty ? `; ${game.i18n.localize("LA.UnproficientPenalty")}` : ""})` });
      const naturalTwenty = attack.dice.some(die => die.results?.some(result => result.result === 20));
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
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<h3>${foundry.utils.escapeHTML(title)}</h3><p>${foundry.utils.escapeHTML(this.system.description ?? "")}</p>` });
    return null;
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
    context.canLevelUp = this.actor.system.details.level < LEVEL_XP.length - 1
      && this.actor.system.details.xp >= this.actor.system.details.nextLevel
      && this.actor.items.some(item => ["class", "advanced-class"].includes(item.type) && safeNumber(item.system.classLevel) > 0);
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
    html.find(".apply-damage").on("click", this._onApplyDamage.bind(this));
    html.find(".resource-control").on("click", this._onResourceControl.bind(this));
    html.find(".roll-attributes").on("click", this._onRollAttributes.bind(this));
    html.find(".la-level-up").on("click", this._onLevelUp.bind(this));
  }

  async _onLevelUp(event) {
    event.preventDefault();
    const level = safeNumber(this.actor.system.details.level, 1);
    const nextLevel = level + 1;
    const xpRequired = LEVEL_XP[nextLevel];
    if (!xpRequired || safeNumber(this.actor.system.details.xp) < xpRequired) return;

    const classes = this.actor.items.filter(item => ["class", "advanced-class"].includes(item.type) && safeNumber(item.system.classLevel) > 0);
    if (!classes.length) return ui.notifications.error(game.i18n.localize("LA.NoLevelClass"));
    const classPack = game.packs.get("last-arc-analogue.classes");
    const ownedClassNames = new Set(classes.filter(item => item.type === "class").map(item => item.name));
    const availableClasses = classPack ? (await classPack.getDocuments()).filter(item => !ownedClassNames.has(item.name)) : [];
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
    const earnsTechnick = nextLevel === 1 || nextLevel % 2 === 0;
    if (earnsTechnick) {
      const hasClassBonus = !selectedClass.isNew
        && selectedClass.item.type === "class"
        && bonusLevels.map(Number).includes(nextClassLevel);
      const technick = await this._chooseTechnick({
        ...(hasClassBonus ? { bonusTechnicks: selectedClass.item.system.bonusTechnicks ?? [] } : {}),
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
    ui.notifications.info(game.i18n.format("LA.LevelUpComplete", { level: nextLevel }));
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

  async _configureTechnick(itemData, { classItem = null, projectedAttributes = {}, projectedTrainedSkills = [], priorSelections = [], weaponGroups = null } = {}) {
    const choiceType = itemData.system.choice?.type;
    if (!choiceType) return itemData;
    let choices = [];
    if (choiceType === "trainedSkill") {
      choices = Object.keys(SKILLS).filter(key => (this.actor.system.skills[key]?.trained || projectedTrainedSkills.includes(key)) && !this.actor.items.some(item => item.type === "technick" && item.system.selectedSkill === key) && !priorSelections.some(item => item.system.choice?.type === "trainedSkill" && item.system.selectedSkill === key));
    } else if (choiceType === "classSkillTraining") {
      const classSkills = new Set([...this.actor.items.filter(item => ["class", "advanced-class"].includes(item.type)).flatMap(item => item.system.classSkills ?? []), ...(classItem?.system.classSkills ?? [])]);
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
      const classSkills = new Set([...this.actor.items.filter(entry => ["class", "advanced-class"].includes(entry.type)).flatMap(entry => entry.system.classSkills ?? []), ...(classItem?.system.classSkills ?? [])]);
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
    const oldMaxHP = safeNumber(this.actor.system.resources.hp.max);
    const oldMaxMP = safeNumber(this.actor.system.resources.mp.max);
    const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
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
    if (dropped.type === "technick") return this._applyTechnickDrop(dropped.toObject());
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

  async _applyRaceDrop(itemData) {
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
    return created;
  }

  async _applyClassDrop(itemData, { levelUp = false } = {}) {
    if (itemData.system.needsRuleData) {
      ui.notifications.warn(`${itemData.name}: add its progression, defence, HP/MP, and skills to the compendium item before applying it.`);
      return false;
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
      const classTrees = existing.system.talentTrees?.length ? existing.system.talentTrees : CLASS_TALENT_TREES[existing.name] ?? [];
      let talentSelection = null;
      if ((existing.system.talentLevels ?? []).includes(nextLevel)) talentSelection = await this._chooseClassTalent(existing);
      if ((existing.system.talentLevels ?? []).includes(nextLevel) && classTrees.length && !talentSelection) return false;
      const selectedTrees = [...new Set([...(existing.system.selectedTalentTrees ?? []), ...(talentSelection ? [talentSelection.tree] : [])])];
      await existing.update({ "system.classLevel": nextLevel, "system.talentTrees": classTrees, "system.selectedTalentTrees": selectedTrees });
      if (talentSelection) await this._createTalentItem(talentSelection.talent, existing);
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
    await this._recalculateClassResources(oldMaxHP, oldMaxMP);
    for (const technick of awardedTechnicks) await this._grantTechnick(technick);
    return created;
  }

  async _chooseClassTalent(classItem) {
    const trees = classItem.system.talentTrees?.length ? classItem.system.talentTrees : CLASS_TALENT_TREES[classItem.name] ?? [];
    if (!trees.length) return null;
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
    const pack = game.packs.get("last-arc-analogue.talents");
    if (!pack) {
      ui.notifications.error(game.i18n.localize("LA.TalentPackUnavailable"));
      return null;
    }
    const ownedNames = new Set(this.actor.items.filter(item => item.type === "talent" && !item.system.repeatable).map(item => item.name));
    const talents = (await pack.getDocuments()).filter(item => item.system.className === classItem.name && item.system.tree === tree && (item.system.repeatable || !ownedNames.has(item.name)));
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
    const available = (itemData.system.classSkills ?? []).filter(key => SKILLS[key]);
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
    const update = {};
    ATTRIBUTES.forEach((key, index) => { update[`system.attributes.${key}.score`] = values[index]; });
    await this.actor.update(update);
    for (const roll of rolls) await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: game.i18n.localize("LA.AttributeGeneration") });
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
    context.weaponGroups = WEAPON_GROUPS.map(key => ({ key, label: `LA.WeaponGroup.${key}` }));
    context.system.selectedSkillLabel ??= SKILL_LABELS[context.system.selectedSkill] ? game.i18n.localize(SKILL_LABELS[context.system.selectedSkill]) : context.system.selectedSkill;
    context.system.selectedWeaponGroupLabel ??= context.system.selectedWeaponGroup ? game.i18n.localize(`LA.WeaponGroup.${context.system.selectedWeaponGroup}`) : "";
    context.technickPrerequisiteText = formatTechnickPrerequisites(context.system);
    context.isTalent = this.item.type === "talent";
    context.isSpell = this.item.type === "spell";
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
