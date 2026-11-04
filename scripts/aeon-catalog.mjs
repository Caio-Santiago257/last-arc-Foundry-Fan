// Aeon statistics and level unlocks transcribed into structured system data
// from Chapter 13 of the supplied rules PDF.
const rows = values => values.map(([hp, mp, attack, damage, damageType, ref, flatFootedRef, fort, will, dr, perception, spellcraft, unarmed, attacks = 1]) => ({ hp, mp, attack, damage, damageType, ref, flatFootedRef, fort, will, dr, skills: { perception, spellcraft, unarmed }, attacks }));

export const AEONS = [
  {
    id: "sirius", name: "Sirius", epithet: "The Raging Flame", affinity: "fire", size: "large", reach: 2,
    speed: { land: 8, hover: true }, description: "Primal of fire, forge, and war; the Burning Tyrant and patron of the forge.",
    features: [
      { name: "Immolator", description: "Immune to fire and weak to cold. Red Magicks that deal fire damage use d8s instead of d6s." },
      { name: "Pyroclasm", ultimate: true, description: "All-out action: attack the Reflex Defence of all enemies within 6 squares. On a hit deal fire damage; on a miss deal half. Unsummon Sirius after resolution. 6d6 + Summoner level (8d6 at Summoner 6, 10d6 at Summoner 10)." }
    ],
    spellProgression: [{ level: 1, spells: ["Ember", "Scorching Strike"] }, { level: 2, spells: ["Flamethrower"] }, { level: 4, spells: ["Fireball"] }, { level: 6, spells: ["Firestorm"] }, { level: 8, spells: ["Inferno"] }],
    technickProgression: [{ level: 1, technicks: ["Arcane Study", "Weapon Proficiency (bludgeons)", "Skill Focus (one-handed)", "Skill Focus (spellcraft)"] }, { level: 3, technicks: ["Defence Up"] }, { level: 5, technicks: ["HP Up"] }, { level: 7, technicks: ["MP Up"] }, { level: 9, technicks: ["Threshold Up"] }],
    levels: rows([
      [105,63,22,"2d12+12","blunt",23,16,27,23,5,14,19,12], [120,72,23,"2d12+13","blunt",24,17,28,24,10,15,20,13], [135,81,23,"2d12+13","blunt",26,19,30,26,10,15,20,13], [150,90,24,"2d12+14","blunt",27,20,31,27,10,16,21,14], [181,99,24,"2d12+14","blunt",28,21,32,28,10,16,21,14], [197,108,25,"2d12+15","blunt",29,22,33,29,15,17,22,15], [213,135,25,"2d12+15","blunt",30,23,34,30,15,17,22,15], [229,145,26,"2d12+16","blunt",31,24,35,31,15,18,23,16], [245,155,26,"2d12+16","blunt",32,25,36,32,15,18,23,16], [261,165,27,"2d12+17","blunt",33,26,37,33,15,19,24,17]
    ])
  },
  {
    id: "altair", name: "Altair", epithet: "The Wreckager", affinity: "electric", size: "large", reach: 2,
    speed: { land: 4, fly: 12, swim: 12, hover: true }, description: "Primal of thunder, lightning, and storms; father of the Gawro.",
    features: [
      { name: "Discharge", description: "Immune to electric damage. Red Magicks that deal electric damage use d8s instead of d6s." },
      { name: "Pharyngeal Jaw", description: "Altair's bite attack combos on a natural 17–20. Each explosive damage die with the bite generates two additional dice instead of one." },
      { name: "Maelstrom", ultimate: true, description: "All-out action: attack the Reflex Defence of all enemies within 6 squares. On a hit deal electric damage; on a miss deal half. Unsummon Altair after resolution. 6d6 + Summoner level (8d6 at Summoner 6, 10d6 at Summoner 10)." }
    ],
    spellProgression: [{ level: 1, spells: ["Shock", "Galvanic Strike"] }, { level: 2, spells: ["Chain Lightning"] }, { level: 4, spells: ["Lightning Bolt"] }, { level: 6, spells: ["Thunderstorm"] }, { level: 8, spells: ["Ark Blast"] }],
    technickProgression: [{ level: 1, technicks: ["Arcane Study", "Agile Manoeuvres", "Skill Focus (unarmed)", "Skill Focus (spellcraft)"] }, { level: 3, technicks: ["Defence Up"] }, { level: 5, technicks: ["HP Up"] }, { level: 7, technicks: ["MP Up"] }, { level: 9, technicks: ["Weapon Finesse"] }],
    levels: rows([
      [98,63,22,"1d8+10","piercing",25,16,26,23,5,14,19,22], [112,72,23,"1d8+11","piercing",26,17,27,24,10,15,20,23], [126,81,23,"1d8+11","piercing",28,19,29,26,10,15,20,23], [140,90,24,"1d8+12","piercing",29,20,30,27,10,16,21,24], [170,99,24,"1d8+12","piercing",30,21,31,28,10,16,21,24], [185,108,25,"1d8+13","piercing",31,22,32,29,15,17,22,25], [200,135,25,"1d8+13","piercing",32,23,33,30,15,17,22,25], [215,145,26,"1d8+14","piercing",33,24,34,31,15,18,23,26], [230,155,26,"1d8+16","piercing",34,25,35,32,15,18,23,26], [245,165,27,"1d8+17","piercing",35,26,36,33,15,19,24,27]
    ])
  },
  {
    id: "arcturus", name: "Arcturus", epithet: "The Dread", affinity: "cold", size: "large", reach: 3,
    speed: { land: 10, hover: true }, description: "Primal of ice, winter, and death; an ancient, merciless power.",
    features: [
      { name: "Hoarfrost", description: "Immune to cold and weak to fire. Red Magicks that deal cold damage use d8s instead of d6s." },
      { name: "Avalanche", ultimate: true, description: "All-out action: attack the Reflex Defence of all enemies within 6 squares. On a hit deal cold damage; on a miss deal half. Unsummon Arcturus after resolution. 6d6 + Summoner level (8d6 at Summoner 6, 10d6 at Summoner 10)." }
    ],
    spellProgression: [{ level: 1, spells: ["Icicle", "Gelid Strike"] }, { level: 2, spells: ["Frost Wave"] }, { level: 4, spells: ["Ice Blast"] }, { level: 6, spells: ["Blizzard"] }, { level: 8, spells: ["Whiteout"] }],
    technickProgression: [{ level: 1, technicks: ["Arcane Study", "Weapon Proficiency (polearms)", "Skill Focus (two-handed)", "Skill Focus (spellcraft)"] }, { level: 3, technicks: ["Defence Up"] }, { level: 5, technicks: ["HP Up"] }, { level: 7, technicks: ["MP Up"] }, { level: 9, technicks: ["Threshold Up"] }],
    levels: rows([
      [91,63,21,"2d10+14","piercing",25,16,25,23,5,14,19,11], [104,72,22,"2d10+15","piercing",26,17,26,24,10,15,20,12], [117,81,22,"2d10+15","piercing",28,19,28,26,10,15,20,12], [130,90,23,"2d10+16","piercing",29,20,29,27,10,16,21,13], [159,99,23,"2d10+16","piercing",30,21,30,28,10,16,21,13], [173,108,24,"2d10+17","piercing",31,22,31,29,15,17,22,14], [187,135,24,"2d10+17","piercing",32,23,32,30,15,17,22,14], [201,145,25,"2d10+18","piercing",33,24,33,31,15,18,23,15], [215,155,25,"2d10+18","piercing",34,25,34,32,15,18,23,15], [229,165,26,"2d10+19","piercing",35,26,35,33,15,19,24,16]
    ])
  },
  {
    id: "pleiades", name: "Pleiades", epithet: "The Fae Sisters", affinity: "piercing", size: "medium", reach: 0,
    speed: { land: 6, hover: true }, description: "Two entities, the Maiden and the Pythoness, are summoned together. They share one HP and MP pool, but otherwise act as two separate creatures. A primary action granting Pleiades a full turn grants a full turn to both sisters.",
    features: [
      { name: "Duality", description: "Resistant to holy damage. The Maiden is weak to dark damage; the Pythoness is weak to fire. Green Magicks that deal piercing damage use d8s instead of d6s." },
      { name: "Swarm Attack", description: "The Pythoness's sting attacks all enemies in a 4-square cone. A target occupying more than one square in the area takes +1 damage die.", automation: { kind: "aeonAction", actionId: "swarmAttack" } },
      { name: "Genesis", ultimate: true, description: "All-out action: attack the Reflex Defence of all enemies within 6 squares of the Pythoness. On a hit deal piercing damage; on a miss deal half. Unsummon Pleiades after resolution. 6d6 + Summoner level (8d6 at Summoner 6, 10d6 at Summoner 10)." }
    ],
    spellProgression: [{ level: 1, spells: ["Cure", "Cleanse", "Entangle"] }, { level: 2, spells: ["Revive"] }, { level: 4, spells: ["Regen", "Overgrowth"] }, { level: 6, spells: ["Mend"] }, { level: 8, spells: ["Curatio", "Succession"] }],
    spellOwners: { "Cure": "Maiden", "Cleanse": "Maiden", "Revive": "Maiden", "Regen": "Maiden", "Mend": "Maiden", "Curatio": "Maiden", "Entangle": "Pythoness", "Overgrowth": "Pythoness", "Succession": "Pythoness" },
    technickProgression: [{ level: 1, technicks: ["Arcane Study", "Agile Manoeuvres", "Skill Focus (unarmed)", "Skill Focus (spellcraft)"] }, { level: 3, technicks: ["Defence Up"] }, { level: 5, technicks: ["HP Up"] }, { level: 7, technicks: ["MP Up"] }, { level: 9, technicks: ["Weapon Finesse"] }],
    levels: rows([
      [77,91,19,"1d4+8","piercing",23,17,23,27,5,18,23,19], [88,104,20,"1d4+9","piercing",24,18,24,28,10,19,24,20], [99,117,20,"1d4+9","piercing",26,20,26,30,10,19,24,20], [110,130,21,"1d4+10","piercing",27,21,27,31,10,20,25,21], [137,143,21,"1d4+10","piercing",28,22,28,32,10,20,25,21], [149,156,22,"1d4+11","piercing",29,23,29,33,15,21,26,22], [161,187,22,"1d4+11","piercing",30,24,30,34,15,21,26,22], [173,201,23,"1d4+12","piercing",31,25,31,35,15,22,27,23], [185,215,23,"1d4+13","piercing",32,26,32,36,15,22,27,23], [197,229,24,"1d4+14","piercing",33,27,33,37,15,23,28,24]
    ])
  },
  {
    id: "alioth", name: "Alioth", epithet: "The Guiding Wind", affinity: "slashing", size: "large", reach: 2,
    speed: { land: 6, fly: 10, hover: true }, description: "Primal of the wind and sky; patron of travellers and trade.",
    features: [
      { name: "Windstorm", description: "Resistant to electric damage and weak to cold. Green Magicks that deal slashing damage use d8s instead of d6s." },
      { name: "Razor Gale", description: "As a primary action, make one claw attack as if using a thrown weapon; it deals +1 damage die.", automation: { kind: "aeonAction", actionId: "razorGale" } },
      { name: "Cyclone", ultimate: true, description: "All-out action: attack the Reflex Defence of all enemies within 6 squares. On a hit deal slashing damage; on a miss deal half. Unsummon Alioth after resolution. 6d6 + Summoner level (8d6 at Summoner 6, 10d6 at Summoner 10)." }
    ],
    spellProgression: [{ level: 1, spells: ["Wind Slash", "Ward"] }, { level: 2, spells: ["Tempest"] }, { level: 4, spells: ["Healing Wind", "Whirlwind"] }, { level: 6, spells: ["Barrier"] }, { level: 8, spells: ["Windburst"] }],
    technickProgression: [{ level: 1, technicks: ["Arcane Study", "Agile Manoeuvres", "Skill Focus (unarmed)", "Skill Focus (spellcraft)"] }, { level: 3, technicks: ["Precise Shot"] }, { level: 5, technicks: ["Weapon Finesse"] }, { level: 7, technicks: ["Defence Up"] }, { level: 9, technicks: ["HP Up"] }],
    levels: rows([
      [91,70,25,"1d6+10","slashing",28,16,25,24,5,15,20,25,2], [104,80,26,"1d6+11","slashing",29,17,26,25,10,16,21,26,2], [117,90,26,"1d6+11","slashing",30,18,27,26,10,16,21,26,2], [130,100,27,"1d6+12","slashing",31,19,28,27,10,17,22,27,2], [143,110,27,"1d6+17","slashing",32,20,29,28,10,17,22,27,2], [156,120,28,"1d6+18","slashing",33,21,30,29,15,18,23,28,2], [169,130,28,"1d6+18","slashing",35,23,32,31,15,18,23,28,2], [182,140,29,"1d6+19","slashing",36,24,33,32,15,19,24,29,2], [215,150,29,"1d6+19","slashing",37,25,34,33,15,19,24,29,2], [229,160,30,"1d6+20","slashing",38,26,35,34,15,20,25,30,2]
    ])
  },
  {
    id: "rasalas", name: "Rasalas", epithet: "Wanderer of the Sands", affinity: "blunt", size: "large", reach: 2,
    speed: { land: 8, fly: 8, hover: true }, description: "Primal of earth and sand; patron of the Nasha, whose trials test those who call on him.",
    features: [
      { name: "Earthen", description: "Immune to electric damage. Green Magicks that deal blunt damage use d8s instead of d6s." },
      { name: "Earth Shield", description: "+5 Reflex Defence against ranged attacks and spells." },
      { name: "Landslide", ultimate: true, description: "All-out action: attack the Reflex Defence of all enemies within 6 squares. On a hit deal blunt damage; on a miss deal half. Unsummon Rasalas after resolution. 6d6 + Summoner level (8d6 at Summoner 6, 10d6 at Summoner 10)." }
    ],
    spellProgression: [{ level: 1, spells: ["Boulder", "Protect"] }, { level: 2, spells: ["Shockwave"] }, { level: 4, spells: ["Faith", "Quake"] }, { level: 6, spells: ["Shell"] }, { level: 8, spells: ["Cataclysm"] }],
    technickProgression: [{ level: 1, technicks: ["Arcane Study", "Weapon Proficiency (bludgeons)", "Skill Focus (one-handed)", "Skill Focus (spellcraft)"] }, { level: 3, technicks: ["Defence Up"] }, { level: 5, technicks: ["HP Up"] }, { level: 7, technicks: ["MP Up"] }, { level: 9, technicks: ["Threshold Up"] }],
    levels: rows([
      [84,91,23,"2d10+13","blunt",24,16,24,27,5,18,23,23], [96,104,24,"2d10+14","blunt",25,17,25,28,10,19,24,24], [108,117,24,"2d10+14","blunt",27,19,27,30,10,19,24,24], [120,130,25,"2d10+15","blunt",28,20,28,31,10,20,25,25], [148,143,25,"2d10+15","blunt",29,21,29,32,10,20,25,25], [161,156,26,"2d10+16","blunt",30,22,30,33,15,21,26,26], [174,187,26,"2d10+16","blunt",31,23,31,34,15,21,26,26], [187,201,27,"2d10+17","blunt",32,24,32,35,15,22,27,27], [200,215,27,"2d10+17","blunt",33,25,33,36,15,22,27,27], [213,229,28,"2d10+18","blunt",34,26,34,37,15,23,28,28]
    ])
  },
  {
    id: "betelgeuse", name: "Betelgeuse", epithet: "The Great Pox", affinity: "dark", size: "large", reach: 2,
    speed: { land: 6 }, description: "Primal of pestilence and decay; father of Goblin-kind.",
    features: [
      { name: "Corpulent", description: "Immune to blind, slow, and zombify. Resistant to dark damage and weak to holy damage." },
      { name: "Gnawxious Bite", description: "After using Pin, Betelgeuse may make a free bite attack against the pinned target for 1d8 piercing damage instead of 1d6 blunt. The target may become poisoned: 50% at level 1, 75% at level 2, automatic at level 6.", automation: { kind: "aeonAction", actionId: "gnawxiousBite" } },
      { name: "Cesspool", ultimate: true, description: "All-out area action: attack Fortitude Defence of all enemies within 6 squares. A target whose defence is beaten becomes slowed, poisoned (death fog), diseased, and blinded; silenced at level 6 and paralysed at level 10. Unsummon Betelgeuse after resolution." }
    ],
    spellProgression: [{ level: 1, spells: ["Torpor", "Infest"] }, { level: 2, spells: ["Mire"] }, { level: 4, spells: ["Sap"] }, { level: 6, spells: ["Corrode"] }, { level: 8, spells: ["Expiry"] }],
    technickProgression: [{ level: 1, technicks: ["Arcane Study", "Pin", "Skill Focus (unarmed)", "Skill Focus (spellcraft)"] }, { level: 3, technicks: ["Defence Up"] }, { level: 5, technicks: ["HP Up"] }, { level: 7, technicks: ["MP Up"] }, { level: 9, technicks: ["Threshold Up"] }],
    levels: rows([
      [133,63,20,"1d6+10","blunt",18,16,31,23,5,14,19,20,2], [152,72,21,"1d6+11","blunt",19,17,32,24,10,15,20,21,2], [171,81,21,"1d6+11","blunt",21,19,34,26,10,15,20,21,2], [190,90,22,"1d6+12","blunt",22,20,35,27,10,16,21,22,2], [225,99,22,"1d6+12","blunt",23,21,36,28,10,16,21,22,2], [245,108,23,"1d6+13","blunt",24,22,37,29,15,17,22,23,2], [265,135,23,"1d6+13","blunt",25,23,38,30,15,17,22,23,2], [285,145,24,"1d6+14","blunt",26,24,39,31,15,18,23,24,2], [305,155,24,"1d6+14","blunt",27,25,40,32,15,18,23,24,2], [325,165,25,"1d6+15","blunt",28,26,41,33,15,19,24,25,2]
    ])
  },
  {
    id: "fomalhaut", name: "Fomalhaut", epithet: "The Wyrmking", affinity: "unaspected", size: "huge", reach: 3,
    speed: { land: 6, fly: 12 }, description: "Primal of arcane power and father of dragons.",
    features: [
      { name: "Arcane Supremacy", description: "+5 to all defences against spells. Area effects deal half damage to Fomalhaut, or no damage if the effect fails to beat the relevant defence." },
      { name: "Dragonphase", description: "After casting a spell that deals elemental damage, gain resistance to that element until casting another spell. Immune to slow." },
      { name: "Dragonstorm", ultimate: true, description: "All-out action: attack the Reflex Defence of all enemies within 6 squares. On a hit deal unaspected damage; on a miss deal half. Unsummon Fomalhaut after resolution. 6d6 + Summoner level (8d6 at Summoner 6, 10d6 at Summoner 10)." }
    ],
    // The Summoner table shortens the name to "Levitate"; the spell compendium's
    // canonical item is titled "Levitation".
    spellProgression: [{ level: 1, spells: ["Fireball", "Lightning Bolt", "Ice Blast"] }, { level: 2, spells: ["Dispel", "Gravity"] }, { level: 4, spells: ["Firestorm", "Thunderstorm", "Blizzard"] }, { level: 6, spells: ["Banish", "Levitation"] }, { level: 8, spells: ["Inferno", "Ark Blast", "Whiteout"] }],
    technickProgression: [{ level: 1, technicks: ["Arcane Study", "Combat Casting", "Skill Focus (unarmed)", "Skill Focus (spellcraft)"] }, { level: 3, technicks: ["Defence Up"] }, { level: 5, technicks: ["HP Up"] }, { level: 7, technicks: ["MP Up"] }, { level: 9, technicks: ["Threshold Up"] }],
    levels: rows([
      [112,98,29,"1d8+19","slashing",22,15,28,28,5,19,24,29,2], [128,112,30,"1d8+20","slashing",23,16,29,29,10,20,25,30,2], [144,126,30,"1d8+20","slashing",25,18,31,31,10,20,25,30,2], [160,140,31,"1d8+21","slashing",26,19,32,32,10,21,26,31,2], [192,154,31,"1d8+21","slashing",27,20,33,33,10,21,26,31,2], [209,168,32,"1d8+22","slashing",28,21,34,34,15,22,27,32,2], [226,200,32,"1d8+22","slashing",29,22,35,35,15,22,27,32,2], [243,215,33,"1d8+23","slashing",30,23,36,36,15,23,28,33,2], [260,230,33,"1d8+23","slashing",31,24,37,37,15,23,28,33,2], [277,245,34,"1d8+24","slashing",32,25,38,38,15,24,29,34,2]
    ])
  }
];
