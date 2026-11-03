import { writeFile } from "node:fs/promises";

// Short original summaries for the base-class talent trees. Exact rules text and
// long-form descriptions remain in the rulebook; conditional effects are flagged
// for manual adjudication in the compendium item.
const trees = {
  Bard: {
    Academic: [
      ["Educated", "Use Lore skills without training; this talent broadens the bard's academic checks."],
      ["Jack of All Trades", "Once per day, attempt an otherwise untrained skill check, subject to the talent's restrictions."],
      ["Lore Master", "Reroll Lore checks; the racial Ageless Mind trait can improve how the result is kept."]
    ],
    Dancer: [
      ["Polka", "Use a same-turn dance performance to defend against attacks for a brief window."],
      ["Presto", "Once per encounter, reroll a Perform (Dance) check."],
      ["Samba", "A dance performance can increase melee damage for the turn."],
      ["Waltz", "A dance performance can grant a short move during the turn."]
    ],
    Mediator: [
      ["Appeal", "Once per encounter, substitute a Persuasion check for Reflex Defence against an attack."],
      ["Master Negotiator", "Improve a creature's attitude by an extra step when diplomacy succeeds."],
      ["Monologue", "Extend an oratory performance to affect a short cone of creatures."],
      ["Skilled Negotiator", "Reroll Persuasion checks; Socialite may improve the kept result."]
    ],
    Minstrel: [
      ["Fortissimo", "Extend an instrument performance to reach a distant target."],
      ["Marcato", "Once per encounter, reroll a Perform (Instrument) check."],
      ["Medley", "Combine multiple bard performances into one action and stack their benefits."],
      ["Pianissimo", "Exclude chosen creatures from an instrument performance's targets."],
      ["Tenuto", "Extend the duration of the next instrument performance."]
    ]
  },
  Initiate: {
    Animist: [
      ["Beast Shape", "Assume the form of a nearby beast after a successful Spellcraft check."],
      ["Galeforce", "A wind spell that meets its attack conditions can worsen a target's Break Gauge state."],
      ["Geoburst", "An earth spell can coat a target in oil and apply the tree's listed follow-up effect."],
      ["Overflow", "Increase forced movement caused by a green spell."],
      ["Summon Wild", "Summon a beast ally by spending mana; its level and duration are limited by the rules."],
      ["Tanglevine", "Make a green spell that stops movement harder to escape from."]
    ],
    Cleric: [
      ["Divine Caress", "Improve the reliability of checks associated with the cleric's healing magic."],
      ["Healer's Blessing I", "Add level-scaled healing when a white spell restores a creature."],
      ["Healer's Blessing II", "Increase the healing bonus from Healer's Blessing I."],
      ["Lay on Hands", "Use Spellcraft for eligible Medicine checks, including the talent's treatment of medical supplies."]
    ],
    Devotee: [
      ["Divine Favour", "A critical Spellcraft result can restore mana, as specified by the talent."],
      ["Divine Preservation", "Channeling mana also advances the user's Break Gauge."],
      ["Trial of Faith", "A natural 1 on a qualifying Spellcraft attack can trigger a divine benefit."]
    ],
    Occultist: [
      ["Dark Renewal", "Once per encounter, recover resources after moving a foe down the Break Gauge."],
      ["Enfeeble", "A black spell that worsens a foe's Break Gauge can push it an additional step."],
      ["Goety", "Reduce the bonus a higher-level target receives against the user's black magick."],
      ["Summon Darkness", "Summon an undead or infernal creature ally by spending mana."]
    ]
  },
  Mage: {
    Arcanist: [
      ["Focused Spell", "Once per day, add a strong bonus to a Spellcraft check when casting a spell."],
      ["Manafont", "Channeling restores additional mana based on character level."],
      ["Penetrating Spell", "Treat a damaged target's Break Threshold as lower for the spell."],
      ["Swift Spell", "Once per day, cast a normally primary-action spell as a minor action."]
    ],
    Conjurer: [
      ["Astral Flow", "Once per day, use Summon Elemental without paying its mana cost."],
      ["Ferocious Guardian", "A summoned elemental can reroll damage dice against a nearby threat."],
      ["Guardian Force", "Gain a Reflex Defence bonus while close to your summoned elemental."],
      ["Summon Elemental", "Summon an elemental ally by spending mana, subject to level and field limits."]
    ],
    Elementalist: [
      ["Numbing Cold", "A successful cold spell can remove a target's secondary action instead of its minor action."],
      ["Searing Flame", "Fire magick that worsens a target's Break Gauge can cause a lingering injury."],
      ["Spellshape", "Exclude a limited number of allies from a red spell's area for the turn."],
      ["Thunderclap", "A successful electric spell can stun and leave its target flat-footed."]
    ],
    Illusionist: [
      ["Fascinate", "A narrowly failed blue spell can impose penalties to attacks and skills."],
      ["Legerdemain", "Use Spellcraft instead of Deception and count as trained for prerequisites."],
      ["Mind Shield", "React to a mind effect by substituting Spellcraft for Will Defence, with a later penalty."],
      ["Overawe", "Reduce a higher-level target's defence advantage against the user's mental magick."]
    ]
  },
  Ranger: {
    Archer: [
      ["Dead Shot", "Add Agility to qualifying bow or crossbow attacks against a target's weak point."],
      ["Pinning Shot", "Trade damage on a successful ranged hit to restrict a target's movement."],
      ["Safe Shot", "Avoid provoking counterattacks when making ranged attacks near enemies."],
      ["Volley I", "Fire at a small area instead of a single target with an all-out action."],
      ["Volley II", "Reduce the attack penalty when using Volley I."]
    ],
    Hunter: [
      ["Expert Shot", "Ignore concealment on ranged attacks except total concealment."],
      ["Forester", "Reroll Survival checks; Survivalist can improve the kept result."],
      ["Quarry", "Track at normal speed without the usual movement penalty."],
      ["Wide Scan", "Reroll Perception checks."]
    ],
    Scout: [
      ["Camouflage", "Gain concealment while making a Stealth check, even without cover."],
      ["Chameleon Step", "React to avoid provoking a counterattack by slipping past an enemy."],
      ["Decoy Shot", "Use a ranged attack to distract or redirect an observer's attention."],
      ["Strafe", "Treat diagonal movement as one square for a brief interval."],
      ["Surefooted", "Move at normal speed through rough terrain, with sprinting still restricted."]
    ],
    Tamer: [
      ["Guardian Beast", "Your pet may counterattack an enemy that attacks you within its reach."],
      ["Familiar", "Share qualifying numerical buffs and penalties with your pet."],
      ["Tame", "Use Persuasion to improve the attitude of low-Intelligence beasts without the usual penalty."]
    ]
  },
  Rogue: {
    Charlatan: [
      ["Convincing Liar", "Reroll Deception checks made to deceive; Deceitful may improve the result."],
      ["Honeyed Words", "Use Deception instead of Persuasion for eligible negotiations."],
      ["Swindle", "Use Deception instead of Stealth for eligible pickpocket attempts."]
    ],
    Cutthroat: [
      ["Backstab", "Deal extra damage with a qualifying light-weapon attack against a vulnerable target."],
      ["Debilitating Injury", "A successful Backstab can move the target farther down the Break Gauge."],
      ["Lacerate", "A successful Backstab can deal additional delayed damage when its defence checks succeed."]
    ],
    Footpad: [
      ["Anticipation I", "Retain Agility to Reflex Defence while flat-footed, subject to the talent's limits."],
      ["Anticipation II", "Avoid being flanked while Anticipation I applies."],
      ["Evasive", "Reduce area-effect damage while wearing light or no armour."],
      ["Improved Stealth", "Reroll Stealth checks made to sneak; Sneaky may improve the result."],
      ["Swift Stealth", "Sneak at normal movement speed; Dark Stalker may extend this benefit."]
    ],
    Saboteur: [
      ["Expose", "Combine a melee attack with a Disable attempt against a target's defence."],
      ["Sabotage", "Reroll Disable checks and perform eligible sabotage without tools."],
      ["Shear", "Use a melee attack followed by Disable to impair an opponent's equipment or function."]
    ],
    Thief: [
      ["Cat Burglar", "Climb or traverse narrow ledges at normal speed without provoking counterattacks."],
      ["Cutpurse", "Reroll Stealth checks for pickpocketing; Sneaky may improve the result."],
      ["Stab and Grab", "Combine a light-weapon attack with an eligible pickpocket attempt."]
    ]
  },
  Warrior: {
    Barbarian: [
      ["Brutal Assault", "While raging, deal reduced Strength-based damage even when a melee attack misses."],
      ["Grit", "Once per day, double the HP restored when using second wind; this talent can be taken repeatedly."],
      ["Heavy Handed", "While raging, apply a greater Strength damage modifier with one-handed weapons."],
      ["Rage", "Once per encounter, temporarily improve melee attacks and bypass some damage reduction."],
      ["Toughness", "Once per encounter, resist being moved down the Break Gauge."]
    ],
    Defender: [
      ["Deflect", "Use a shield reaction to protect nearby allies from a large area effect."],
      ["Indomitable", "Once per day, recover Break Gauge steps; this talent can be taken repeatedly."],
      ["Provoke", "Taunt nearby enemies with Persuasion to draw their attention."],
      ["Shield Ally", "Use a shield reaction to block for an adjacent ally."],
      ["Shield Expert", "Reduce the penalty for consecutive shield blocks."]
    ],
    Fighter: [
      ["Advanced Armour Training", "Gain additional Reflex Defence and damage reduction while wearing qualifying armour."],
      ["Armour Training", "Improve the Agility limit of light armour and reduce heavy-armour encumbrance."],
      ["Counterstrike", "Once per encounter, counterattack after taking damage from a melee attack."],
      ["Weapon Specialization", "Choose a proficient weapon group and reroll one attack per encounter with it."]
    ],
    Uhlan: [
      ["Expert Rider", "Reroll Ride checks; Outrider may improve the result."],
      ["Mighty Charge", "A mounted charge can inflict additional Break Gauge pressure through armour."],
      ["Mounted Charge", "Add a damage die to a melee attack made while charging on a mount."]
    ]
  }
};

const items = [];
for (const [className, classTrees] of Object.entries(trees)) {
  for (const [tree, talents] of Object.entries(classTrees)) {
    for (const [name, description] of talents) {
      items.push({
        name,
        type: "talent",
        img: "icons/svg/item-bag.svg",
        system: {
          className,
          tree,
          description: `${description} Summary only: consult the rulebook for exact wording, usage limits, and prerequisites.`,
          prerequisites: "See the rulebook for prerequisites.",
          automation: { mode: "manual", reason: "Conditional, triggered, or usage-limited effect; adjudicate using the rulebook." },
          repeatable: ["Grit", "Indomitable"].includes(name),
          uses: { value: 0, max: 0 }
        }
      });
    }
  }
}

await writeFile(new URL("../packs-source/talents.json", import.meta.url), `${JSON.stringify(items, null, 2)}\n`);
console.log(`Wrote ${items.length} summarized base-class talents.`);
