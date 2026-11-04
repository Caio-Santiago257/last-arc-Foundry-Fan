import { postDamageRoll } from "./damage-chat.mjs";

const STATUS_ICONS = {
  blinded: "icons/svg/blind.svg", silenced: "icons/svg/deaf.svg", petrified: "icons/svg/stone.svg",
  zombified: "icons/svg/skull.svg", diseased: "icons/svg/biohazard.svg", paralysed: "icons/svg/paralysis.svg",
  slowed: "icons/svg/clockwork.svg", prone: "icons/svg/falling.svg", flatFooted: "icons/svg/daze.svg",
  drenched: "icons/svg/waterfall.svg", sleeping: "icons/svg/sleep.svg", confused: "icons/svg/terror.svg",
  charmed: "icons/svg/aura.svg", feared: "icons/svg/terror.svg", restrained: "icons/svg/net.svg",
  invisible: "icons/svg/invisible.svg", incorporeal: "icons/svg/ghost.svg", hover: "icons/svg/wing.svg",
  encumbered: "icons/svg/anchor.svg", stunned: "icons/svg/daze.svg", poisoned: "icons/svg/poison.svg"
};

const escapeHTML = value => foundry.utils.escapeHTML(String(value ?? ""));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const signed = value => `${value >= 0 ? "+" : ""}${value}`;

function spellDamageFormula(formula, caster, intensified = false) {
  const base = String(formula).replaceAll("@level", String(number(caster.system.details?.level)));
  if (!intensified) return base;
  return base.replace(/(\d*)d(\d+)/gi, (_match, count, faces) => `${Math.max(1, number(count, 1)) * 2}d${faces}`);
}

function hasDamage(spell) {
  return [...(spell.system.automation?.tiers ?? [])].some(tier => tier.effects?.some(effect => effect.type === "damage"))
    || (spell.system.automation?.effects ?? []).some(effect => effect.type === "damage");
}

function hasScaledDuration(spell) {
  return [...(spell.system.automation?.tiers ?? [])].some(tier => tier.effects?.some(effect => number(effect.durationRounds) > 0))
    || (spell.system.automation?.effects ?? []).some(effect => number(effect.durationRounds) > 0);
}

function eligibleHighArcana(actor, spell) {
  const target = String(spell.system.target ?? "");
  const area = /all creatures|all enemies|cone|area|nearby creatures|radius/i.test(target);
  const singleCreature = spell.system.targetMode === "selected" && /one creature/i.test(target) && !area;
  return actor.items.filter(item => item.type === "feature"
    && item.flags?.["last-arc-analogue"]?.archmageHighArcana
    && item.system.category === "High Arcana")
    .filter(item => {
      switch (item.system.automation?.highArcana) {
        case "adamantSpell": return true;
        case "distantSpell": return /\d+\s+squares?/i.test(target);
        case "enlargedSpell": return area;
        case "intensifiedSpell": return hasDamage(spell);
        case "lingeringSpell": return hasScaledDuration(spell);
        case "multiSpell": return singleCreature;
        default: return false;
      }
    });
}

async function chooseHighArcana(actor, spell) {
  const options = eligibleHighArcana(actor, spell);
  if (!options.length) return "";
  const rows = options.map((item, index) => `<label class="la-high-arcana-option"><input type="radio" name="highArcana" value="${index}"><span><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.system.description ?? "")}</small></span></label>`).join("");
  return new Promise(resolve => new Dialog({
    title: game.i18n.localize("LA.UseHighArcana"),
    content: `<form class="la-high-arcana-form"><p>${game.i18n.localize("LA.UseHighArcanaHint")}</p><label class="la-high-arcana-option"><input type="radio" name="highArcana" value="none" checked><span><strong>${game.i18n.localize("LA.CastWithoutHighArcana")}</strong></span></label><fieldset>${rows}</fieldset></form>`,
    buttons: {
      cast: { label: game.i18n.localize("LA.Continue"), callback: html => {
        const value = html.find('input[name="highArcana"]:checked').val();
        resolve(value === "none" ? "" : options[Number(value)]?.system.automation?.highArcana ?? "");
      } },
      cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
    },
    default: "cast", close: () => resolve(null)
  }).render(true));
}

function targetActors(item, actor) {
  const selected = [...(game.user?.targets ?? [])].map(token => ({ actor: token.actor, token })).filter(target => target.actor);
  if (selected.length) return selected;
  if (["self", "self-or-selected"].includes(item.system.targetMode)) {
    const token = actor.getActiveTokens(false, false)[0] ?? null;
    return [{ actor, token }];
  }
  return [];
}

function effectsForTier(automation, total) {
  const tiers = [...(automation.tiers ?? [])].sort((a, b) => number(a.dc) - number(b.dc));
  const eligible = tiers.filter(tier => total >= number(tier.dc));
  if (tiers.length && !eligible.length) return { tier: null, effects: [] };
  const tier = eligible.at(-1) ?? null;
  return { tier, effects: tier?.effects ?? automation.effects ?? [] };
}

function defenceResult(target, caster, defence, spell, checkTotal) {
  if (!defence) return true;
  const targetLevel = number(target.system.details?.level);
  const casterLevel = number(caster.system.details?.level);
  const higherLevelBonus = spell.system.higherLevelDefenceBonus && targetLevel > casterLevel
    ? number(spell.system.higherLevelDefenceBonus) : 0;
  const margin = typeof defence === "object" ? number(defence.margin) : 0;
  const key = typeof defence === "object" ? defence.defence : defence;
  const ordinary = number(target.system.defences?.[key]?.total, 10) + number(target.system.combat?.performanceSpellDefenceBonuses?.[key]);
  const substitute = number(target.system.combat?.performanceDefenceSubstitutions?.[key]);
  const total = Math.max(ordinary, substitute) + higherLevelBonus;
  return { success: checkTotal > total + margin, total, bonus: higherLevelBonus };
}

function durationData(effect) {
  const rounds = number(effect.durationRounds);
  return rounds > 0 ? { rounds } : {};
}

async function applyCondition(target, caster, spell, condition, rounds = 0, changes = [], { checkImmunity = true } = {}) {
  if (!target?.createEmbeddedDocuments) return;
  const status = String(condition ?? "effect");
  const normalizedStatus = status.toLowerCase().replace(/[ _-]/g, "");
  const immunities = [target.system.combat?.immunities, target.system.combat?.equipmentImmunities]
    .flatMap(value => Array.isArray(value) ? value : String(value ?? "").split(/[,;\n]+/))
    .map(value => String(value).trim().toLowerCase().replace(/[ _-]/g, "")).filter(Boolean);
  const statusImmune = checkImmunity && target.system.combat?.equipmentAllStatusImmunities && !["curse", "curses"].includes(normalizedStatus);
  const mindEffectImmune = checkImmunity && target.system.combat?.equipmentMindEffectImmunity
    && ["charm", "charmed", "confusion", "confused", "fear", "muddle", "sleep"].includes(normalizedStatus);
  if (statusImmune || mindEffectImmune || (checkImmunity && (immunities.includes("all") || immunities.includes(normalizedStatus) || (normalizedStatus === "cursed" && immunities.includes("curse"))))) return false;
  const existing = target.effects.find(effect => effect.getFlag("last-arc-analogue", "spellName") === spell.name && effect.getFlag("last-arc-analogue", "condition") === status);
  if (existing) await existing.delete();
  await target.createEmbeddedDocuments("ActiveEffect", [{
    name: `${spell.name}: ${status}`,
    img: STATUS_ICONS[status] ?? "icons/svg/aura.svg",
    origin: caster.uuid,
    disabled: false,
    duration: durationData({ durationRounds: rounds }),
    changes,
    statuses: [status],
    flags: { "last-arc-analogue": { spell: true, dispellable: /may be dispelled/i.test(spell.system.specialRules ?? ""), spellName: spell.name, condition: status } }
  }]);
  return true;
}

async function applySpellEffect(effect, target, caster, spell, checkTotal, results, damageBonus = 0, highArcana = "", targetToken = null, damageRider = null) {
  const cancelsSpell = { Inertia: "Haste", Gravity: "Levitation" }[spell.name];
  if (effect.type === "condition" && cancelsSpell) {
    const active = target.effects.filter(entry => entry.getFlag("last-arc-analogue", "spellName") === cancelsSpell);
    if (active.length) {
      await target.deleteEmbeddedDocuments("ActiveEffect", active.map(entry => entry.id));
      results.push(`${target.name}: ${cancelsSpell} ended`);
      return;
    }
  }
  if (effect.type === "condition" && spell.name === "Polymorph" && target.effects.some(entry => entry.getFlag("last-arc-analogue", "condition") === "toad")) {
    const active = target.effects.filter(entry => entry.getFlag("last-arc-analogue", "condition") === "toad");
    await target.deleteEmbeddedDocuments("ActiveEffect", active.map(entry => entry.id));
    results.push(`${target.name}: toad effect ended`);
    return;
  }
  const checks = (effect.requiresDefences ?? (effect.defence ? [effect.defence] : [])).map(defence => defenceResult(target, caster, defence, spell, checkTotal));
  const hasFailure = checks.some(check => !check.success);
  if (hasFailure && caster.items?.some(entry => entry.type === "talent" && entry.name === "Addle")) {
    const prior = target.effects.filter(active => active.getFlag("last-arc-analogue", "addleEffect")?.casterActorId === caster.id);
    if (prior.length) await target.deleteEmbeddedDocuments("ActiveEffect", prior.map(active => active.id));
    await target.createEmbeddedDocuments("ActiveEffect", [{
      name: `Addle (${caster.name})`, img: "icons/svg/daze.svg", origin: spell.uuid, disabled: false, duration: {}, changes: [],
      flags: { "last-arc-analogue": { addleEffect: { casterActorId: caster.id, description: "Target defences are treated as 5 lower against this caster's next spell." } } }
    }]);
  }
  if (effect.requiresDefences?.length && hasFailure) return;

  if (effect.type === "damage") {
    if (hasFailure && !effect.halfOnFailure) return;
    const baseFormula = spellDamageFormula(effect.formula, caster, highArcana === "intensifiedSpell");
    const formula = damageBonus ? `(${baseFormula}) + ${damageBonus}` : baseFormula;
    const damageRoll = await (new Roll(formula, { ...caster.getRollData(), level: caster.system.details.level })).evaluate();
    const amount = Math.max(0, Math.floor(hasFailure && effect.halfOnFailure ? damageRoll.total / 2 : damageRoll.total));
    await postDamageRoll(damageRoll, {
      speaker: ChatMessage.getSpeaker({ actor: caster }),
      flavor: `${escapeHTML(spell.name)} — ${escapeHTML(target.name)} (${escapeHTML(formula)})`,
      amount,
      type: effect.damageType ?? "unaspected",
      bypassDR: Boolean(effect.bypassDR),
      targetTokens: [targetToken].filter(Boolean),
      onApply: damageRider?.(effect) ?? null
    });
    results.push(`${target.name}: ${amount} ${effect.damageType ?? "damage"} (${game.i18n.localize("LA.DamageAwaitingApplication")})${hasFailure ? ` (${game.i18n.localize("LA.SpellDefenceMiss")})` : ""}`);
  } else if (effect.type === "heal") {
    const formula = String(effect.formula).replaceAll("@level", String(number(caster.system.details.level)));
    const healingRoll = await (new Roll(formula, caster.getRollData())).evaluate();
    const hp = target.system.resources?.hp ?? { value: 0, max: 0 };
    const healing = Math.max(0, Math.floor(healingRoll.total));
    const healed = typeof target.applyHealing === "function" ? await target.applyHealing(healing) : Math.min(healing, Math.max(0, number(hp.max) - number(hp.value)));
    if (typeof target.applyHealing !== "function") await target.update({ "system.resources.hp.value": number(hp.value) + healed, "system.combat.persistentHpRecovery": false });
    results.push(`${target.name}: +${healed} HP`);
  } else if (effect.type === "condition") {
    if (effect.defence && hasFailure) return;
    const rounds = number(effect.durationRounds) * (highArcana === "lingeringSpell" ? 2 : 1);
    const applied = await applyCondition(target, caster, spell, effect.status, rounds, effect.changes ?? []);
    results.push(`${target.name}: ${applied ? effect.status : `immune to ${effect.status}`}`);
  } else if (effect.type === "change") {
    const rounds = number(effect.durationRounds) * (highArcana === "lingeringSpell" ? 2 : 1);
    await applyCondition(target, caster, spell, effect.label ?? "bonus", rounds, [{ key: effect.key, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: effect.value }], { checkImmunity: false });
    results.push(`${target.name}: ${effect.label ?? "bonus"} ${effect.value >= 0 ? "+" : ""}${effect.value}`);
  } else if (effect.type === "dispel") {
    const targetWill = number(target.system.defences?.will?.total, 10) - (target === caster ? 5 : 0);
    if (checkTotal <= targetWill) return;
    const removable = target.effects.filter(active => active.getFlag("last-arc-analogue", "dispellable"));
    if (removable.length) await target.deleteEmbeddedDocuments("ActiveEffect", removable.map(active => active.id));
    results.push(`${target.name}: ${removable.length ? `${removable.length} effect(s) dispelled` : "no dispellable effects"}`);
  } else if (effect.type === "removeConditions") {
    const statuses = new Set(effect.statuses ?? []);
    const removable = target.effects.filter(active => statuses.has(active.getFlag("last-arc-analogue", "condition")) || [...(active.statuses ?? [])].some(status => statuses.has(status)));
    if (removable.length) await target.deleteEmbeddedDocuments("ActiveEffect", removable.map(active => active.id));
    results.push(`${target.name}: ${removable.length ? `${removable.length} effect(s) removed` : "no matching spell effects"}`);
  }
}

async function showSpellCard(item, actor = null) {
  const system = item.system;
  const description = escapeHTML(system.description).replaceAll("\n", "<br>");
  const special = escapeHTML(system.specialRules).replaceAll("\n", "<br>");
  const damageSpell = hasDamage(item);
  if (!actor || !system.automation) {
    const header = `<h3>${escapeHTML(item.name)} <small>(${escapeHTML(system.mpCost)} MP)</small></h3><p><b>${escapeHTML(system.school)}</b> · ${escapeHTML(system.action)}</p><p><b>${game.i18n.localize("LA.Targets")}:</b> ${escapeHTML(system.target)}</p><p>${description}</p>${special ? `<p><b>${game.i18n.localize("LA.Special")}:</b> ${special}</p>` : ""}`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: header });
  }

  const selectedHighArcana = await chooseHighArcana(actor, item);
  if (selectedHighArcana === null) return null;
  const intensifiedSpell = selectedHighArcana === "intensifiedSpell";
  const mpCost = number(system.mpCost) * (selectedHighArcana ? 2 : 1);
  const targetText = selectedHighArcana === "distantSpell"
    ? String(system.target).replace(/(\d+)\s+(square|squares)\b/gi, (_match, distance, unit) => `${Number(distance) * 2} ${unit}`)
    : String(system.target ?? "");
  const compactHeader = `<h3>${escapeHTML(item.name)} <small>(${mpCost} MP)</small></h3><p><b>${escapeHTML(system.school)}</b> · ${escapeHTML(system.action)}</p>`;
  const fullHeader = `${compactHeader}<p><b>${game.i18n.localize("LA.Targets")}:</b> ${escapeHTML(targetText)}</p><p>${description}</p>${special ? `<p><b>${game.i18n.localize("LA.Special")}:</b> ${special}</p>` : ""}`;
  const header = damageSpell ? compactHeader : fullHeader;

  if (number(actor.system.resources.mp.value) < mpCost) {
    ui.notifications.warn(game.i18n.format("LA.NotEnoughMP", { cost: mpCost }));
    return null;
  }
  const canAmplify = actor.items?.some(entry => entry.type === "talent" && entry.name === "Amplification");
  const amplificationLimit = canAmplify ? Math.min(5, Math.floor(mpCost / 5)) : 0;
  let amplificationPenalty = 0;
  if (amplificationLimit > 0) {
    amplificationPenalty = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.Amplification"),
      content: `<form><p>${game.i18n.format("LA.AmplificationHint", { max: amplificationLimit })}</p><label>${game.i18n.localize("LA.AmplificationPenalty")}<input type="number" name="penalty" min="0" max="${amplificationLimit}" value="0"></label></form>`,
      buttons: {
        cast: { label: game.i18n.localize("LA.Continue"), callback: html => resolve(Math.max(0, Math.min(amplificationLimit, Math.floor(number(html.find('[name="penalty"]').val()))))) },
        cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
      },
      default: "cast", close: () => resolve(null)
    }).render(true));
    if (amplificationPenalty === null) return null;
  }
  let targets = targetActors(item, actor);
  const multiSpellLimit = 1 + Math.max(1, number(actor.system.attributes?.mnd?.modifier));
  if (selectedHighArcana === "multiSpell" && targets.length > multiSpellLimit) {
    targets = targets.slice(0, multiSpellLimit);
    ui.notifications.info(game.i18n.format("LA.MultiSpellTargetLimit", { count: multiSpellLimit }));
  }

  let defensivePenalty = 0;
  let classCastingNote = "";
  let threatsCount = 0;
  const casterToken = actor.getActiveTokens(false, false)[0] ?? null;
  if (casterToken && canvas?.scene) {
    threatsCount = canvas.tokens.placeables.filter(token => token !== casterToken
      && token.document.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE
      && canvas.grid.measureDistance(casterToken.center, token.center) <= 1).length;
  }
  if (threatsCount) {
    const castDefensively = await Dialog.confirm({
      title: game.i18n.localize("LA.SpellcastingInMelee"),
      content: `<p>${game.i18n.localize("LA.SpellcastingThreatenedHint")}</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    if (castDefensively) {
      defensivePenalty = -5 * threatsCount;
      const classes = actor.items.filter(entry => entry.type === "advanced-class" && number(entry.system.classLevel) > 0);
      const actionIsQuick = /primary|minor|free/i.test(String(system.action ?? ""));
      const surecast = actionIsQuick && classes.some(entry => entry.name === "Archmage" && entry.system.classFeatures?.some(feature => feature.name === "Surecast"));
      const armour = actor.items.find(entry => entry.type === "armor" && entry.system.equipped);
      const armourType = String(armour?.system.armorType ?? "").toLowerCase();
      const armourProficient = armour && actor.items.some(entry => entry.type === "technick" && entry.name.toLowerCase() === `armour proficiency (${armourType})`);
      const arcaneArmour = armourProficient && classes.some(entry => entry.name === "Battlemage" && entry.system.classFeatures?.some(feature => feature.name === "Arcane Armour"));
      if (surecast || arcaneArmour) {
        defensivePenalty = 0;
        classCastingNote = `<p>${game.i18n.localize(surecast ? "LA.SurecastApplied" : "LA.ArcaneArmourApplied")}</p>`;
      }
    }
  }

  await actor.update({ "system.resources.mp.value": number(actor.system.resources.mp.value) - mpCost });
  const bonus = number(actor.system.skills?.spellcraft?.total);
  const roll = await (new Roll(`1d20 + (${bonus + defensivePenalty - amplificationPenalty})`, actor.getRollData())).evaluate();
  const checkTotal = roll.total;
  const { tier, effects } = effectsForTier(system.automation, roll.total);
  const minimumDC = number(system.automation.minimumDC);
  const castSucceeded = roll.total >= minimumDC;
  const results = [];
  const classesWithSoulEater = actor.items.filter(entry => entry.type === "advanced-class"
    && number(entry.system.classLevel) >= 2
    && (entry.system.classFeatures ?? []).some(feature => feature.name === "Soul Eater"));
  const classesWithArcaneAcumen = actor.items.filter(entry => entry.type === "advanced-class"
    && number(entry.system.classLevel) >= 2
    && (entry.system.classFeatures ?? []).some(feature => feature.name === "Arcane Acumen"));
  const castHasDamage = effects.some(effect => effect.type === "damage");
  const castHasElementalDamage = effects.some(effect => effect.type === "damage" && ["fire", "cold", "electric", "dark", "holy"].includes(String(effect.damageType ?? "").toLowerCase()));
  let damageRidersAssigned = false;
  const getDamageRider = effect => {
    if (damageRidersAssigned || effect.type !== "damage") return null;
    const healPerDamage = castHasDamage ? classesWithSoulEater.reduce((sum, entry) => sum + Math.floor(number(entry.system.classLevel) / 2), 0) : 0;
    const mpPerDamage = castHasElementalDamage ? classesWithArcaneAcumen.reduce((sum, entry) => sum + Math.floor(number(entry.system.classLevel) / 2), 0) : 0;
    if (!healPerDamage && !mpPerDamage) return null;
    damageRidersAssigned = true;
    return {
      ...(healPerDamage ? { healActorUuid: actor.uuid, healPerDamage } : {}),
      ...(mpPerDamage ? { restoreMPActorUuid: actor.uuid, mpPerDamage } : {})
    };
  };

  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${game.i18n.localize("LA.SpellcraftCheck")}: ${escapeHTML(item.name)} (${escapeHTML(system.school)})` });
  if (castSucceeded && effects.length) {
    if (targets.length) {
      for (const { actor: target, token } of targets) {
        const addle = target.effects.find(active => active.getFlag("last-arc-analogue", "addleEffect")?.casterActorId === actor.id);
        for (const effect of effects) await applySpellEffect(effect, target, actor, item, checkTotal + (addle ? 5 : 0), results, amplificationPenalty * 2, selectedHighArcana, token, getDamageRider);
        if (addle && target.effects.has(addle.id)) await target.deleteEmbeddedDocuments("ActiveEffect", [addle.id]);
      }
    } else {
      // A spell can be rolled before choosing a token. Damage is still rolled
      // from the Spellcraft tier, while target defence and damage reduction
      // remain unapplied until the GM has a target to resolve against.
      for (const effect of effects.filter(entry => entry.type === "damage")) {
        const baseFormula = spellDamageFormula(effect.formula, actor, intensifiedSpell);
        const formula = amplificationPenalty ? `(${baseFormula}) + ${amplificationPenalty * 2}` : baseFormula;
        const damageRoll = await (new Roll(formula, { ...actor.getRollData(), level: actor.system.details.level })).evaluate();
        results.push(`${item.name}: ${formula} = ${damageRoll.total} ${game.i18n.localize("LA.DamageRolledUnapplied")}`);
        await postDamageRoll(damageRoll, { speaker: ChatMessage.getSpeaker({ actor }), flavor: `${escapeHTML(item.name)} — ${game.i18n.localize("LA.DamageRolledUnapplied")}`, type: effect.damageType ?? "unaspected", onApply: getDamageRider(effect) });
      }
    }
  }
  const tierLabel = tier ? `${game.i18n.localize("LA.SpellThreshold")}: ${tier.dc}` : castSucceeded ? game.i18n.localize("LA.SpellNoTier") : `${game.i18n.localize("LA.SpellFailed")}: ${minimumDC}+`;
  const targetLabel = targets.length ? targets.map(({ actor: target }) => escapeHTML(target.name)).join(", ") : game.i18n.localize("LA.SpellNoTargetApplication");
  const hasAutomatedEffects = Boolean(effects.length);
  const effectsHtml = results.length ? `<ul>${results.map(result => `<li>${escapeHTML(result)}</li>`).join("")}</ul>`
    : !castSucceeded ? `<p>${game.i18n.localize("LA.SpellNoEffect")}</p>`
      : hasAutomatedEffects ? `<p>${game.i18n.localize("LA.SpellNoEffectApplied")}</p>`
        : `<p>${game.i18n.localize("LA.SpellManualAdjudication")}</p>`;
  const meleeHint = threatsCount && !defensivePenalty ? `<p>${game.i18n.format("LA.SpellMeleeCounterattackHint", { count: threatsCount })}</p>` : "";
  const totalPenalty = defensivePenalty - amplificationPenalty;
  const amplificationNote = amplificationPenalty ? `<p>${game.i18n.localize("LA.Amplification")}: ${signed(-amplificationPenalty)} ${game.i18n.localize("LA.Spellcraft")}; +${amplificationPenalty * 2} ${game.i18n.localize("LA.Damage")}</p>` : "";
  const highArcanaNames = { adamantSpell: "Adamant Spell", distantSpell: "Distant Spell", enlargedSpell: "Enlarged Spell", intensifiedSpell: "Intensified Spell", lingeringSpell: "Lingering Spell", multiSpell: "Multi-Spell" };
  const highArcanaName = highArcanaNames[selectedHighArcana] ?? "";
  const highArcanaNote = selectedHighArcana ? `<p>${game.i18n.format("LA.HighArcanaUsed", { name: escapeHTML(highArcanaName) })}</p>` : "";
  const arcanaEffectNotes = {
    intensifiedSpell: game.i18n.localize("LA.IntensifiedSpellApplied"),
    enlargedSpell: game.i18n.localize("LA.EnlargedSpellApplied"),
    lingeringSpell: game.i18n.localize("LA.LingeringSpellApplied"),
    adamantSpell: game.i18n.localize("LA.AdamantSpellApplied"),
    multiSpell: game.i18n.format("LA.MultiSpellApplied", { count: multiSpellLimit })
  };
  const arcanaEffectNote = arcanaEffectNotes[selectedHighArcana] ? `<p>${arcanaEffectNotes[selectedHighArcana]}</p>` : "";
  const distantNote = selectedHighArcana === "distantSpell" ? `<p>${game.i18n.format("LA.DistantSpellApplied", { target: escapeHTML(targetText) })}</p>` : "";
  const content = `${header}<p><b>${game.i18n.localize("LA.ManaSpent")}:</b> ${mpCost} MP · <b>${game.i18n.localize("LA.Targets")}:</b> ${targetLabel}</p><p class="la-result ${castSucceeded ? "success" : "failure"}">${tierLabel} (${roll.total}; ${game.i18n.localize("LA.Spellcraft")} ${signed(totalPenalty)})</p>${highArcanaNote}${arcanaEffectNote}${distantNote}${classCastingNote}${amplificationNote}${meleeHint}${effectsHtml}`;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

export async function rollSpell(item) {
  return showSpellCard(item, item.parent);
}
