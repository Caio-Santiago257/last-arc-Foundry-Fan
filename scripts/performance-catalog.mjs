const tier = (dc, ...effects) => ({ dc, effects });
const buff = bonuses => ({ type: "buff", bonuses });
const debuff = (defence, value) => ({ type: "debuff", defence, value, resistBy: "will" });
const damage = (formula, extra = {}) => ({ type: "damage", formula, resistBy: "will", ...extra });

const performance = (name, targetSide, description, automation, specialRules = "") => ({
  name,
  type: "performance",
  system: {
    action: "Perform check",
    targetSide,
    description,
    specialRules,
    automation: { skill: "perform", minimumDC: 0, ...automation }
  }
});

export const PERFORMANCES = [
  performance("Arrow Aubade", "ally", "A martial song that empowers allies' ranged weapon attacks.", {
    minimumDC: 20,
    tiers: [20, 25, 30, 35, 40].map((dc, index) => tier(dc, buff({ damageDice: { weaponMode: "ranged", die: [4, 6, 8, 10, 12][index] } })))
  }),
  performance("Beau Capriccio", "ally", "An elegant tune lets allies use the performer's check in place of their Will Defence.", {
    effects: [buff({ substituteDefence: { will: true } })]
  }),
  performance("Champion's Virelai", "ally", "A battle song that improves allies' weapon skill checks.", {
    minimumDC: 15,
    tiers: [15, 20, 25, 30, 35].map((dc, index) => tier(dc, buff({ weaponSkillBonus: index + 1 })))
  }),
  performance("Chanter's Etude", "ally", "A protective song that improves Reflex Defence against magick.", {
    minimumDC: 15,
    tiers: [15, 20, 25, 30, 35].map((dc, index) => tier(dc, buff({ spellDefenceBonuses: { ref: index + 1 } })))
  }),
  performance("Corrival's Requiem", "enemy", "An ominous tune weakens the defences of a foe who fails to resist it.", {
    effects: [debuff("all", -2)]
  }, "Fear effect."),
  performance("Jack Tar Chantey", "ally", "A lively song that improves allies' eligible skill checks.", {
    minimumDC: 15,
    tiers: [15, 20, 25, 30, 35].map((dc, index) => tier(dc, buff({ skillBonus: { allExcept: ["alchemy", "smithing", "spellcraft"], value: index + 1 } })))
  }),
  performance("Knave's Madrigal", "enemy", "A taxing tune weakens a foe's Will Defence if it fails to resist.", {
    effects: [debuff("will", -5)]
  }, "Mind effect."),
  performance("Knight's Paeon", "ally", "A resolute verse improves allies' Reflex Defence against attacks.", {
    minimumDC: 15,
    tiers: [15, 20, 25, 30, 35].map((dc, index) => tier(dc, buff({ defenceBonuses: { ref: index + 1 } })))
  }),
  performance("Mage's Ballad", "ally", "A magickal melody improves allies' Spellcraft checks.", {
    minimumDC: 15,
    tiers: [15, 20, 25, 30, 35].map((dc, index) => tier(dc, buff({ skillBonuses: { spellcraft: index + 1 } })))
  }),
  performance("Mourning Elegy", "enemy", "A bleak verse weakens a foe's Fortitude Defence if it fails to resist.", {
    effects: [debuff("fort", -5)]
  }, "Mind effect."),
  performance("Savage Scherzo", "enemy", "A fierce tune damages a foe who fails to resist.", {
    minimumDC: 20,
    immuneUntilNextTurn: true,
    doesNotEndOtherPerformances: true,
    tiers: [20, 25, 30, 35, 40].map((dc, index) => tier(dc, damage(`1d${[4, 6, 8, 10, 12][index]}`)))
  }, "Unaspected damage; mind effect. The target is immune to this performance until the performer's next turn; it does not end other performances."),
  performance("Scamp's Nocturne", "enemy", "A dark song drains MP from a foe who fails to resist.", {
    minimumDC: 20,
    immuneUntilNextTurn: true,
    doesNotEndOtherPerformances: true,
    tiers: [20, 25, 30, 35, 40].map((dc, index) => tier(dc, { type: "mpDamage", formula: `1d${[4, 6, 8, 10, 12][index]}x`, resistBy: "will" }))
  }, "The MP die explodes. Mind effect. The target is immune to this performance until the performer's next turn; it does not end other performances."),
  performance("Vagrant's Threnody", "enemy", "A disheartening verse reduces a foe's attack and skill checks if it fails to resist.", {
    effects: [debuff("attacksAndSkills", -2)]
  }, "Mind effect."),
  performance("Valor Minne", "ally", "A war song adds damage to allies' successful melee weapon attacks.", {
    minimumDC: 20,
    tiers: [20, 25, 30, 35, 40].map((dc, index) => tier(dc, buff({ damageDice: { weaponMode: "melee", die: [4, 6, 8, 10, 12][index] } })))
  }),
  performance("Vigil's Overture", "ally", "A fortifying song lets allies use the performer's check in place of their Fortitude Defence.", {
    effects: [buff({ substituteDefence: { fort: true } })]
  })
];
