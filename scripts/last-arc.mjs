const ATTRIBUTES = ["str", "vit", "agi", "int", "mnd", "cha"];
const SKILLS = {
  acrobatics: "agi", alchemy: "int", athletics: "str", deception: "cha", disable: "agi",
  "lore-terrestrial": "int", "lore-mystic": "int", "lore-occult": "int", medicine: "int", perception: "mnd",
  perform: "cha", persuasion: "cha", pilot: "agi", ride: "agi", smithing: "int", spellcraft: "mnd", stealth: "agi", survival: "mnd"
};
const ITEM_TYPES = ["race", "class", "advanced-class", "spell", "talent", "technick", "weapon", "armor", "equipment", "feature", "other"];
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
    for (const key of ATTRIBUTES) system.attributes[key] ??= { score: 10 };
    const classItems = this.items.filter(item => ["class", "advanced-class"].includes(item.type));
    const raceItem = this.items.find(item => item.type === "race");
    const classLevels = classItems.reduce((sum, item) => sum + Math.max(0, safeNumber(item.system.classLevel)), 0);
    const level = Math.max(1, classLevels || safeNumber(system.details?.level, 1));
    system.details.level = level;
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
        total: halfLevel + (skill.trained ? 5 : 0) + safeNumber(skill.classBonus) + classItems.reduce((sum, item) => sum + safeNumber(item.system.skillBonuses?.[key]) + safeNumber(item.system.selectedEffects?.skillBonuses?.[key]), 0) + safeNumber(system.details.racialEffects?.skillBonuses?.[key]) + safeNumber(skill.misc) + system.attributes[attribute].modifier
      };
    }
    for (const defence of ["fort", "ref", "will"]) {
      const attribute = { fort: "vit", ref: "agi", will: "mnd" }[defence];
      const record = system.defences?.[defence] ?? {};
      system.defences ??= {};
      system.defences[defence] = {
        ...record,
        base: 10,
        attributeMod: system.attributes[attribute].modifier,
        total: 10 + system.attributes[attribute].modifier + Math.max(safeNumber(record.classBonus), ...classItems.map(item => safeNumber(item.system.defenceBonuses?.[defence]) + safeNumber(item.system.selectedEffects?.defenceBonuses?.[defence]))) + safeNumber(system.details.racialEffects?.defenceBonuses?.[defence]) + level + safeNumber(record.misc)
      };
    }
    const hp = system.resources?.hp ?? {};
    const mp = system.resources?.mp ?? {};
    system.resources.hp = { value: safeNumber(hp.value), max: safeNumber(hp.max) };
    system.resources.mp = { value: safeNumber(mp.value), max: safeNumber(mp.max) };
    system.combat.passivePerception = 10 + safeNumber(system.skills.perception?.total);
    const classInitiative = classItems.map(item => item.system.initiativeDie).filter(Boolean).sort((a, b) => Number((b.match(/d(\d+)/i) ?? [0, 0])[1]) - Number((a.match(/d(\d+)/i) ?? [0, 0])[1]))[0];
    system.combat.initiativeDie = classInitiative || system.combat.initiativeDie || "1d20";
    system.inventory ??= {};
    system.inventoryBulk = this.items.reduce((sum, item) => sum + safeNumber(item.system.quantity, 1) * safeNumber(item.system.bulk), 0);
    system.inventory.maxBulk = 5 + safeNumber(system.attributes.str.score);
    system.inventory.overBulk = 10 + safeNumber(system.attributes.str.score);
  }

  async applyDamage(amount, { type = "unaspected", bypassDR = false } = {}) {
    const damage = Math.max(0, Math.floor(safeNumber(amount)));
    const dr = bypassDR ? 0 : Math.max(0, safeNumber(this.system.combat?.damageReduction));
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
    const formula = this.system.damage?.formula || this.system.roll?.formula;
    const title = this.name;
    if (this.type === "weapon" && actor) {
      const bonus = safeNumber(this.system.attack?.bonus);
      const attack = await (new Roll(`1d20 + (${bonus})`, actor.getRollData())).evaluate();
      await attack.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${game.i18n.localize("LA.AttackRoll")}: ${foundry.utils.escapeHTML(title)} (${signed(bonus)})` });
    }
    if (formula) {
      const roll = await (new Roll(formula, actor?.getRollData?.() ?? {})).evaluate();
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: title });
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
  }

  async _onDropItem(event, data) {
    const dropped = await Item.implementation.fromDropData(data);
    if (!["race", "class", "advanced-class"].includes(dropped.type)) return super._onDropItem(event, data);
    const itemData = dropped.toObject();
    if (dropped.type === "race") return this._applyRaceDrop(itemData);
    return this._applyClassDrop(itemData);
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

  async _applyClassDrop(itemData) {
    if (itemData.system.needsRuleData) {
      ui.notifications.warn(`${itemData.name}: add its progression, defence, HP/MP, and skills to the compendium item before applying it.`);
      return false;
    }
    const choices = await this._chooseItemOption(itemData, itemData.type);
    if (choices === null) return false;
    const selectedSubclass = choices.selectedChoices?.[0]?.value ?? itemData.system.selectedSubclass ?? "";
    const existing = this.actor.items.find(item => item.type === itemData.type && item.name === itemData.name && (item.system.selectedSubclass ?? "") === selectedSubclass);
    const oldMaxHP = safeNumber(this.actor.system.resources.hp.max);
    const oldMaxMP = safeNumber(this.actor.system.resources.mp.max);
    if (existing) {
      await existing.update({ "system.classLevel": safeNumber(existing.system.classLevel, 1) + 1 });
      await this._recalculateClassResources(oldMaxHP, oldMaxMP);
      return existing;
    }
    itemData.system.classLevel = Math.max(1, safeNumber(itemData.system.classLevel, 1));
    itemData.system.selectedSubclass = selectedSubclass ?? "";
    itemData.system.selectedChoices = choices.selectedChoices;
    itemData.system.selectedEffects = choices.effects;
    const classes = this.actor.items.filter(item => ["class", "advanced-class"].includes(item.type));
    itemData.system.isStartingClass = classes.length === 0;
    if (!classes.length && itemData.system.trainedSkillCount && itemData.system.classSkills?.length) {
      const count = Math.max(0, safeNumber(itemData.system.trainedSkillCount) + this.actor.system.attributes.int.modifier + safeNumber(this.actor.system.details.racialEffects?.bonusTrainedSkills));
      const trainedSkills = await this._chooseClassSkills(itemData, count);
      if (trainedSkills === null) return false;
      itemData.system.trainedSkills = trainedSkills;
      for (const key of trainedSkills) await this.actor.update({ [`system.skills.${key}.trained`]: true });
    }
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    await this._recalculateClassResources(oldMaxHP, oldMaxMP);
    return created;
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
    if (!classes.length) return;
    const hpGain = hpMax - oldMaxHP;
    const mpGain = mpMax - oldMaxMP;
    await this.actor.update({
      "system.resources.hp.max": hpMax,
      "system.resources.hp.value": Math.max(0, Math.min(hpMax, safeNumber(this.actor.system.resources.hp.value) + hpGain)),
      "system.resources.mp.max": mpMax,
      "system.resources.mp.value": Math.max(0, Math.min(mpMax, safeNumber(this.actor.system.resources.mp.value) + mpGain))
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
    if (item && await Dialog.confirm({ title: game.i18n.localize("LA.Delete"), content: game.i18n.localize("LA.ConfirmDelete") })) await item.delete();
  }
  _onItemRoll(event) { this.actor.items.get(event.currentTarget.closest(".item").dataset.itemId)?.roll(); }
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
    context.raceTraits = (context.system.traits ?? []).map(trait => {
      const [name, ...detail] = String(trait).split(":");
      return { name: detail.length ? name.trim() : "", description: detail.length ? detail.join(":").trim() : name.trim() };
    });
    context.itemTypeLabel = `LA.ItemType.${this.item.type}`;
    context.isClass = ["class", "advanced-class"].includes(this.item.type);
    context.isRace = this.item.type === "race";
    context.isNonRollable = ["race", "class", "advanced-class", "feature"].includes(this.item.type);
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".item-roll").on("click", event => { event.preventDefault(); this.item.roll(); });
  }
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    const itemSystem = data.system ?? {};
    const skillsText = itemSystem.classSkillsText ?? "";
    const traitsText = itemSystem.traitsText ?? "";
    const choicesText = itemSystem.choiceGroupsText ?? "[]";
    delete itemSystem.classSkillsText;
    delete itemSystem.traitsText;
    delete itemSystem.choiceGroupsText;
    if (skillsText) itemSystem.classSkills = skillsText.split(/[,\n]/).map(key => key.trim()).filter(key => SKILLS[key]);
    itemSystem.traits = traitsText.split(/\n/).map(line => line.trim()).filter(Boolean);
    try { itemSystem.choiceGroups = JSON.parse(choicesText || "[]"); }
    catch { return ui.notifications.error(game.i18n.localize("LA.InvalidChoiceJSON")); }
    return this.item.update(data);
  }
}
