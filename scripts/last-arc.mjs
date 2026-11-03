const ATTRIBUTES = ["str", "vit", "agi", "int", "mnd", "cha"];
const SKILLS = {
  acrobatics: "agi", alchemy: "int", athletics: "str", deception: "cha", disable: "int",
  "lore-terrestrial": "int", "lore-mystic": "int", "lore-occult": "int", medicine: "int", perception: "mnd",
  perform: "cha", persuasion: "cha", pilot: "int", ride: "agi", smithing: "int", spellcraft: "int", stealth: "agi", survival: "mnd"
};
const ITEM_TYPES = ["race", "class", "spell", "talent", "technick", "weapon", "armor", "equipment", "feature", "other"];
const ATTRIBUTE_LABELS = { str: "LA.Strength", vit: "LA.Vitality", agi: "LA.Agility", int: "LA.Intelligence", mnd: "LA.Mind", cha: "LA.Charisma" };
const SKILL_LABELS = {
  acrobatics: "LA.Acrobatics", alchemy: "LA.Alchemy", athletics: "LA.Athletics", deception: "LA.Deception", disable: "LA.Disable",
  "lore-terrestrial": "LA.LoreTerrestrial", "lore-mystic": "LA.LoreMystic", "lore-occult": "LA.LoreOccult", medicine: "LA.Medicine", perception: "LA.Perception",
  perform: "LA.Perform", persuasion: "LA.Persuasion", pilot: "LA.Pilot", ride: "LA.Ride", smithing: "LA.Smithing", spellcraft: "LA.Spellcraft", stealth: "LA.Stealth", survival: "LA.Survival"
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function signed(value) { return `${value >= 0 ? "+" : ""}${value}`; }

Hooks.once("init", () => {
  CONFIG.Actor.documentClass = LastArcActor;
  CONFIG.Item.documentClass = LastArcItem;
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
    const classItems = this.items.filter(item => item.type === "class");
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
        total: halfLevel + safeNumber(skill.classBonus) + classItems.reduce((sum, item) => sum + safeNumber(item.system.skillBonuses?.[key]), 0) + safeNumber(skill.misc) + system.attributes[attribute].modifier
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
        total: 10 + system.attributes[attribute].modifier + safeNumber(record.classBonus) + classItems.reduce((sum, item) => sum + safeNumber(item.system.defenceBonuses?.[defence]), 0) + level + safeNumber(record.misc)
      };
    }
    const hp = system.resources?.hp ?? {};
    const mp = system.resources?.mp ?? {};
    system.resources.hp = { value: safeNumber(hp.value), max: safeNumber(hp.max) };
    system.resources.mp = { value: safeNumber(mp.value), max: safeNumber(mp.max) };
    system.combat.passivePerception = 10 + safeNumber(system.skills.perception?.total);
    system.combat.initiativeDie = system.combat.initiativeDie || classItems.find(item => item.system.initiativeDie)?.system.initiativeDie || "1d20";
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
    context.skills = Object.entries(SKILLS).map(([key, attribute]) => ({ key, label: SKILL_LABELS[key], attribute, attributeLabel: ATTRIBUTE_LABELS[attribute], ...this.actor.system.skills[key] }));
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

class LastArcItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { classes: ["last-arc", "sheet", "item"], template: "systems/last-arc-analogue/templates/item-sheet.hbs", width: 540, height: 610 });
  }
  get template() { return "systems/last-arc-analogue/templates/item-sheet.hbs"; }
  getData(options) { const context = super.getData(options); context.system = this.item.system; context.itemTypeLabel = `LA.ItemType.${this.item.type}`; context.isClass = this.item.type === "class"; return context; }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".item-roll").on("click", event => { event.preventDefault(); this.item.roll(); });
  }
}
