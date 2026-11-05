const powerRows = [
  ["Aether Blast","Elementalist","An all-out action deals cold, electric, or fire damage to one enemy within 12 squares and line of sight.","6d6","8d6","10d6","choice"],
  ["Aeon Flux","Evoker","Summon an Aeon without its daily-use restriction or MP cost. It immediately uses its ultimate attack and remains summoned; it may take no other action this turn. You may replace an existing summon."],
  ["Armistice","Mediator","One enemy within 6 squares and line of sight leaves the encounter. Mind effect; does not affect summons or legendary creatures."],
  ["Arrowstorm","Marksman","An enemy at point-blank weapon range and all enemies within 6 squares of it take piercing damage and are blinded.","8d6",null,"10d6","piercing"],
  ["Black Mass","Lichdom","Deal unaspected damage to enemies within 6 squares and zombify them. While under Vengeful Spirit manifestation, this is a Primary Action; you cannot take another action that turn.","4d6","6d6","8d6","unaspected"],
  ["Blade Beam","Spellblade","Deal unaspected damage to all enemies in a 6-square cone.","8d6",null,"10d6","unaspected"],
  ["Bloodbath","Cutthroat","Deal slashing damage to enemies within 6 squares. At the start of each target's turn, it takes unaspected damage equal to half this power's damage.","4d6","6d6","8d6","slashing"],
  ["Blood Reign","Vampyrism","Living creatures within 6 squares and line of sight each move down the Break Gauge; heal 10 HP for each step inflicted. Clear all your statuses and persistent conditions, then move yourself to the top of the Break Gauge. At level 10, move targets 2 steps and heal 15 HP per target; at level 15, move them 3 steps and heal 20 HP per target."],
  ["Calamity Blast","Reaver","Deal dark damage to all enemies in a 6-square cone. Explosive dice generate two bonus damage dice instead of one.","8d6",null,"10d6","dark"],
  ["Catastrophe","Animist","Deal blunt damage to enemies within 6 squares and leave them drenched and oiled.","4d6","6d6","8d6","blunt"],
  ["Cold Steal","Thief","Move to one enemy within 12 squares and line of sight; it takes cold damage. Roll d100 on the book's Steal chart for the item gained.","6d6","8d6","10d6","cold"],
  ["Dark Cloud","Occultist","Deal dark damage to enemies within 6 squares and blind them.","4d6","6d6","8d6","dark"],
  ["Dragonlord","Dragoneer","Your dragon companion gains +5 to defences and skill checks and +2 damage dice to attacks and abilities. It can use all its actions each turn for 5 turns or until unconscious."],
  ["Eternal Sonata","Balladeer","You and allies within 12 squares gain a temporary Hero Point, lost if not used by the end of your next turn."],
  ["Evanescence","Spellbreaker","Dispel beneficial effects on enemies and negative effects on allies within 6 squares and line of sight. Summoned enemies in that area are destroyed."],
  ["Foebreaker","Fighter","Move up to 6 squares without provoking counterattacks. At the end, enemies within reach take blunt damage and are slowed; if only one target is in reach, add 2 damage dice.","4d6","6d6","8d6","blunt"],
  ["Forbidden Dance","Dancer","Roll 3d6; each result applies its matching status to all enemies within 6 squares and line of sight: 1 blind, 2 confusion, 3 paralysis, 4 silence, 5 slow, 6 sleep. At level 10 roll 4d6; at level 15 roll 5d6. Apply every result."],
  ["Gasconade","Charlatan","You and allies within 12 squares gain temporary HP and MP until the end of your next turn. Base: 50 HP/25 MP; level 10: 75/50; level 15: 100/75."],
  ["Glory Hound","Champion","Enemies within 6 squares move 4 squares toward you. Those ending within reach take slashing damage and are encumbered until the start of your next turn; others take half damage and are still encumbered.","8d6",null,"10d6","slashing"],
  ["Greased Lightning","Fencer","Move up to 12 squares without provoking counterattacks, ignoring rough terrain and occupied enemy squares. Enemies you pass take electric damage and are paralysed.","8d6",null,"10d6","electric"],
  ["Great Escape","Footpad","Enemies within 6 squares move 2 squares directly away, fall prone, and are stunned. Then you may move up to 12 squares without provoking counterattacks."],
  ["Great Revelation","Academic","Designate one enemy within 12 squares and line of sight. It takes -10 to all defences, skills, and damage rolls until the end of your next turn."],
  ["Heaven's Gate","Priest","You and allies within 6 squares clear all statuses, move up 3 Break Gauge steps, and recover HP equal to one quarter of maximum HP."],
  ["Heaven's Light","Cleric","You and all allies within 12 squares recover HP equal to half their maximum HP."],
  ["Howling Moon","Lycanthropy","Transform into a werewolf. Enemies within 6 squares become flat-footed and lose their primary action until the start of your next turn. Level 10 also removes their secondary action; level 15 removes all actions. Fear effect."],
  ["Last Bastion","Templar","For 3 turns, you resist all physical and elemental damage. Allies within 6 squares are immune to all damage and negative effects. Ends if you die or become unconscious."],
  ["Last Dance","Dervish","Deal slashing damage to enemies within 6 squares. Slashing immunity counts as resistance and resistance is ignored.","8d6",null,"10d6","slashing"],
  ["Last Lullaby","Minstrel","Put enemies within 6 squares to sleep. At the start of each affected creature's turn, it moves down one Break Gauge step to wake; if it would reach the bottom, it is petrified."],
  ["Livewire","Trickster","Deal electric damage to enemies within 6 squares and confuse them.","8d6",null,"10d6","electric"],
  ["Meteor Dive","Lancer","One enemy within 12 squares and line of sight takes fire damage and falls prone. Explosive dice generate two bonus damage dice instead of one. Fire immunity counts as resistance and resistance is ignored.","8d6",null,"10d6","fire"],
  ["Meteor Rain","Thaumaturge","Deal fire damage to enemies within 6 squares and line of sight; they are encumbered until the start of your next turn.","8d6",null,"10d6","fire"],
  ["Mind Wrack","Illusionist","One creature within 12 squares immediately loses all MP."],
  ["Night Raid","Brigand","Move up to 12 squares without provoking counterattacks, ignoring rough terrain and occupied enemy squares. Enemies you pass take dark damage and fall asleep.","8d6",null,"10d6","dark"],
  ["No Mercy","Blackguard","Deal piercing damage to enemies within 6 squares and move them down one Break Gauge step, plus one additional step for every 5 points the damage exceeds their Break Threshold.","8d6",null,"10d6","piercing"],
  ["Overdraw","Archer","Target an enemy at point-blank range. Enemies directly between you take piercing damage and move 2 squares away; if none are between, add 2 damage dice.","4d6","6d6","8d6","piercing"],
  ["Overtrance","Arcanist","You and allies within 12 squares recover MP equal to half their maximum MP."],
  ["Phenomena","Devotee","Choose two allies within 12 squares and line of sight. They may immediately use a Last Resort regardless of current HP, but take no actions on their following turn."],
  ["Primordial Wrath","Conjurer","Your summoned elemental gains +5 to all defences and skill checks and +2 damage dice to attacks and abilities. It can use all its actions each turn for 5 turns or until destroyed."],
  ["Profane Sabbath","Diabolist","Deal dark damage to enemies within 6 squares and line of sight and afflict them with Doom.","8d6",null,"10d6","dark"],
  ["Riot Blade","Barbarian","Deal slashing damage to enemies in a 6-square cone and confuse them.","4d6","6d6","8d6","slashing"],
  ["Ruination","Viking","Deal blunt damage to creatures within 6 squares and knock them prone. Explosive dice generate two bonus damage dice instead of one.","8d6",null,"10d6","blunt"],
  ["Shatterpoint","Uhlan","Move up to 12 squares in a straight line without provoking counterattacks, ignoring rough terrain and occupied squares. Enemies passed take unaspected damage and fall prone.","4d6","6d6","8d6","unaspected"],
  ["Smoke Screen","Scout","You and allies within 12 squares gain total concealment until the end of your next turn. Ends for a creature that targets an enemy with an attack, ability, or spell."],
  ["Soul Rend","Necromant","One living creature within 12 squares and line of sight takes unaspected damage and moves down one Break Gauge step. If killed, summon a wraith without MP cost. At level 15 deal 10d6, move it down 2 steps, and summon a reaper instead.","8d6",null,"10d6","unaspected"],
  ["Spirit Bond","Tamer","Summon an incorporeal version of your most recently owned pet for the encounter; it retains its traits, skills, and abilities. Cannot be used while your companion is present."],
  ["Triangulate","Hunter","You and allies within 12 squares may reroll attack and skill checks against enemies, keeping the higher result, until the end of your next turn."],
  ["Ultimate Guard","Defender","Until the start of your next turn, gain DR and +10 to shield block checks. DR bonus is +5, +10 at level 10, and +15 at level 15."],
  ["Vandal Heart","Saboteur","Enemies within 6 squares have DR 0 until the end of the encounter."],
  ["Wildfire","Skirmisher","Move up to 12 squares without provoking counterattacks. At any point during movement, deal fire damage to enemies within 6 squares; affected targets take half that damage again at the start of your next turn.","8d6",null,"10d6","fire"],
  ["Wildheart","Shapeshifter","As a minor action, take beast form until the encounter ends: +5 to all defences, attacks, and skill checks, and +2 damage dice to all attacks and abilities. Reverting ends this effect."],
  ["Wild Hunt","Beastcaller","Summon 3 beasts of one type in an unoccupied area within 4 squares and line of sight without MP. Their level cannot exceed your companion level. They remain until the start of your next turn; summon 5 at level 15."]
];

export const LAST_RESORTS = powerRows.map(([name, tree, description, baseDamage, level10Damage, level15Damage, damageType]) => ({
  name, tree, description, action: /minor action/i.test(description) ? "Minor Action" : "All-out Action",
  target: description.match(/(?:one|single) (?:enemy|creature|target)[^.]*|allies? within [^.]*|enemies? within [^.]*|all enemies? in a [^.]*|enemies? in a [^.]*|you and allies? within [^.]*/i)?.[0] ?? "See description",
  damageType: damageType ?? "", damageByLevel: baseDamage ? { base: baseDamage, 10: level10Damage ?? baseDamage, 15: level15Damage ?? level10Damage ?? baseDamage } : {},
  automation: baseDamage ? "damage" : /recover|heal/i.test(description) ? "healing" : /MP\./i.test(description) ? "mp-drain" : /Break Gauge/i.test(description) ? "break-gauge" : /summon|dragon companion|elemental|beast form|transform/i.test(description) ? "summon-or-buff" : "effect"
}));

const relicRows = [
  ["Academic's Memoire","Great Revelation",2000,"Exotic"],["Dancer's Memoire","Forbidden Dance",2000,"Exotic"],["Mediator's Memoire","Armistice",2000,"Exotic"],["Minstrel's Memoire","Last Lullaby",2000,"Exotic"],
  ["Animism Writ","Catastrophe",2000,"Exotic"],["Clerical Writ","Heaven's Light",2000,"Exotic"],["Devout Writ","Phenomena",2000,"Exotic"],["Occult Writ","Dark Cloud",2000,"Exotic"],
  ["Arcanist's Enchiridion","Overtrance",2000,"Exotic"],["Conjurer's Enchiridion","Primordial Wrath",2000,"Exotic"],["Elementalist's Enchiridion","Aether Blast",2000,"Exotic"],["Illusionist's Enchiridion","Mind Wrack",2000,"Exotic"],
  ["Archer's Report","Overdraw",2000,"Exotic"],["Hunter's Report","Triangulate",2000,"Exotic"],["Scout's Report","Smoke Screen",2000,"Exotic"],["Tamer's Report","Spirit Bond",2000,"Exotic"],
  ["Charlatan's Memorandum","Gasconade",2000,"Exotic"],["Cutthroat's Memorandum","Bloodbath",2000,"Exotic"],["Footpad's Memorandum","Great Escape",2000,"Exotic"],["Saboteur's Memorandum","Vandal Heart",2000,"Exotic"],["Thief's Memorandum","Cold Steal",2000,"Exotic"],
  ["Barbaric Treatise","Riot Blade",2000,"Exotic"],["Defensive Treatise","Ultimate Guard",2000,"Exotic"],["Fighting Treatise","Foebreaker",2000,"Exotic"],["Uhlan's Treatise","Shatterpoint",2000,"Exotic"],
  ["Antique Music Box","Last Dance",5000,"Epic"],["Petrified Dragon Egg","Dragonlord",5000,"Epic"],["Starsteel Fragment","Meteor Dive",5000,"Epic"],["Ancient Faestone","Wildheart",5000,"Epic"],["Seeing Stone","Wild Hunt",5000,"Epic"],["Cursed Soulstone","Calamity Blast",5000,"Epic"],["Glorious Medal","Glory Hound",5000,"Epic"],["Black Planchette","Soul Rend",5000,"Epic"],["Cleansed Soulstone","Last Bastion",5000,"Epic"],["Black Bag","Night Raid",5000,"Epic"],["Bottled Lightning","Livewire",5000,"Epic"],["Quicksilver Trinket","Greased Lightning",5000,"Epic"],["Obsidian Arrowhead","Arrowstorm",5000,"Epic"],["Antique Emberbox","Wildfire",5000,"Epic"],["Prism Stone","Aeon Flux",5000,"Epic"],["Missing Music","Eternal Sonata",5000,"Epic"],["Corrupted Testament","Profane Sabbath",5000,"Epic"],["Obsidian Skull","Black Mass",5000,"Epic"],["Tainted Grail","Blood Reign",5000,"Epic"],["Moonstone Effigy","Howling Moon",5000,"Epic"]
];

const relicNotes = {
  "Obsidian Skull": "While this relic is in your possession, gain +5 to Spellcraft checks and become a lich.",
  "Tainted Grail": "A non-vampire who attempts to learn Blood Reign from this relic is instead cursed with Vampyrism.",
  "Moonstone Effigy": "A non-werewolf who attempts to learn Howling Moon from this relic is instead cursed with Lycanthropy."
};
export const LAST_RESORT_RELICS = relicRows.map(([name, lastResort, cost, rarity]) => ({
  name, type: "relic", img: "icons/svg/item-bag.svg",
  system: {
    category: "Last Resort Relic", rarity, cost, bulk: 0.1, quantity: 1, equippable: false,
    description: `${relicNotes[name] ? `${relicNotes[name]} ` : ""}A unique relic that teaches ${lastResort}. Studying it takes 8 hours + your Intelligence modifier (minimum 1 hour). This relic is consumed when the study is completed.`,
    relic: { lastResortId: lastResort, studyHoursBase: 8, minimumHours: 1, unique: true, special: relicNotes[name] ?? "" },
    itemEffects: name === "Obsidian Skull" ? { skillBonus: { scope: "spellcraft", value: 5 } } : {}
  }
}));

export function makeLastResortItem(power) {
  return {
    name: power.name, type: "last-resort", img: "icons/svg/aura.svg",
    system: { category: "Last Resort", tree: power.tree, action: power.action, target: power.target, damageByLevel: power.damageByLevel, damageType: power.damageType, automation: power.automation, description: power.description, uses: { perDay: 1 } }
  };
}
