const SYSTEM_ID = "last-arc-analogue";

export const RULE_STATUS_EFFECTS = [
  ["blinded", "StatusBlind", "icons/svg/blind.svg"],
  ["confused", "StatusConfusion", "icons/svg/terror.svg"],
  ["agony", "StatusAgony", "icons/svg/skull.svg"],
  ["exhaustion", "StatusExhaustion", "icons/svg/downgrade.svg"],
  ["misfortune", "StatusMisfortune", "icons/svg/d20-black.svg"],
  ["withering", "StatusWithering", "icons/svg/blood.svg"],
  ["dim", "StatusDim", "icons/svg/light.svg"],
  ["doom", "StatusDoom", "icons/svg/death.svg"],
  ["diseased", "StatusDisease", "icons/svg/biohazard.svg"],
  ["drenched", "StatusDrench", "icons/svg/waterfall.svg"],
  ["oiled", "StatusOil", "icons/svg/poison.svg"],
  ["paralysed", "StatusParalysis", "icons/svg/paralysis.svg"],
  ["petrified", "StatusPetrify", "icons/svg/stone.svg"],
  ["poisoned", "StatusPoison", "icons/svg/poison.svg"],
  ["silenced", "StatusSilence", "icons/svg/deaf.svg"],
  ["sleeping", "StatusSleep", "icons/svg/sleep.svg"],
  ["slowed", "StatusSlow", "icons/svg/clockwork.svg"],
  ["toad", "StatusToad", "icons/svg/frog.svg"],
  ["zombified", "StatusZombify", "icons/svg/skull.svg"]
].map(([id, label, img]) => ({ id, label, img }));

const ALIASES = {
  blind: "blinded", blindness: "blinded", confusion: "confused", disease: "diseased", drench: "drenched",
  oil: "oiled", paralysis: "paralysed", petrify: "petrified", poison: "poisoned", silence: "silenced",
  sleep: "sleeping", slow: "slowed", zombify: "zombified"
};
export const canonicalRuleStatus = value => {
  const key = String(value ?? "").toLowerCase().replace(/[\s_-]/g, "");
  return ALIASES[key] ?? key;
};
const localize = key => game.i18n.localize(`LA.${key}`);
const statusForEffect = effect => canonicalRuleStatus(effect.getFlag(SYSTEM_ID, "ruleStatus")
  ?? effect.getFlag(SYSTEM_ID, "condition")
  ?? [...(effect.statuses ?? [])][0]);

export function actorHasStatus(actor, status) {
  const expected = canonicalRuleStatus(status);
  return Boolean(actor?.effects?.some(effect => statusForEffect(effect) === expected));
}

export function statusEffectList(actor) {
  return [...(actor?.effects ?? [])].map(effect => ({ effect, status: statusForEffect(effect) })).filter(entry => entry.status);
}

export function registerRuleStatusEffects() {
  const effects = CONFIG.statusEffects ?? [];
  const known = new Set(effects.map(effect => effect.id));
  CONFIG.statusEffects = [...effects, ...RULE_STATUS_EFFECTS.filter(effect => !known.has(effect.id)).map(effect => ({
    id: effect.id, name: `LA.${effect.label}`, img: effect.img
  }))];

  let lastTurnByCombat = new Map();
  Hooks.on("updateCombat", async (combat, changed) => {
    if (!game.user?.isGM || (!Object.prototype.hasOwnProperty.call(changed, "turn") && !Object.prototype.hasOwnProperty.call(changed, "round"))) return;
    const current = combat.combatant;
    if (!current) return;
    const last = lastTurnByCombat.get(combat.id);
    const turnKey = `${combat.round}:${combat.turn}:${current.id}`;
    if (last && last.turnKey !== turnKey) await processEndTurn(combat.combatants.get(last.combatantId)?.actor, combat);
    if (!last || last.turnKey !== turnKey) await processStartTurn(current.actor, combat);
    lastTurnByCombat.set(combat.id, { combatantId: current.id, turnKey });
  });
  Hooks.on("deleteCombat", combat => lastTurnByCombat.delete(combat.id));
  Hooks.on("createActiveEffect", effect => {
    if (!game.user?.isGM || statusForEffect(effect) !== "doom" || effect.getFlag(SYSTEM_ID, "statusData.doomTurnsRemaining")) return;
    initializeDoom(effect).catch(error => console.error("Last Arc | Could not initialize Doom", error));
  });
  Hooks.on("preUpdateToken", (token, changes) => {
    if (changes.x === undefined && changes.y === undefined) return;
    if (!actorHasStatus(token.actor, "petrified")) return;
    ui.notifications.warn(localize("StatusCannotMovePetrified"));
    return false;
  });
}

async function initializeDoom(effect) {
  const roll = await new Roll("1d4 + 1").evaluate();
  await effect.setFlag(SYSTEM_ID, "statusData.doomTurnsRemaining", roll.total);
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: effect.parent }), flavor: `${effect.name}: ${localize("StatusDoomCountdown")}` });
}

export async function createRuleStatus(actor, status, { origin = actor?.uuid, sourceName = "", data = {}, changes = [], duration = {}, flags = {} } = {}) {
  if (!actor?.createEmbeddedDocuments) return null;
  const id = canonicalRuleStatus(status);
  const definition = RULE_STATUS_EFFECTS.find(effect => effect.id === id);
  if (!definition) return null;
  const existing = statusEffectList(actor).filter(entry => entry.status === id).map(entry => entry.effect);
  if (existing.length) await actor.deleteEmbeddedDocuments("ActiveEffect", existing.map(effect => effect.id));
  const statusData = { ...data };
  if (id === "doom" && !Number.isFinite(Number(statusData.doomTurnsRemaining))) {
    const roll = await new Roll("1d4 + 1").evaluate();
    statusData.doomTurnsRemaining = roll.total;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${localize(definition.label)}: ${localize("StatusDoomCountdown")}` });
  }
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: sourceName ? `${sourceName}: ${localize(definition.label)}` : localize(definition.label),
    img: definition.img, origin, changes, duration, disabled: false, statuses: [id],
    flags: { [SYSTEM_ID]: { ...flags, ruleStatus: id, condition: id, statusData } }
  }]);
  if (id === "withering") {
    const hp = actor.system.resources?.hp;
    const cap = Math.floor(Number(hp?.baseMax ?? hp?.max ?? 0) / 2);
    if (hp && Number(hp.value) > cap) await actor.update({ "system.resources.hp.value": cap });
  }
  if (id === "dim") {
    const mp = actor.system.resources?.mp;
    const cap = Math.floor(Number(mp?.max ?? 0) / 2);
    if (mp && Number(mp.value) > cap) await actor.update({ "system.resources.mp.value": cap });
  }
  return effect;
}

export function actionBlockReason(actor, { kind = "", skillKey = "", item = null } = {}) {
  if (!actor) return "";
  if (actorHasStatus(actor, "petrified") || actorHasStatus(actor, "sleeping")) return localize("StatusCannotAct");
  const paralysed = statusEffectList(actor).some(({ status, effect }) => status === "paralysed" && effect.getFlag(SYSTEM_ID, "statusData.paralysisThisTurn"));
  if (paralysed) return localize("StatusParalysisBlocksAction");
  if (actorHasStatus(actor, "silenced") && (["spell", "performance"].includes(item?.type)
    || (kind === "skill" && /spellcraft|perform|persuasion|oratory|instrument/.test(skillKey)))) return localize("StatusSilenceBlocksAction");
  if (actorHasStatus(actor, "toad") && item && ["spell", "performance", "technick", "talent", "feature", "class", "advanced-class"].includes(item.type)) return localize("StatusToadBlocksAbility");
  if (actorHasStatus(actor, "toad") && item && ["armor", "equipment"].includes(item.type)) return localize("StatusToadBlocksAbility");
  if (actorHasStatus(actor, "toad") && item?.type === "weapon" && !["natural", "unarmed"].includes(String(item.system?.weaponGroup ?? "").toLowerCase())) return localize("StatusToadBlocksAbility");
  const confused = statusEffectList(actor).find(({ status, effect }) => status === "confused" && effect.getFlag(SYSTEM_ID, "statusData.confusionTargetTokenId"));
  if (confused && item && item.type !== "weapon") return localize("StatusConfusionMustAttack");
  if (confused && item?.type === "weapon") {
    const requiredTokenId = confused.effect.getFlag(SYSTEM_ID, "statusData.confusionTargetTokenId");
    const markedTargets = [...(game.user?.targets ?? [])];
    if (requiredTokenId && !markedTargets.some(token => token.id === requiredTokenId)) return localize("StatusConfusionTargetOnly");
  }
  return "";
}

export function statusRollFormula(actor, formula, { eligible = true } = {}) {
  if (!eligible || !actorHasStatus(actor, "misfortune")) return formula;
  return String(formula).replace(/(?<![\w])1d20(?!\d)/i, "2d20kl");
}

export function statusAttackPenalty(actor) {
  return actorHasStatus(actor, "toad") ? -10 : 0;
}

export function statusDefencePenalty(actor) {
  return (actorHasStatus(actor, "exhaustion") ? 10 : 0) + (actorHasStatus(actor, "toad") ? 10 : 0);
}

export function statusSkillPenalty(actor, key) {
  const slow = actorHasStatus(actor, "slowed") && ["acrobatics", "athletics"].includes(key) ? -10 : 0;
  return slow + (actorHasStatus(actor, "toad") ? -10 : 0);
}

export function statusHealingCap(actor) {
  const hp = actor?.system?.resources?.hp;
  if (!hp) return Infinity;
  let cap = Number(hp.max) || 0;
  if (actorHasStatus(actor, "withering")) cap = Math.min(cap, Math.floor(Number(hp.baseMax ?? hp.max) / 2));
  if (actorHasStatus(actor, "diseased")) cap = Math.min(cap, Number(hp.value) || 0);
  return cap;
}

export function statusManaCap(actor) {
  const mp = actor?.system?.resources?.mp;
  if (!mp) return Infinity;
  return actorHasStatus(actor, "dim") ? Math.min(Number(mp.max) || 0, Math.floor((Number(mp.baseMax) || Number(mp.max) || 0) / 2)) : Number(mp.max) || 0;
}

export async function wakeFromDamage(actor, type = "") {
  if (String(type).toLowerCase() === "poison") return false;
  const sleeping = statusEffectList(actor).filter(entry => entry.status === "sleeping");
  if (!sleeping.length) return false;
  await actor.deleteEmbeddedDocuments("ActiveEffect", sleeping.map(entry => entry.effect.id));
  return true;
}

export async function breakConfusionOnAllyAttack(attacker, target, attackTotal) {
  if (!attacker || !target || !actorHasStatus(target, "confused")) return false;
  const attackerToken = attacker.getActiveTokens(false, false)[0];
  const targetToken = target.getActiveTokens(false, false)[0];
  if (!attackerToken || !targetToken || attackerToken.document.disposition !== targetToken.document.disposition) return false;
  const ref = Number(target.system.defences?.ref?.total ?? 10);
  const will = Number(target.system.defences?.will?.total ?? 10);
  if (Number(attackTotal) <= ref || Number(attackTotal) <= will) return false;
  const effects = statusEffectList(target).filter(entry => entry.status === "confused").map(entry => entry.effect.id);
  if (!effects.length) return false;
  await target.deleteEmbeddedDocuments("ActiveEffect", effects);
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: target }), content: `<p>${localize("StatusConfusionBroken")}</p>` });
  return true;
}

async function processStartTurn(actor, combat) {
  if (!actor) return;
  for (const { status, effect } of statusEffectList(actor)) {
    if (status === "confused") {
      const roll = await new Roll("1d100").evaluate();
      if (roll.total <= 60) {
        const ownToken = actor.getActiveTokens(false, false)[0] ?? null;
        const allies = (canvas?.tokens?.placeables ?? []).filter(token => token.actor && token !== ownToken
          && ownToken && token.document.disposition === ownToken.document.disposition);
        const target = allies.sort((a, b) => canvas.grid.measureDistance(ownToken.center, a.center) - canvas.grid.measureDistance(ownToken.center, b.center))[0] ?? ownToken;
        const data = { ...(effect.getFlag(SYSTEM_ID, "statusData") ?? {}), confusionTargetTokenId: target?.id ?? "", confusionTurn: `${combat.round}:${combat.turn}` };
        await effect.setFlag(SYSTEM_ID, "statusData", data);
        target?.setTarget(true, { releaseOthers: false });
        await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${localize("StatusConfusionTurn")}: ${target?.name ?? actor.name}` });
      } else {
        const data = { ...(effect.getFlag(SYSTEM_ID, "statusData") ?? {}), confusionTargetTokenId: "", confusionTurn: `${combat.round}:${combat.turn}` };
        await effect.setFlag(SYSTEM_ID, "statusData", data);
        await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: localize("StatusConfusionClearTurn") });
      }
    }
    if (status === "paralysed") {
      const roll = await new Roll("1d100").evaluate();
      const blocked = roll.total <= 25;
      await effect.setFlag(SYSTEM_ID, "statusData.paralysisThisTurn", blocked);
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: localize(blocked ? "StatusParalysisBlocksAction" : "StatusParalysisNoEffect") });
    }
    if (status === "poisoned") {
      const bonus = Number(effect.getFlag(SYSTEM_ID, "statusData.poisonAttackBonus") ?? 0);
      const check = await (new Roll(`1d20 + (${bonus})`)).evaluate();
      const defence = Number(actor.system.defences?.fort?.total ?? 10);
      const failed = check.total <= defence;
      const failures = failed ? Number(effect.getFlag(SYSTEM_ID, "statusData.poisonConsecutiveFailures") ?? 0) + 1 : 0;
      await check.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${localize("StatusPoisonCheck")}: ${check.total} vs Fort ${defence} (${failures}/2)` });
      if (failures >= 2) await effect.delete();
      else await effect.setFlag(SYSTEM_ID, "statusData.poisonConsecutiveFailures", failures);
    }
  }
}

async function processEndTurn(actor) {
  if (!actor) return;
  for (const { status, effect } of statusEffectList(actor)) {
    if (["drenched", "oiled", "sleeping"].includes(status)) {
      const roll = await new Roll("1d100").evaluate();
      const removed = roll.total <= 25;
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${effect.name}: ${roll.total} — ${localize(removed ? "StatusExpired" : "StatusPersists")}` });
      if (removed) await effect.delete();
    }
    if (status === "doom") {
      const remaining = Math.max(0, Number(effect.getFlag(SYSTEM_ID, "statusData.doomTurnsRemaining") ?? 1) - 1);
      if (remaining <= 0) {
        await actor.update({ "system.resources.hp.value": 0, "system.combat.breakGauge": 5, "system.combat.dead": true });
        await effect.delete();
        await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p><strong>${localize("StatusDoomDeath")}</strong></p>` });
      } else {
        await effect.setFlag(SYSTEM_ID, "statusData.doomTurnsRemaining", remaining);
        await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p>${localize("StatusDoomRemaining")}: ${remaining}</p>` });
      }
    }
    if (status === "confused") await effect.setFlag(SYSTEM_ID, "statusData.confusionTargetTokenId", "");
  }
}
