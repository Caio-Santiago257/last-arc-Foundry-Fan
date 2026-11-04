const escapeHTML = value => foundry.utils.escapeHTML(String(value ?? ""));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const signature = item => item.system.automation ?? {};
const activeData = effect => effect.getFlag("last-arc-analogue", "performanceEffect");
const activePlaceableToken = actor => actor.getActiveTokens(false, false)[0] ?? null;
const combatActors = combat => new Set([
  ...combat.combatants.map(combatant => combatant.actor),
  ...(game.actors?.contents ?? []),
  ...(canvas?.tokens?.placeables ?? []).map(token => token.actor)
].filter(Boolean));

Hooks.on("updateCombat", async (combat, changed) => {
  if (!game.user?.isGM || !("turn" in changed || "round" in changed)) return;
  const current = combat.combatant;
  if (!current) return;
  const expired = new Map();
  for (const actor of combatActors(combat)) {
    for (const effect of actor.effects) {
      const timing = activeData(effect)?.expiresAfter;
      if (!timing || timing.combatId !== combat.id || timing.combatantId !== current.id) continue;
      if (combat.round < timing.round || (combat.round === timing.round && combat.turn <= timing.turn)) continue;
      expired.set(actor, [...(expired.get(actor) ?? []), effect.id]);
    }
  }
  for (const [actor, ids] of expired) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
});

Hooks.on("deleteCombat", async combat => {
  if (!game.user?.isGM) return;
  for (const actor of combatActors(combat)) {
    const ids = actor.effects.filter(effect => activeData(effect)?.expiresAfter?.combatId === combat.id).map(effect => effect.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
});

function selectedTokens() {
  // Foundry keeps targeted tokens and controlled tokens in separate sets.
  // Accept either interaction so players can choose recipients in the usual
  // way without needing to press the target hotkey first.
  const tokens = [...(game.user?.targets ?? []), ...(canvas?.tokens?.controlled ?? [])];
  return [...new Map(tokens.filter(token => token.actor).map(token => [token.id, token])).values()];
}

function tierFor(automation, total) {
  const tiers = [...(automation.tiers ?? [])].sort((a, b) => number(a.dc) - number(b.dc));
  const tier = tiers.filter(entry => total >= number(entry.dc)).at(-1) ?? null;
  return { tier, effects: tier?.effects ?? automation.effects ?? [] };
}

function defenceTotal(actor, key) {
  const defence = actor.system.defences?.[key];
  const flags = [...actor.effects].map(activeData).filter(Boolean);
  const replacement = Math.max(0, ...flags.map(flag => number(flag.substituteDefence?.[key])));
  return Math.max(number(defence?.total, 10), replacement);
}

async function threatenedCast(actor) {
  const casterToken = activePlaceableToken(actor);
  const bladeDancer = actor.items.find(item => item.type === "advanced-class" && item.name === "Blade Dancer" && number(item.system.classLevel) >= 2);
  const chooseStyle = async () => new Promise(resolve => new Dialog({
    title: game.i18n.localize("LA.PerformanceStyle"),
    content: `<form><label>${game.i18n.localize("LA.PerformanceStyle")}<select name="style"><option value="dance">${game.i18n.localize("LA.PerformDance")}</option><option value="instrument">${game.i18n.localize("LA.PerformInstrument")}</option><option value="oratory">${game.i18n.localize("LA.PerformOratory")}</option></select></label></form>`,
    buttons: { choose: { label: game.i18n.localize("LA.Continue"), callback: html => resolve(html.find('[name="style"]').val()) }, cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) } },
    default: "choose", close: () => resolve(null)
  }).render(true));
  if (!casterToken || !canvas?.scene) {
    const style = bladeDancer ? await chooseStyle() : "instrument";
    return style ? { penalty: 0, defensive: false, warning: "", style } : null;
  }
  const threats = canvas.tokens.placeables.filter(token => token !== casterToken
    && token.document.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE
    && canvas.grid.measureDistance(casterToken.center, token.center) <= 1).length;
  if (!threats) {
    const style = bladeDancer ? await chooseStyle() : "instrument";
    return style ? { penalty: 0, defensive: false, warning: "", style } : null;
  }
  const answer = await new Promise(resolve => new Dialog({
    title: game.i18n.localize("LA.PerformingInMelee"),
    content: `<form><p>${game.i18n.format("LA.PerformThreatenedHint", { count: threats })}</p><label>${game.i18n.localize("LA.PerformanceStyle")}<select name="style"><option value="instrument">${game.i18n.localize("LA.PerformInstrument")}</option><option value="dance" ${bladeDancer ? "selected" : ""}>${game.i18n.localize("LA.PerformDance")}</option><option value="oratory">${game.i18n.localize("LA.PerformOratory")}</option></select></label></form>`,
    buttons: {
      defensive: { label: game.i18n.localize("LA.PerformDefensively"), callback: html => resolve({ defensive: true, style: html.find('[name="style"]').val() }) },
      normal: { label: game.i18n.localize("LA.PerformNormally"), callback: html => resolve({ defensive: false, style: html.find('[name="style"]').val() }) },
      cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
    },
    default: "defensive", close: () => resolve(null)
  }).render(true));
  if (!answer) return null;
  const warDance = bladeDancer?.system.classFeatures?.some(feature => feature.name === "War Dance");
  const troubadour = actor.items.some(item => item.type === "advanced-class" && item.name === "Troubador" && number(item.system.classLevel) > 0);
  const threatsForPenalty = answer.style === "instrument" && troubadour ? 1 : threats;
  const perThreat = answer.defensive && !(answer.style === "dance" && warDance) ? (answer.style === "instrument" ? -5 : -2) : 0;
  return {
    penalty: perThreat * threatsForPenalty,
    defensive: answer.defensive,
    warning: answer.defensive ? "" : game.i18n.format("LA.PerformCounterattackHint", { count: threats }),
    style: answer.style
  };
}

async function applyDosado(performer, performance, style) {
  if (style !== "dance") return;
  const dancer = performer.items.find(item => item.type === "advanced-class" && item.name === "Blade Dancer" && number(item.system.classLevel) >= 2);
  if (!dancer) return;
  const bonus = Math.floor(number(dancer.system.classLevel) / 2);
  const combat = game.combat;
  const token = activePlaceableToken(performer);
  const combatant = combat?.combatants.find(entry => entry.actorId === performer.id && (!token || entry.tokenId === token.id));
  const expiresAfter = combatant ? { combatId: combat.id, combatantId: combatant.id, round: combat.round, turn: combat.turn } : null;
  const prior = performer.effects.filter(effect => effect.getFlag("last-arc-analogue", "classFeature") === "Dosado");
  if (prior.length) await performer.deleteEmbeddedDocuments("ActiveEffect", prior.map(effect => effect.id));
  await performer.createEmbeddedDocuments("ActiveEffect", [{
    name: `Dosado (+${bonus})`, img: "icons/svg/aura.svg", disabled: false, duration: {}, changes: [],
    flags: { "last-arc-analogue": { classFeature: "Dosado", performanceEffect: { side: "self", defenceBonuses: { fort: bonus, will: bonus }, description: `+${bonus} Fortitude and Will Defence until the start of the blade dancer's next turn.`, expiresAfter } } }
  }]);
}

function conditionBonuses(effect) {
  const bonuses = {};
  if (effect.type === "buff") {
    Object.assign(bonuses, effect.bonuses ?? {});
  } else if (effect.type === "debuff") {
    if (effect.defence === "all") bonuses.defenceBonuses = { fort: effect.value, ref: effect.value, will: effect.value };
    else if (effect.defence === "attacksAndSkills") {
      bonuses.skillBonus = { allExcept: [], value: effect.value };
      bonuses.attackBonus = effect.value;
    } else bonuses.defenceBonuses = { [effect.defence]: effect.value };
  }
  return bonuses;
}

function effectSummary(effect) {
  const bonuses = conditionBonuses(effect);
  if (effect.type === "damage") return `${effect.formula} ${game.i18n.localize("LA.Unaspected")} ${game.i18n.localize("LA.Damage")}`;
  if (effect.type === "mpDamage") return `${effect.formula} MP ${game.i18n.localize("LA.Lost")}`;
  if (effect.type === "debuff" && effect.defence === "all") return game.i18n.localize("LA.PerformanceAllDefencesMinusTwo");
  if (effect.type === "debuff" && effect.defence === "attacksAndSkills") return game.i18n.localize("LA.PerformanceAttacksSkillsMinusTwo");
  if (bonuses.damageDice) return `+1d${bonuses.damageDice.die} ${game.i18n.localize(bonuses.damageDice.weaponMode === "ranged" ? "LA.RangedDamage" : "LA.MeleeDamage")}`;
  if (bonuses.weaponSkillBonus) return `${bonuses.weaponSkillBonus >= 0 ? "+" : ""}${bonuses.weaponSkillBonus} ${game.i18n.localize("LA.WeaponSkills")}`;
  if (bonuses.skillBonus?.value) return `${bonuses.skillBonus.value >= 0 ? "+" : ""}${bonuses.skillBonus.value} ${game.i18n.localize("LA.EligibleSkillChecks")}`;
  if (bonuses.skillBonuses?.spellcraft) return `${bonuses.skillBonuses.spellcraft >= 0 ? "+" : ""}${bonuses.skillBonuses.spellcraft} ${game.i18n.localize("LA.Spellcraft")}`;
  if (bonuses.spellDefenceBonuses?.ref) return `${bonuses.spellDefenceBonuses.ref >= 0 ? "+" : ""}${bonuses.spellDefenceBonuses.ref} ${game.i18n.localize("LA.Reflex")} ${game.i18n.localize("LA.AgainstSpells")}`;
  if (bonuses.defenceBonuses?.fort) return `${bonuses.defenceBonuses.fort >= 0 ? "+" : ""}${bonuses.defenceBonuses.fort} ${game.i18n.localize("LA.Fortitude")}`;
  if (bonuses.defenceBonuses?.ref) return `${bonuses.defenceBonuses.ref >= 0 ? "+" : ""}${bonuses.defenceBonuses.ref} ${game.i18n.localize("LA.Reflex")} ${game.i18n.localize("LA.Defence")}`;
  if (bonuses.defenceBonuses?.will) return `${bonuses.defenceBonuses.will >= 0 ? "+" : ""}${bonuses.defenceBonuses.will} ${game.i18n.localize("LA.Will")}`;
  if (bonuses.substituteDefence?.will) return game.i18n.localize("LA.UsePerformAsWill");
  if (bonuses.substituteDefence?.fort) return game.i18n.localize("LA.UsePerformAsFort");
  return game.i18n.localize("LA.PerformanceEffectSummary");
}

async function applyPerformanceEffect(effect, target, performer, performance, performTotal, side) {
  if (effect.resistBy && performTotal <= defenceTotal(target, effect.resistBy)) return { resisted: true };

  if (["damage", "mpDamage"].includes(effect.type)) {
    const roll = await (new Roll(effect.formula, { ...performer.getRollData(), level: performer.system.details.level })).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: performer }), flavor: `${escapeHTML(performance.name)} — ${escapeHTML(target.name)} (${escapeHTML(effect.formula)})` });
    if (effect.type === "damage") {
      const applied = await target.applyDamage(roll.total, { type: "unaspected" });
      await addPerformanceImmunity(target, performer, performance, side);
      return { result: `${target.name}: ${applied} ${game.i18n.localize("LA.Damage")}` };
    }
    const mp = target.system.resources?.mp ?? { value: 0, max: 0 };
    const lost = Math.min(number(mp.value), Math.max(0, Math.floor(roll.total)));
    await target.update({ "system.resources.mp.value": number(mp.value) - lost });
    await addPerformanceImmunity(target, performer, performance, side);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: performer }), content: `<p><strong>${escapeHTML(target.name)}:</strong> ${lost} MP ${game.i18n.localize("LA.Lost")} (${number(mp.value) - lost}/${mp.max}).</p>` });
    return { result: `${target.name}: ${lost} MP ${game.i18n.localize("LA.Lost")}` };
  }

  const bonuses = conditionBonuses(effect);
  const replaceOtherPerformances = !signature(performance).doesNotEndOtherPerformances;
  if (replaceOtherPerformances) {
    const old = target.effects.filter(active => {
      const data = activeData(active);
      return data && !data.immunity && data.side === side;
    });
    if (old.length) await target.deleteEmbeddedDocuments("ActiveEffect", old.map(active => active.id));
  }
  const combat = game.combat;
  const performerToken = activePlaceableToken(performer);
  const performerCombatant = combat?.combatants.find(combatant => combatant.actorId === performer.id && (!performerToken || combatant.tokenId === performerToken.id));
  const expiresAfter = performerCombatant ? { combatId: combat.id, combatantId: performerCombatant.id, round: combat.round, turn: combat.turn } : null;
  const duration = {};
  const flags = {
    "last-arc-analogue": {
      performanceEffect: {
        performanceName: performance.name,
        side,
        performerActorId: performer.id,
        performerTokenId: performerToken?.id ?? "",
        expiresAfter,
        performTotal,
        description: `${performance.system.description} ${effectSummary(effect)}${performance.system.specialRules ? ` ${performance.system.specialRules}` : ""}`,
        ...bonuses
      }
    }
  };
  const documents = [{
    name: `${performance.name} (${performTotal})`,
    img: "icons/svg/aura.svg",
    origin: performance.uuid,
    disabled: false,
    duration,
    changes: [],
    flags
  }];
  if (signature(performance).immuneUntilNextTurn) documents.push({
    name: `${game.i18n.localize("LA.PerformanceImmunity")}: ${performance.name}`,
    img: "icons/svg/shield.svg",
    origin: performance.uuid,
    disabled: false,
    duration,
    changes: [],
    flags: { "last-arc-analogue": { performanceEffect: { performanceName: performance.name, side, immunity: true, expiresAfter, description: game.i18n.localize("LA.PerformanceImmunityHint") } } }
  });
  await target.createEmbeddedDocuments("ActiveEffect", documents);
  return { result: `${target.name}: ${performance.name} — ${effectSummary(effect)}` };
}

async function addPerformanceImmunity(target, performer, performance, side) {
  if (!signature(performance).immuneUntilNextTurn) return;
  const combat = game.combat;
  const performerToken = activePlaceableToken(performer);
  const combatant = combat?.combatants.find(entry => entry.actorId === performer.id && (!performerToken || entry.tokenId === performerToken.id));
  const expiresAfter = combatant ? { combatId: combat.id, combatantId: combatant.id, round: combat.round, turn: combat.turn } : null;
  await target.createEmbeddedDocuments("ActiveEffect", [{
    name: `${game.i18n.localize("LA.PerformanceImmunity")}: ${performance.name}`,
    img: "icons/svg/shield.svg",
    origin: performance.uuid,
    disabled: false,
    duration: {},
    changes: [],
    flags: { "last-arc-analogue": { performanceEffect: { performanceName: performance.name, side, immunity: true, expiresAfter, description: game.i18n.localize("LA.PerformanceImmunityHint") } } }
  }]);
}

async function perform(item, performer) {
  if (!performer || !item.system.automation) {
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: performer }), content: `<h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.system.description)}</p>` });
  }
  const tokens = selectedTokens();
  if (!tokens.length) {
    ui.notifications.warn(game.i18n.localize("LA.SelectPerformanceTargets"));
    return null;
  }
  const sourceToken = activePlaceableToken(performer);
  const side = item.system.targetSide === "ally" ? "ally" : "enemy";
  const valid = tokens.filter(token => !sourceToken || (side === "ally"
    ? token.document.disposition === sourceToken.document.disposition
    : token.document.disposition !== sourceToken.document.disposition));
  if (!valid.length) {
    ui.notifications.warn(game.i18n.localize(side === "ally" ? "LA.SelectPerformanceAllies" : "LA.SelectPerformanceEnemies"));
    return null;
  }
  const melee = await threatenedCast(performer);
  if (!melee) return null;
  const performBonus = number(performer.system.skills?.perform?.total);
  const check = await (new Roll(`1d20 + (${performBonus + melee.penalty})`, performer.getRollData())).evaluate();
  await check.toMessage({ speaker: ChatMessage.getSpeaker({ actor: performer }), flavor: `${game.i18n.localize("LA.PerformCheck")}: ${escapeHTML(item.name)} (${escapeHTML(item.system.targetSide)})` });

  const { tier, effects } = tierFor(item.system.automation, check.total);
  const minimum = number(item.system.automation.minimumDC);
  const succeeded = check.total >= minimum;
  const results = [];
  let affectedEnemy = false;
  const immunity = signature(item).immuneUntilNextTurn;
  if (succeeded) {
    for (const token of valid) {
      const target = token.actor;
      if (immunity && target.effects.some(effect => activeData(effect)?.immunity && activeData(effect)?.performanceName === item.name)) {
        results.push(`${target.name}: ${game.i18n.localize("LA.PerformanceImmune")}`);
        continue;
      }
      for (const effect of effects) {
        const result = await applyPerformanceEffect(effect, target, performer, item, check.total, side);
        if (result.resisted) results.push(`${target.name}: ${game.i18n.localize("LA.PerformanceResisted")}`);
        else if (result.result) { results.push(result.result); if (side === "enemy") affectedEnemy = true; }
      }
    }
    if (affectedEnemy) await applyDosado(performer, item, melee.style);
  }
  const label = tier ? `${game.i18n.localize("LA.PerformanceTier")}: ${tier.dc}` : succeeded ? game.i18n.localize("LA.PerformanceNoTier") : `${game.i18n.localize("LA.PerformanceFailed")}: ${minimum}+`;
  const sideLabel = game.i18n.localize(side === "ally" ? "LA.Allies" : "LA.Enemies");
  const body = results.length ? `<ul>${results.map(result => `<li>${escapeHTML(result)}</li>`).join("")}</ul>`
    : !succeeded ? `<p>${game.i18n.localize("LA.PerformanceNoEffect")}</p>` : `<p>${game.i18n.localize("LA.PerformanceManualEffect")}</p>`;
  const meleeWarning = melee.warning ? `<p>${escapeHTML(melee.warning)}</p>` : "";
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: performer }),
    content: `<h3>${escapeHTML(item.name)}</h3><p><b>${escapeHTML(sideLabel)}</b> · ${valid.map(token => escapeHTML(token.name)).join(", ")}</p><p class="la-result ${succeeded ? "success" : "failure"}">${label} (${check.total}; ${game.i18n.localize("LA.Perform")} ${melee.penalty >= 0 ? "+" : ""}${melee.penalty})</p>${meleeWarning}${body}`
  });
}

export function rollPerformance(item) {
  return perform(item, item.parent);
}
