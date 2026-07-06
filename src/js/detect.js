// Faction and Army of Infamy detection.
// Extracted verbatim from index.html (Phase A1) — Phase C replaces the
// hand-maintained configs with generated data indexes.

// Faction detection configuration
export const FACTION_CONFIG = {
  'skaven': {
    names: ['skaven', 'ratmen'],
    abbreviations: ['sk'],
    armiesOfInfamy: ['clan pestilens', 'clan skryre', 'clan moulder', 'clan eshin'],
    uniqueUnits: ['clanrats', 'stormvermin', 'grey seer', 'plague monks', 'rat ogres', 'hell pit abomination', 'warplock', 'plague priest', 'warlock engineer', 'doomwheel', 'screaming bell', 'plague furnace', 'giant rats', 'ratling gun']
  },
  'wood-elf-realms': {
    names: ['wood elves', 'wood elf realms', 'wood elf', 'welves', 'woodies'],
    abbreviations: ['we'],
    armiesOfInfamy: ['host of talsyn', "orion's wild hunt", 'orions wild hunt'],
    uniqueUnits: ['glade guard', 'glade lord', 'eternal guard', 'wardancers', 'waywatchers', 'dryads', 'treeman', 'treekin', 'wild riders', 'warhawk riders', 'branchwraith', 'spellweaver', 'forest dragon']
  },
  'empire-of-man': {
    names: ['empire', 'the empire', 'empire of man', 'the empire of man'],
    abbreviations: ['eom', 'emp'],
    armiesOfInfamy: ['knightly order', 'city-state', 'nuln', 'altdorf', 'middenheim', 'talabheim', 'averland', 'reikland'],
    uniqueUnits: ['state troops', 'halberdiers', 'swordsmen', 'handgunners', 'greatswords', 'reiksguard', 'demigryph', 'steam tank', 'war altar', 'flagellants', 'battle wizard', 'warrior priest', 'grand master', 'general of the empire', 'helblaster', 'helstorm']
  },
  'kingdom-of-bretonnia': {
    names: ['bretonnia', 'kingdom of bretonnia', 'bretonnians'],
    abbreviations: ['bret', 'kob'],
    armiesOfInfamy: ['errantry crusade', 'exiles of leonesse', 'defenders of parravon'],
    uniqueUnits: ['knights of the realm', 'knights errant', 'questing knights', 'grail knights', 'pegasus knights', 'men at arms', 'peasant bowmen', 'trebuchet', 'damsel', 'prophetess', 'paladin', 'bretonnian lord', 'green knight']
  },
  'dwarfen-mountain-holds': {
    names: ['dwarfs', 'dwarves', 'dwarfen mountain holds', 'dwarf', 'dawi'],
    abbreviations: ['dmh', 'dw'],
    armiesOfInfamy: ['karak kadrin', 'zhufbar', 'barak varr', 'karak azul'],
    uniqueUnits: ['dwarf warriors', 'longbeards', 'hammerers', 'ironbreakers', 'slayers', 'thunderers', 'quarrellers', 'irondrakes', 'miners', 'grudge thrower', 'organ gun', 'gyrocopter', 'runelord', 'runesmith', 'thane', 'dwarf lord']
  },
  'high-elf-realms': {
    names: ['high elves', 'high elf realms', 'high elf', 'asur'],
    abbreviations: ['he', 'her'],
    armiesOfInfamy: ['defenders of ulthuan', 'saphery', 'eataine', 'caledor'],
    uniqueUnits: ['silver helms', 'dragon princes', 'swordmasters', 'white lions', 'phoenix guard', 'shadow warriors', 'lothern sea guard', 'ellyrian reavers', 'lion chariot', 'archmage', 'loremaster', 'frostheart phoenix', 'flamespyre phoenix']
  },
  'tomb-kings-of-khemri': {
    names: ['tomb kings', 'tomb kings of khemri', 'khemri', 'nehekhara'],
    abbreviations: ['tk', 'tkok'],
    armiesOfInfamy: ['legion of the sands', 'army of numas'],
    uniqueUnits: ['tomb guard', 'ushabti', 'necropolis knights', 'sepulchral stalkers', 'carrion', 'screaming skull catapult', 'casket of souls', 'warsphinx', 'necrosphinx', 'hierotitan', 'tomb king', 'tomb prince', 'liche priest', 'skeleton chariots']
  },
  'vampire-counts': {
    names: ['vampire counts', 'vampires', 'undead', 'sylvania'],
    abbreviations: ['vc', 'vamps'],
    armiesOfInfamy: ['von carstein', 'blood dragon', 'necrarch', 'lahmian', 'strigoi'],
    uniqueUnits: ['crypt ghouls', 'grave guard', 'black knights', 'blood knights', 'dire wolves', 'fell bats', 'spirit host', 'hexwraiths', 'vargheists', 'crypt horrors', 'mortis engine', 'terrorgheist', 'zombie dragon', 'varghulf', 'vampire lord', 'necromancer', 'wight king', 'cairn wraith', 'tomb banshee', 'wight lord', 'zombies', 'skeletons', 'master necromancer', 'necromantic acolyte', 'corpse cart', 'black coach']
  },
  'warriors-of-chaos': {
    names: ['warriors of chaos', 'chaos warriors', 'chaos', 'hordes of chaos'],
    abbreviations: ['woc', 'cw'],
    armiesOfInfamy: ['khorne', 'nurgle', 'tzeentch', 'slaanesh', 'undivided'],
    uniqueUnits: ['chaos warriors', 'chosen', 'chaos knights', 'chaos chariot', 'gorebeast chariot', 'marauders', 'forsaken', 'chaos spawn', 'dragon ogres', 'chimera', 'daemon prince', 'chaos lord', 'exalted hero', 'chaos sorcerer', 'hellcannon', 'shaggoth']
  },
  'orc-and-goblin-tribes': {
    names: ['orcs and goblins', 'orcs & goblins', 'orc and goblin tribes', 'greenskins', 'orcs', 'goblins'],
    abbreviations: ['o&g', 'ong', 'oag'],
    armiesOfInfamy: ['grimgor', 'wurrzag', 'grom', 'skarsnik'],
    uniqueUnits: ['orc boyz', 'black orcs', 'savage orcs', 'boar boyz', 'night goblins', 'goblin wolf riders', 'spider riders', 'squig hoppers', 'trolls', 'giants', 'doom diver', 'rock lobber', 'arachnarok', 'orc warboss', 'goblin shaman']
  },
  'beastmen-brayherds': {
    names: ['beastmen', 'beastmen brayherds', 'brayherds', 'beasts of chaos'],
    abbreviations: ['bm', 'bob', 'boc'],
    armiesOfInfamy: ['khorngor', 'pestigor', 'tzaangor', 'slaangor'],
    uniqueUnits: ['gors', 'ungors', 'bestigors', 'centigors', 'minotaurs', 'razorgors', 'cygor', 'ghorgon', 'jabberslythe', 'beastlord', 'wargor', 'bray-shaman', 'doombull', 'gorebull']
  },
  'daemons-of-chaos': {
    names: ['daemons', 'daemons of chaos', 'chaos daemons', 'demons'],
    abbreviations: ['doc'],
    armiesOfInfamy: ['khorne daemons', 'nurgle daemons', 'tzeentch daemons', 'slaanesh daemons'],
    uniqueUnits: ['bloodletters', 'bloodcrushers', 'flesh hounds', 'bloodthirster', 'plaguebearers', 'plague drones', 'nurglings', 'great unclean one', 'pink horrors', 'flamers', 'screamers', 'lord of change', 'daemonettes', 'seekers', 'fiends', 'keeper of secrets', 'herald']
  },
  'dark-elves': {
    names: ['dark elves', 'dark elf', 'druchii', 'naggaroth'],
    abbreviations: ['de', 'delves'],
    armiesOfInfamy: ['cult of slaanesh', 'black ark', 'har ganeth'],
    uniqueUnits: ['dreadspears', 'darkshards', 'black guard', 'executioners', 'witch elves', 'shades', 'dark riders', 'cold one knights', 'war hydra', 'kharibdyss', 'black dragon', 'dreadlord', 'supreme sorceress', 'assassin', 'death hag', 'corsairs']
  },
  'lizardmen': {
    names: ['lizardmen', 'lizardman', 'seraphon', 'lustria'],
    abbreviations: ['lm', 'liz'],
    armiesOfInfamy: ['itza', 'hexoatl'],
    uniqueUnits: ['saurus warriors', 'temple guard', 'skinks', 'chameleon skinks', 'kroxigors', 'cold one riders', 'stegadon', 'bastiladon', 'carnosaur', 'salamanders', 'terradons', 'slann', 'saurus oldblood', 'skink priest', 'engine of the gods']
  },
  'ogre-kingdoms': {
    names: ['ogre kingdoms', 'ogres', 'ogre', 'gutbusters'],
    abbreviations: ['ok', 'ogk'],
    armiesOfInfamy: ['great maw'],
    uniqueUnits: ['ogre bulls', 'ironguts', 'leadbelchers', 'maneaters', 'gnoblars', 'gorgers', 'mournfang cavalry', 'stonehorn', 'thundertusk', 'ironblaster', 'tyrant', 'bruiser', 'butcher', 'slaughtermaster', 'firebelly']
  },
  'chaos-dwarfs': {
    names: ['chaos dwarfs', 'chaos dwarves', 'dawi zharr'],
    abbreviations: ['chd', 'chdw'],
    armiesOfInfamy: ['hashut', 'legion of azgorh'],
    uniqueUnits: ['infernal guard', 'hobgoblins', 'bull centaurs', "k'daai", 'iron daemon', 'deathshrieker', 'magma cannon', 'dreadquake mortar', 'sorcerer-prophet', 'daemonsmith']
  },
  'grand-cathay': {
    names: ['cathay', 'grand cathay'],
    abbreviations: ['gc', 'cath'],
    armiesOfInfamy: ['ivory road', 'celestial court'],
    uniqueUnits: ['jade warriors', 'peasant long spearmen', 'iron hail gunners', 'crane gunners', 'celestial dragon guard', 'longma riders', 'terracotta sentinels', 'war compass', 'lord magistrate']
  }
};

export function normalizeFactionName(factionName) {
  if (!factionName) return null;
  const input = factionName.toLowerCase().trim();

  // 1. Try exact match first
  for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
    if (config.names.includes(input)) return slug;
    if (config.abbreviations.includes(input)) return slug;
    for (const aoi of config.armiesOfInfamy) {
      if (input === aoi || input.includes(aoi)) return slug;
    }
  }

  // 2. Try partial matching - check if input contains a faction keyword
  for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
    for (const name of config.names) {
      if (input.includes(name) || name.includes(input)) return slug;
    }
  }

  // 3. Try word-based matching for compound names like "My Skaven List"
  const words = input.split(/[\s\-_:]+/);
  for (const word of words) {
    if (word.length < 2) continue;
    for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
      for (const name of config.names) {
        if (name.split(/\s+/).some(n => n === word)) return slug;
      }
      if (config.abbreviations.includes(word)) return slug;
    }
  }

  return null;
}

export function detectFactionFromUnits(units) {
  if (!units || units.length === 0) return null;
  const unitNames = units.map(u => u.rawName.toLowerCase());
  const scores = {};

  for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
    scores[slug] = 0;
    for (const unitName of unitNames) {
      for (const uniqueUnit of config.uniqueUnits) {
        if (unitName.includes(uniqueUnit) || uniqueUnit.includes(unitName)) {
          scores[slug] += 1;
        }
      }
    }
  }

  let bestSlug = null, bestScore = 0;
  for (const [slug, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestSlug = slug; }
  }
  return bestScore > 0 ? bestSlug : null;
}

export function getFactionSlug(factionName, units = []) {
  let slug = normalizeFactionName(factionName);
  if (!slug && units.length > 0) slug = detectFactionFromUnits(units);
  return slug;
}

// Army of Infamy detection configuration
export const ARMY_OF_INFAMY_DETECTION = {
  'wood-elf-realms': {
    'host-of-talsyn': {
      name: 'Host of Talsyn',
      indicatorUnits: ['dryads', 'treeman', 'treeman ancient', 'branchwraith', 'treekin'],
      counterUnits: ['glade guard', 'glade riders', 'wild riders', 'waywatchers', 'wardancers', 'deepwood scouts'],
      threshold: 0.5
    }
  },
  'skaven': {
    'clan-pestilens': {
      name: 'Clan Pestilens',
      indicatorUnits: ['plague monks', 'plague priest', 'plague furnace', 'plague censer bearers'],
      counterUnits: ['stormvermin', 'warplock jezzails', 'ratling gun', 'doom-flayer'],
      threshold: 0.4
    }
  }
};

export function detectArmyOfInfamy(factionSlug, units) {
  const result = { detected: null, suggestions: [], warnings: [] };
  if (!factionSlug || !units || units.length === 0) return result;

  const armyConfigs = ARMY_OF_INFAMY_DETECTION[factionSlug];
  if (!armyConfigs) return result;

  for (const [armySlug, config] of Object.entries(armyConfigs)) {
    let indicatorCount = 0, counterCount = 0;

    for (const unit of units) {
      const name = unit.rawName.toLowerCase();
      const weight = unit.modelCount || 1;

      for (const indicator of config.indicatorUnits) {
        if (name.includes(indicator)) { indicatorCount += weight; break; }
      }
      for (const counter of config.counterUnits) {
        if (name.includes(counter)) { counterCount += weight; break; }
      }
    }

    const totalWeighted = indicatorCount + counterCount;
    if (totalWeighted > 0) {
      const ratio = indicatorCount / totalWeighted;
      if (ratio >= config.threshold) {
        result.suggestions.push({ slug: armySlug, name: config.name, confidence: ratio });
        if (ratio >= 0.7) {
          result.warnings.push(`This looks like a ${config.name} list (${Math.round(ratio * 100)}% indicator units). Select army composition manually if incorrect.`);
        } else {
          result.warnings.push(`This might be a ${config.name} list. Select army composition manually if needed.`);
        }
      }
    }
  }

  result.suggestions.sort((a, b) => b.confidence - a.confidence);
  if (result.suggestions.length > 0 && result.suggestions[0].confidence >= 0.7) {
    result.detected = result.suggestions[0].slug;
  }
  return result;
}

export function getArmyCompositions(factionSlug) {
  const compositions = [{ slug: factionSlug, name: 'Grand Army' }];
  const config = FACTION_CONFIG[factionSlug];
  if (config && config.armiesOfInfamy) {
    for (const aoi of config.armiesOfInfamy) {
      compositions.push({
        slug: aoi.replace(/\s+/g, '-').toLowerCase(),
        name: aoi.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      });
    }
  }
  return compositions;
}

/**
 * Quick faction detection from raw text using FACTION_CONFIG unique units
 * Priority: 1) Explicit faction name in header, 2) Unit-based scoring
 */
export function detectFactionFromText(text) {
  const lines = text.split('\n');
  const scores = {};

  // Helper: check if a line looks like a unit entry (has points pattern)
  const isUnitLine = (line) => {
    const trimmed = line.trim();
    return /^\d+\s*-\s*.+/.test(trimmed) || /\[\d+\s*pts?\]/.test(trimmed);
  };

  // Step 1: Check first few lines for explicit faction name
  // Only check non-unit lines (faction header shouldn't have points)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim().toLowerCase();
    if (!line || isUnitLine(lines[i])) continue;

    // Clean the line (remove points if present)
    const cleanLine = line.replace(/\s*\[\d+\s*pts?\]\s*$/i, '').trim();

    for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
      // Check exact faction name match
      for (const name of config.names) {
        if (cleanLine === name) {
          return slug;
        }
      }
      // Check abbreviations only on clean header lines (not unit lines)
      for (const abbr of config.abbreviations) {
        if (cleanLine === abbr) return slug;
      }
      // Check armies of infamy
      for (const aoi of config.armiesOfInfamy) {
        if (cleanLine === aoi || cleanLine.includes(aoi)) return slug;
      }
    }
  }

  // Step 2: Unit-based detection (primary method when header doesn't match)
  // Extract unit names from unit lines (lines with points patterns)
  const unitLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // OWB format: "Unit Name [XXX pts]"
    const owbMatch = trimmed.match(/^(.+?)\s*\[\d+\s*pts?\]$/i);
    if (owbMatch) {
      unitLines.push(owbMatch[1].toLowerCase());
      continue;
    }
    // BCP format: "XXX - Unit Name, options..."
    const bcpMatch = trimmed.match(/^\d+\s*-\s*(.+)$/);
    if (bcpMatch) {
      // Take just the unit name part (before first comma)
      const unitPart = bcpMatch[1].split(',')[0].trim().toLowerCase();
      unitLines.push(unitPart);
    }
  }

  // Score each faction by how many unique units match
  for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
    scores[slug] = 0;
    const matchedUnits = new Set();
    for (const unitLine of unitLines) {
      for (const uniqueUnit of config.uniqueUnits) {
        // Use word boundary matching to avoid partial matches
        const regex = new RegExp(`\\b${uniqueUnit.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (regex.test(unitLine) && !matchedUnits.has(uniqueUnit)) {
          matchedUnits.add(uniqueUnit);
          scores[slug] += 1;
        }
      }
    }
  }

  // Pick faction with highest score
  let bestSlug = null, bestScore = 0;
  for (const [slug, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestSlug = slug; }
  }
  return bestScore > 0 ? bestSlug : null;
}

/**
 * Quick Army of Infamy detection from raw text
 */
export function detectArmyOfInfamyFromText(factionSlug, text) {
  const result = { detected: null, suggestions: [], warnings: [] };
  const textLower = text.toLowerCase();

  const armyConfigs = ARMY_OF_INFAMY_DETECTION[factionSlug];
  if (!armyConfigs) return result;

  for (const [armySlug, config] of Object.entries(armyConfigs)) {
    let indicatorCount = 0, counterCount = 0;

    for (const indicator of config.indicatorUnits) {
      const regex = new RegExp(indicator, 'gi');
      const matches = textLower.match(regex);
      if (matches) indicatorCount += matches.length;
    }
    for (const counter of config.counterUnits) {
      const regex = new RegExp(counter, 'gi');
      const matches = textLower.match(regex);
      if (matches) counterCount += matches.length;
    }

    const total = indicatorCount + counterCount;
    if (total > 0) {
      const ratio = indicatorCount / total;
      if (ratio >= config.threshold) {
        result.suggestions.push({ slug: armySlug, name: config.name, confidence: ratio });
        if (ratio >= 0.7) {
          result.warnings.push(`This looks like a ${config.name} list. Select army composition manually if incorrect.`);
        } else {
          result.warnings.push(`This might be a ${config.name} list.`);
        }
      }
    }
  }

  if (result.suggestions.length > 0 && result.suggestions[0].confidence >= 0.7) {
    result.detected = result.suggestions[0].slug;
  }
  return result;
}
