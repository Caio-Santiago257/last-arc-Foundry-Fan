import { postDamageRoll } from "./damage-chat.mjs";
import { createRuleStatus } from "./status-effects.mjs";
import { actionBlockReason } from "./status-effects.mjs";

const SYSTEM_ID = "last-arc-analogue";
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const escape = value => foundry.utils.escapeHTML(String(value ?? ""));

function levelDamage(item, level) {
  const tiers = item.system.damageByLevel ?? {};
  if (level >= 15 && tiers[15]) return tiers[15];
  if (level >= 10 && tiers[10]) return tiers[10];
  return tiers.base ?? "";
}

function activeTargets() {
  return [...(game.user?.targets ?? [])].filter(token => token?.actor);
}

export async function studyLastResortRelic(relic, actor = relic?.parent) {
  if (!actor || actor.type !== "character") return ui.notifications.warn(game.i18n.localize("LA.LastResortCharacterOnly"));
  const lastResortId = relic.system.relic?.lastResortId;
  const power = game.items?.find(item => item.type === "last-resort" && item.name === lastResortId)
    ?? (await game.packs.get(`${SYSTEM_ID}.last-resorts`)?.getDocuments())?.find(item => item.name === lastResortId);
  if (!power) return ui.notifications.error(game.i18n.format("LA.LastResortMissingPower", { name: lastResortId ?? relic.name }));
  const level = Math.floor(number(actor.system.details.level, 1));
  const capacity = Math.min(3, Math.floor(level / 5));
  if (!capacity) return ui.notifications.warn(game.i18n.localize("LA.LastResortLevelFive"));
  if (actor.items.some(item => item.type === "last-resort" && item.name === power.name)) return ui.notifications.warn(game.i18n.localize("LA.LastResortAlreadyKnown"));
  const tree = String(power.system.tree ?? "").toLowerCase();
  const talentFound = actor.items.some(item => item.type === "talent" && String(item.system.tree ?? "").toLowerCase() === tree);
  if (!talentFound) return ui.notifications.warn(game.i18n.format("LA.LastResortTreeRequired", { tree: power.system.tree }));

  const known = actor.items.filter(item => item.type === "last-resort");
  const intMod = number(actor.system.attributes?.int?.modifier);
  const studyHours = Math.max(1, number(relic.system.relic?.studyHoursBase, 8) + intMod);
  let replaceId = "";
  if (known.length >= capacity) {
    const options = known.map(item => `<option value="${escape(item.id)}">${escape(item.name)}</option>`).join("");
    replaceId = await new Promise(resolve => new Dialog({
      title: game.i18n.localize("LA.ReplaceLastResort"),
      content: `<form><p>${game.i18n.format("LA.LastResortReplaceHint", { name: escape(power.name), hours: studyHours })}</p><label>${game.i18n.localize("LA.ReplaceLastResort")}<select name="replace">${options}</select></label></form>`,
      buttons: { study: { label: game.i18n.localize("LA.StudyRelic"), callback: html => resolve(html.find("[name=replace]").val()) }, cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) } },
      default: "study", close: () => resolve(null)
    }).render(true));
    if (!replaceId) return null;
  } else {
    const confirmed = await Dialog.confirm({ title: game.i18n.localize("LA.StudyRelic"), content: `<p>${game.i18n.format("LA.LastResortStudyHint", { name: escape(power.name), hours: studyHours })}</p>` });
    if (!confirmed) return null;
  }

  if (replaceId) await actor.deleteEmbeddedDocuments("Item", [replaceId]);
  const data = power.toObject();
  delete data._id;
  data.system.learnedAtLevel = level;
  data.system.sourceRelic = relic.name;
  await actor.createEmbeddedDocuments("Item", [data]);
  if (number(relic.system.quantity, 1) > 1) await relic.update({ "system.quantity": number(relic.system.quantity, 1) - 1 });
  else await actor.deleteEmbeddedDocuments("Item", [relic.id]);
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<article class="la-last-resort-card"><h3>${escape(power.name)} learned</h3><p>${escape(power.system.description)}</p><small>${game.i18n.format("LA.LastResortStudyCompleted", { hours: studyHours })}</small></article>` });
  return power;
}

export async function useLastResort(actor, item, { bypassThreshold = false } = {}) {
  if (!actor || !item || actor.type !== "character") return ui.notifications.warn(game.i18n.localize("LA.LastResortCharacterOnly"));
  if (actor.system.combat?.dead || actor.system.combat?.unconscious) return ui.notifications.warn(game.i18n.localize("LA.CannotActUnconscious"));
  const blocked = actionBlockReason(actor, { item });
  if (blocked) return ui.notifications.warn(blocked);
  if (actor.system.combat?.lastResortUsed) return ui.notifications.warn(game.i18n.localize("LA.LastResortAlreadyUsed"));
  const hp = actor.system.resources?.hp ?? {};
  if (!bypassThreshold && number(hp.value) > number(hp.max) / 4) return ui.notifications.warn(game.i18n.localize("LA.LastResortQuarterHp"));

  const damageFormula = levelDamage(item, number(actor.system.details.level, 1));
  let damageType = item.system.damageType || "unaspected";
  if (item.name === "Aether Blast") {
    const chosen = await new Promise(resolve => new Dialog({
      title: item.name,
      content: `<form><label>${game.i18n.localize("LA.DamageType")}<select name="damageType"><option value="cold">${game.i18n.localize("LA.DamageCold")}</option><option value="electric">${game.i18n.localize("LA.DamageElectric")}</option><option value="fire">${game.i18n.localize("LA.DamageFire")}</option></select></label></form>`,
      buttons: { use: { label: game.i18n.localize("LA.UseLastResort"), callback: html => resolve(html.find("[name=damageType]").val()) }, cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) } },
      default: "use", close: () => resolve(null)
    }).render(true));
    if (!chosen) return null;
    damageType = chosen;
  }

  await actor.update({ "system.combat.lastResortUsed": true, "system.combat.recoveryMinorActions": 0 });
  const tokens = activeTargets();
  const level = number(actor.system.details.level, 1);
  let roll = null;
  let effectsApplied = 0;
  if (damageFormula) {
    roll = await (new Roll(damageFormula, actor.getRollData())).evaluate();
    const scaled = Math.max(0, Math.floor(roll.total));
    const targets = tokens.filter(token => token.actor !== actor);
    await postDamageRoll(roll, { speaker: ChatMessage.getSpeaker({ actor }), flavor: `${escape(item.name)} (${escape(damageFormula)} ${escape(damageType)})`, amount: scaled, type: damageType, targetTokens: targets });
  }

  const statusByPower = {
    "Catastrophe": ["drenched", "oiled"], "Dark Cloud": ["blinded"], "Forbidden Dance": [],
    "Profane Sabbath": ["doom"], "Great Escape": ["stunned", "prone"], "Last Lullaby": ["sleeping"],
    "Riot Blade": ["confused"], "Howling Moon": [], "Black Mass": ["zombified"],
    "Night Raid": ["sleeping"], "Livewire": ["confused"], "Foebreaker": ["slowed"],
    "Glory Hound": ["encumbered"], "Meteor Rain": ["encumbered"], "Arrowstorm": ["blinded"],
    "Greased Lightning": ["paralysed"], "Bloodbath": [], "Shatterpoint": ["prone"], "No Mercy": [],
    "Wildfire": [], "Meteor Dive": ["prone"], "Calamity Blast": [], "Blade Beam": [], "Ruination": ["prone"]
  };
  const statuses = statusByPower[item.name] ?? [];
  for (const token of tokens) {
    if (token.actor === actor) continue;
    if (["Armistice", "Great Revelation", "Mind Wrack", "Cold Steal", "Aether Blast", "Meteor Dive", "Soul Rend"].includes(item.name)) {
      const single = tokens.length === 1 || token === tokens[0];
      if (!single) continue;
    }
    if (item.name === "Mind Wrack") await token.actor.update({ "system.resources.mp.value": 0 });
    if (item.name === "Vandal Heart") await token.actor.update({ "system.combat.damageReduction": 0, "system.combat.baseDamageReduction": 0 });
    if (item.name === "No Mercy" || item.name === "Blood Reign") await token.actor.update({ "system.combat.breakGauge": Math.min(5, number(token.actor.system.combat.breakGauge) + (item.name === "Blood Reign" && level >= 15 ? 3 : item.name === "Blood Reign" && level >= 10 ? 2 : 1)) });
    if (item.name === "Great Revelation") await token.actor.createEmbeddedDocuments("ActiveEffect", [{ name: `${item.name}: defence/skill penalty`, img: item.img, changes: ["system.defences.fort.misc", "system.defences.ref.misc", "system.defences.will.misc", ...Object.keys(token.actor.system.skills ?? {}).map(key => `system.skills.${key}.misc`)].map(key => ({ key, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -10, priority: 20 })), duration: { rounds: 2 }, flags: { [SYSTEM_ID]: { lastResortEffect: true } } }]);
    if (statuses.length) for (const status of statuses) await createRuleStatus(token.actor, status, { sourceName: item.name, duration: { rounds: 2 } });
    effectsApplied++;
  }
  const allies = tokens.filter(token => token.actor === actor || token.document.disposition === actor.getActiveTokens()?.[0]?.document.disposition);
  for (const token of allies) {
    const target = token.actor;
    if (["Heaven's Light", "Heaven's Gate"].includes(item.name)) {
      const healing = item.name === "Heaven's Light" ? Math.floor(number(target.system.resources.hp.max) / 2) : Math.floor(number(target.system.resources.hp.max) / 4);
      await target.applyHealing?.(healing);
    }
    if (item.name === "Overtrance") await target.update({ "system.resources.mp.value": Math.min(number(target.system.resources.mp.max), number(target.system.resources.mp.value) + Math.floor(number(target.system.resources.mp.max) / 2)) });
    if (item.name === "Gasconade") {
      const hpTemp = level >= 15 ? 100 : level >= 10 ? 75 : 50;
      const mpTemp = level >= 15 ? 75 : level >= 10 ? 50 : 25;
      await target.update({ "system.resources.tempHp": Math.max(number(target.system.resources.tempHp), hpTemp), "system.resources.tempMp": Math.max(number(target.system.resources.tempMp), mpTemp) });
    }
  }
  const status = game.i18n.localize("LA.LastResortUseSummary");
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<article class="la-last-resort-card"><h3>${escape(item.name)}</h3><p>${escape(item.system.description)}</p><small>${status} · ${game.i18n.localize("LA.LastResortDailySpent")}</small></article>` });
  return roll;
}

export async function promptLastResort(actor) {
  const known = actor.items.filter(item => item.type === "last-resort");
  if (!known.length) return null;
  if (actor.system.combat?.lastResortUsed) return ui.notifications.warn(game.i18n.localize("LA.LastResortAlreadyUsed"));
  if (number(actor.system.resources?.hp?.value) > number(actor.system.resources?.hp?.max) / 4) return ui.notifications.warn(game.i18n.localize("LA.LastResortQuarterHp"));
  const options = known.map(item => `<option value="${escape(item.id)}">${escape(item.name)}</option>`).join("");
  const id = await new Promise(resolve => new Dialog({
    title: game.i18n.localize("LA.UseLastResort"),
    content: `<form><p>${game.i18n.localize("LA.LastResortUseHint")}</p><select name="lastResort">${options}</select></form>`,
    buttons: { use: { label: game.i18n.localize("LA.UseLastResort"), callback: html => resolve(html.find("[name=lastResort]").val()) }, cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) } },
    default: "use", close: () => resolve(null)
  }).render(true));
  const selected = actor.items.get(id);
  return selected ? useLastResort(actor, selected) : null;
}
