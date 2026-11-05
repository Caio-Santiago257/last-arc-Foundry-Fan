const SYSTEM_ID = "last-arc-analogue";

export const DAMAGE_TYPES = [
  { value: "blunt", label: "LA.DamageBlunt" },
  { value: "piercing", label: "LA.DamagePiercing" },
  { value: "slashing", label: "LA.DamageSlashing" },
  { value: "fire", label: "LA.DamageFire" },
  { value: "cold", label: "LA.DamageCold" },
  { value: "electric", label: "LA.DamageElectric" },
  { value: "dark", label: "LA.DamageDark" },
  { value: "holy", label: "LA.DamageHoly" },
  { value: "unaspected", label: "LA.DamageUnaspected" }
];

export async function postDamageRoll(roll, {
  speaker,
  flavor = "",
  amount = roll.total,
  type = "unaspected",
  bypassDR = false,
  resource = "hp",
  targetTokens = [],
  onApply = null
} = {}) {
  const targets = [...new Map(targetTokens.filter(Boolean).map(token => {
    const document = token.document ?? token;
    return [document.uuid ?? token.uuid ?? document.id, {
      tokenUuid: document.uuid ?? token.uuid ?? "",
      actorUuid: token.actor?.uuid ?? document.actor?.uuid ?? "",
      tokenId: document.id ?? token.id ?? "",
      actorId: token.actor?.id ?? document.actor?.id ?? "",
      sceneId: document.parent?.id ?? canvas?.scene?.id ?? "",
      aeonEntity: document.getFlag?.(SYSTEM_ID, "aeonEntity") ?? ""
    }];
  })).values()];
  return roll.toMessage({
    speaker,
    flavor,
    flags: {
      [SYSTEM_ID]: {
        damageApplication: {
          amount: Math.max(0, Math.floor(Number(amount) || 0)),
          type: String(type || "unaspected").toLowerCase(),
          bypassDR: Boolean(bypassDR),
          resource: resource === "mp" ? "mp" : "hp",
          targets,
          onApply,
          applied: false
        }
      }
    }
  });
}

function selectedTargets() {
  const controlled = [...(canvas?.tokens?.controlled ?? [])];
  const targets = [...(game.user?.targets ?? [])];
  return [...new Map([...controlled, ...targets].filter(token => token.actor).map(token => [token.document.uuid, token])).values()];
}

async function resolveRecordedTargets(records) {
  const resolved = [];
  for (const record of records ?? []) {
    let token = canvas?.scene?.id === record.sceneId ? canvas.tokens.get(record.tokenId) : null;
    if (!token && record.tokenUuid) token = await fromUuid(record.tokenUuid).catch(() => null);
    const actor = token?.actor ?? (record.actorUuid ? await fromUuid(record.actorUuid).catch(() => null) : null);
    if (actor) resolved.push({ token, actor, key: record.tokenUuid || record.actorUuid || record.actorId });
  }
  return resolved;
}

async function chosenDamageType(type) {
  const choices = String(type || "unaspected").split(/\s*,\s*|\s+or\s+/i).map(value => value.trim().toLowerCase()).filter(value => DAMAGE_TYPES.some(entry => entry.value === value));
  if (choices.length < 2) return choices[0] ?? "unaspected";
  const options = choices.map(value => `<option value="${value}">${game.i18n.localize(DAMAGE_TYPES.find(entry => entry.value === value)?.label ?? "LA.DamageUnaspected")}</option>`).join("");
  return new Promise(resolve => new Dialog({
    title: game.i18n.localize("LA.ChooseDamageType"),
    content: `<form><label>${game.i18n.localize("LA.DamageType")}<select name="damageType">${options}</select></label></form>`,
    buttons: {
      apply: { label: game.i18n.localize("LA.Continue"), callback: html => resolve(html.find('[name="damageType"]').val()) },
      cancel: { label: game.i18n.localize("LA.Cancel"), callback: () => resolve(null) }
    },
    default: "apply", close: () => resolve(null)
  }).render(true));
}

function isActiveGM() {
  const activeGM = game.users?.activeGM ?? game.users?.find(user => user.isGM && user.active);
  return Boolean(game.user?.isGM && activeGM?.id === game.user.id);
}

async function applyToActor(actor, payload, amount, type, aeonEntity = "") {
  if (payload.resource === "mp") {
    const mp = actor.system.resources?.mp ?? { value: 0, max: 0 };
    const loss = Math.min(Math.max(0, Number(mp.value) || 0), amount);
    await actor.update({ "system.resources.mp.value": Math.max(0, Number(mp.value) - loss) });
    return loss;
  }
  return actor.applyDamage(amount, { type, bypassDR: Boolean(payload.bypassDR), aeonEntity });
}

async function applyRiders(payload, totalApplied) {
  if (payload.onApply?.healActorUuid && payload.resource !== "mp") {
    const recipient = await fromUuid(payload.onApply.healActorUuid).catch(() => null);
    const healAmount = payload.onApply.healPerDamage !== undefined
      ? (totalApplied ? Math.max(0, Math.floor(Number(payload.onApply.healPerDamage) || 0)) : 0)
      : Math.floor(totalApplied * Math.max(0, Number(payload.onApply.healMultiplier) || 0));
    if (recipient?.applyHealing && healAmount) await recipient.applyHealing(healAmount);
  }
  if (payload.onApply?.restoreMPActorUuid && payload.resource === "mp" && totalApplied) {
    const recipient = await fromUuid(payload.onApply.restoreMPActorUuid).catch(() => null);
    if (recipient) {
      const mp = recipient.system.resources?.mp ?? { value: 0, max: 0 };
      const requested = payload.onApply.mpPerDamage !== undefined
        ? (totalApplied ? Math.max(0, Math.floor(Number(payload.onApply.mpPerDamage) || 0)) : 0)
        : Math.floor(totalApplied * Math.max(0, Number(payload.onApply.mpMultiplier) || 0));
      const gain = Math.min(requested, Math.max(0, Number(mp.max) - Number(mp.value)));
      if (gain) await recipient.update({ "system.resources.mp.value": Number(mp.value) + gain });
    }
  }
}

async function onChatApply(message, button) {
  let payload = message.getFlag(SYSTEM_ID, "damageApplication");
  if (!payload || payload.applied || payload.processing) return;
  let targets = payload.targets?.length ? await resolveRecordedTargets(payload.targets) : selectedTargets().map(token => ({ token, actor: token.actor, key: token.document.uuid }));
  if (!targets.length) {
    ui.notifications.warn(game.i18n.localize("LA.SelectDamageTarget"));
    return;
  }
  const type = payload.resource === "mp" ? "unaspected" : await chosenDamageType(payload.type);
  if (type === null) return;
  const amount = Math.max(0, Math.floor(Number(payload.amount) || 0));
  const remoteTargets = targets.filter(target => !game.user.isGM && !target.actor.isOwner);
  if (remoteTargets.length || !message.isOwner) {
    const activeGM = game.users?.activeGM ?? game.users?.find(user => user.isGM && user.active);
    if (!activeGM) return ui.notifications.error(game.i18n.localize("LA.NoActiveGMForDamage"));
    button.prop("disabled", true);
    game.socket.emit(`system.${SYSTEM_ID}`, {
      action: "applyChatDamage",
      messageId: message.id,
      userId: game.user.id,
      amount,
      type,
      resource: payload.resource,
      targetRecords: targets.map(({ token, actor }) => ({
        tokenUuid: token?.document?.uuid ?? "",
        actorUuid: actor.uuid,
        tokenId: token?.document?.id ?? "",
        sceneId: token?.document?.parent?.id ?? canvas?.scene?.id ?? ""
      })),
      targetUuids: targets.map(target => target.actor.uuid),
      aeonEntities: targets.map(target => target.token?.document?.getFlag?.(SYSTEM_ID, "aeonEntity") ?? "")
    });
    return;
  }
  button.prop("disabled", true);
  await message.setFlag(SYSTEM_ID, "damageApplication", { ...payload, processing: true });
  const results = [];
  let totalApplied = 0;
  for (const target of targets) {
    const gaugeBefore = Number(target.actor.system.combat?.breakGauge) || 0;
    const applied = await applyToActor(target.actor, payload, amount, type, target.token?.document?.getFlag?.(SYSTEM_ID, "aeonEntity") ?? "");
    totalApplied += applied;
    const gaugeAfter = Number(target.actor.system.combat?.breakGauge) || 0;
    const gaugeNote = payload.resource === "mp" ? "" : ` · ${game.i18n.localize("LA.BreakGauge")}: ${gaugeBefore}→${gaugeAfter}/5`;
    results.push(`${foundry.utils.escapeHTML(target.actor.name)}: ${applied} ${payload.resource === "mp" ? "MP" : game.i18n.localize("LA.Damage")}${gaugeNote}`);
  }
  await applyRiders(payload, totalApplied);
  await message.setFlag(SYSTEM_ID, "damageApplication", { ...payload, processing: false, applied: true });
  const html = results.map(result => `<li>${result}</li>`).join("");
  await ChatMessage.create({ speaker: message.speaker, content: `<p><strong>${game.i18n.localize("LA.ApplyDamage")}:</strong></p><ul>${html}</ul>` });
}

export function registerDamageChatControls() {
  Hooks.on("renderChatMessage", (message, html) => {
    const payload = message.getFlag(SYSTEM_ID, "damageApplication");
    if (!payload || payload.applied || payload.processing) return;
    const root = html instanceof HTMLElement ? $(html) : html;
    const content = root.find(".message-content");
    if (!content.length || content.find(".la-chat-apply-damage").length) return;
    const button = $(`<button type="button" class="la-chat-apply-damage"><i class="fas fa-heartbeat" aria-hidden="true"></i> ${game.i18n.localize("LA.ApplyDamage")} (${payload.amount}${payload.resource === "mp" ? " MP" : " HP"})</button>`);
    button.on("click", event => { event.preventDefault(); onChatApply(message, button).catch(async error => { console.error("Last Arc | Chat damage application failed", error); ui.notifications.error(game.i18n.localize("LA.ChatDamageApplyFailed")); const pending = message.getFlag(SYSTEM_ID, "damageApplication"); if (pending?.processing) await message.setFlag(SYSTEM_ID, "damageApplication", { ...pending, processing: false }); button.prop("disabled", false); }); });
    content.append(button);
  });

  Hooks.once("ready", () => {
    game.socket.on(`system.${SYSTEM_ID}`, async data => {
      if (!isActiveGM() || data?.action !== "applyChatDamage") return;
      try {
        const message = game.messages.get(data.messageId);
        const payload = message?.getFlag(SYSTEM_ID, "damageApplication");
        if (!payload || payload.applied || payload.processing || message.user?.id !== data.userId) return;
        await message.setFlag(SYSTEM_ID, "damageApplication", { ...payload, processing: true });
        const results = [];
        let totalApplied = 0;
        const remoteTargets = data.targetRecords?.length
          ? await resolveRecordedTargets(data.targetRecords)
          : await Promise.all((data.targetUuids ?? []).map(async (uuid, index) => ({ actor: await fromUuid(uuid).catch(() => null), token: null, aeonEntity: data.aeonEntities?.[index] ?? "" })));
        for (const target of remoteTargets) {
          const actor = target.actor;
          if (!actor) continue;
          const gaugeBefore = Number(actor.system.combat?.breakGauge) || 0;
          const targetTokenDocument = target.token?.document ?? target.token;
          const applied = await applyToActor(actor, payload, Math.min(payload.amount, Math.max(0, Number(data.amount) || 0)), data.type, target.aeonEntity ?? targetTokenDocument?.getFlag?.(SYSTEM_ID, "aeonEntity") ?? "");
          totalApplied += applied;
          const gaugeAfter = Number(actor.system.combat?.breakGauge) || 0;
          const gaugeNote = payload.resource === "mp" ? "" : ` · ${game.i18n.localize("LA.BreakGauge")}: ${gaugeBefore}→${gaugeAfter}/5`;
          results.push(`${foundry.utils.escapeHTML(actor.name)}: ${applied} ${payload.resource === "mp" ? "MP" : game.i18n.localize("LA.Damage")}${gaugeNote}`);
        }
        await applyRiders(payload, totalApplied);
        await message.setFlag(SYSTEM_ID, "damageApplication", { ...payload, processing: false, applied: true });
        await ChatMessage.create({ speaker: message.speaker, content: `<p><strong>${game.i18n.localize("LA.ApplyDamage")}:</strong></p><ul>${results.map(result => `<li>${result}</li>`).join("")}</ul>` });
      } catch (error) {
        console.error("Last Arc | GM could not apply chat damage", error);
        const message = game.messages.get(data.messageId);
        const pending = message?.getFlag(SYSTEM_ID, "damageApplication");
        if (pending?.processing) await message.setFlag(SYSTEM_ID, "damageApplication", { ...pending, processing: false });
      }
    });
  });
}
