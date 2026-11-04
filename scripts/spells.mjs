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

function targetActors(item, actor) {
  const selected = [...(game.user?.targets ?? [])].map(token => ({ actor: token.actor, token })).filter(target => target.actor);
  if (selected.length) return selected;
  if (["self", "self-or-selected"].includes(item.system.targetMode)) {
    const token = actor.getActiveTokens(true, true)[0] ?? null;
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
  const total = number(target.system.defences?.[key]?.total, 10) + higherLevelBonus;
  return { success: checkTotal > total + margin, total, bonus: higherLevelBonus };
}

function durationData(effect) {
  const rounds = number(effect.durationRounds);
  return rounds > 0 ? { rounds } : {};
}

async function applyCondition(target, caster, spell, condition, rounds = 0, changes = []) {
  if (!target?.createEmbeddedDocuments) return;
  const status = String(condition ?? "effect");
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
}

async function applySpellEffect(effect, target, caster, spell, checkTotal, results) {
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
  if (effect.requiresDefences?.length && hasFailure) return;

  if (effect.type === "damage") {
    if (hasFailure && !effect.halfOnFailure) return;
    const damageRoll = await (new Roll(effect.formula, { ...caster.getRollData(), level: caster.system.details.level })).evaluate();
    const amount = Math.max(0, Math.floor(hasFailure && effect.halfOnFailure ? damageRoll.total / 2 : damageRoll.total));
    const applied = await target.applyDamage(amount, { type: effect.damageType ?? "unaspected", bypassDR: Boolean(effect.bypassDR) });
    results.push(`${target.name}: ${applied} ${effect.damageType ?? "damage"}${hasFailure ? ` (${game.i18n.localize("LA.SpellDefenceMiss")})` : ""}`);
  } else if (effect.type === "heal") {
    const formula = String(effect.formula).replaceAll("@level", String(number(caster.system.details.level)));
    const healingRoll = await (new Roll(formula, caster.getRollData())).evaluate();
    const hp = target.system.resources?.hp ?? { value: 0, max: 0 };
    const value = Math.min(number(hp.max), number(hp.value) + Math.max(0, Math.floor(healingRoll.total)));
    await target.update({ "system.resources.hp.value": value });
    results.push(`${target.name}: +${value - number(hp.value)} HP`);
  } else if (effect.type === "condition") {
    if (effect.defence && hasFailure) return;
    await applyCondition(target, caster, spell, effect.status, effect.durationRounds, effect.changes ?? []);
    results.push(`${target.name}: ${effect.status}`);
  } else if (effect.type === "change") {
    await applyCondition(target, caster, spell, effect.label ?? "bonus", effect.durationRounds, [{ key: effect.key, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: effect.value }]);
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
  const header = `<h3>${escapeHTML(item.name)} <small>(${escapeHTML(system.mpCost)} MP)</small></h3><p><b>${escapeHTML(system.school)}</b> · ${escapeHTML(system.action)} · ${escapeHTML(system.target)}</p><p>${description}</p>${special ? `<p><b>${game.i18n.localize("LA.Special")}:</b> ${special}</p>` : ""}`;
  if (!actor || !system.automation) return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: header });

  if (number(actor.system.resources.mp.value) < number(system.mpCost)) {
    ui.notifications.warn(game.i18n.format("LA.NotEnoughMP", { cost: number(system.mpCost) }));
    return null;
  }
  const targets = targetActors(item, actor);
  if (!targets.length && system.targetMode !== "none") {
    ui.notifications.warn(game.i18n.localize("LA.SelectSpellTargets"));
    return null;
  }

  let defensivePenalty = 0;
  let threatsCount = 0;
  const casterToken = actor.getActiveTokens(true, true)[0] ?? null;
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
    if (castDefensively) defensivePenalty = -5 * threatsCount;
  }

  await actor.update({ "system.resources.mp.value": number(actor.system.resources.mp.value) - number(system.mpCost) });
  const bonus = number(actor.system.skills?.spellcraft?.total);
  const roll = await (new Roll(`1d20 + (${bonus + defensivePenalty})`, actor.getRollData())).evaluate();
  const checkTotal = roll.total;
  const { tier, effects } = effectsForTier(system.automation, roll.total);
  const minimumDC = number(system.automation.minimumDC);
  const castSucceeded = roll.total >= minimumDC;
  const results = [];

  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${game.i18n.localize("LA.SpellcraftCheck")}: ${escapeHTML(item.name)} (${escapeHTML(system.school)})` });
  if (castSucceeded && effects.length) {
    for (const { actor: target } of targets) {
      for (const effect of effects) await applySpellEffect(effect, target, actor, item, checkTotal, results);
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
  const content = `${header}<p><b>${game.i18n.localize("LA.ManaSpent")}:</b> ${number(system.mpCost)} MP · <b>${game.i18n.localize("LA.Targets")}:</b> ${targetLabel}</p><p class="la-result ${castSucceeded ? "success" : "failure"}">${tierLabel} (${roll.total}; ${game.i18n.localize("LA.Spellcraft")} ${signed(defensivePenalty)})</p>${meleeHint}${effectsHtml}`;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

export async function rollSpell(item) {
  return showSpellCard(item, item.parent);
}
