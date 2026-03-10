/**
 * BCP Text Parser
 * Parses Best Coast Pairings army list text AND OWB/NR text export formats.
 */

/**
 * Detect if text uses OWB/NR format (++ Category [pts] ++)
 * @param {string} text - Raw list text
 * @returns {boolean}
 */
function isOWBFormat(text) {
  return /^\+\+\s*.+\s*\[\d+\s*pts?\]\s*\+\+/m.test(text);
}

/**
 * Check if a line is a section header (++ Category [pts] ++)
 * @param {string} line - Line to check
 * @returns {Object|null} { category, points } or null
 */
function parseSectionHeader(line) {
  const match = line.match(/^\+\+\s*(.+?)\s*\[(\d+)\s*pts?\]\s*\+\+$/i);
  if (match) {
    return {
      category: match[1].toLowerCase().trim(),
      points: parseInt(match[2], 10)
    };
  }
  return null;
}

/**
 * Parse OWB/NR format text
 * @param {string} text - Raw list text
 * @returns {Object} Parsed list structure
 */
function parseOWBFormat(text) {
  const lines = text.split(/\r?\n/);

  const result = {
    faction: null,
    totalPoints: 0,
    drops: null,
    secretObjectives: [],
    units: [],
    warnings: []
  };

  let currentUnit = null;
  let currentCategory = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check for section header: ++ Characters [1284 pts] ++
    const sectionHeader = parseSectionHeader(line);
    if (sectionHeader) {
      // Save previous unit
      if (currentUnit) {
        result.units.push(currentUnit);
        currentUnit = null;
      }
      currentCategory = sectionHeader.category;
      continue;
    }

    // Check for unit line: "Unit Name [XXX pts]" or "20 Dryads [265 pts]"
    const unitMatch = line.match(/^(.+?)\s*\[(\d+)\s*pts?\]$/i);
    if (unitMatch) {
      // Save previous unit
      if (currentUnit) {
        result.units.push(currentUnit);
      }

      let rawName = unitMatch[1].trim();
      const points = parseInt(unitMatch[2], 10);

      // Check if name starts with a model count (e.g., "20 Dryads")
      let modelCount = null;
      const countMatch = rawName.match(/^(\d+)\s+(.+)$/);
      if (countMatch) {
        modelCount = parseInt(countMatch[1], 10);
        rawName = countMatch[2].trim();
      }

      currentUnit = {
        rawPoints: points,
        rawName: rawName,
        modelCount: modelCount,
        tokens: [],
        subItems: [],
        category: currentCategory
      };
      result.totalPoints += points;
      continue;
    }

    // Check for options line: (option1, option2, ...)
    const optionsMatch = line.match(/^\((.+)\)$/);
    if (optionsMatch && currentUnit) {
      const optionText = optionsMatch[1];
      const tokens = optionText.split(',').map(t => t.trim()).filter(t => t);
      currentUnit.tokens.push(...tokens);
      continue;
    }

    // Check if line looks like a faction header (no brackets, no ++, appears before any sections)
    if (!currentCategory && !result.faction && !line.startsWith('++') && !line.includes('[')) {
      result.faction = line;
      continue;
    }
  }

  // Don't forget the last unit
  if (currentUnit) {
    result.units.push(currentUnit);
  }

  return result;
}

/**
 * Parse BCP text into structured intermediate format
 * Supports both BCP format and OWB/NR text export format
 * @param {string} text - Raw BCP list text
 * @returns {Object} Parsed list structure
 */
export function parseBCPText(text) {
  // Detect format and use appropriate parser
  if (isOWBFormat(text)) {
    return parseOWBFormat(text);
  }

  const lines = text.split(/\r?\n/);

  const result = {
    faction: null,
    totalPoints: 0,
    drops: null,
    secretObjectives: [],
    units: [],
    warnings: []
  };

  let currentUnit = null;
  let inSecretObjectives = false;
  let factionDetected = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Skip section headers in BCP format (shouldn't happen often but be safe)
    if (parseSectionHeader(line)) {
      continue;
    }

    // First non-empty line is the faction name (but not if it looks like a section header)
    if (!factionDetected) {
      result.faction = line;
      factionDetected = true;
      continue;
    }

    // Check for drops line (e.g., "8 drops")
    const dropsMatch = line.match(/^(\d+)\s*drops?$/i);
    if (dropsMatch) {
      result.drops = parseInt(dropsMatch[1], 10);
      continue;
    }

    // Check for Secret Objectives header
    if (line.toLowerCase() === 'secret objectives') {
      inSecretObjectives = true;
      continue;
    }

    // Check for unit entry line (points - name pattern)
    const unitMatch = line.match(/^(\d+)\s*-\s*(.+)$/);
    if (unitMatch) {
      // End secret objectives section when we hit a unit line
      inSecretObjectives = false;

      // Save previous unit if exists
      if (currentUnit) {
        result.units.push(currentUnit);
      }

      const points = parseInt(unitMatch[1], 10);
      const remainder = unitMatch[2].trim();

      currentUnit = parseUnitLine(points, remainder);
      result.totalPoints += points;
      continue;
    }

    // Check for sub-item line (bullet point)
    const subItemMatch = line.match(/^[•\-\*]\s*(.+)$/);
    if (subItemMatch && currentUnit) {
      const subItem = parseSubItemLine(subItemMatch[1]);
      currentUnit.subItems.push(subItem);
      continue;
    }

    // If in secret objectives section, collect objective names
    if (inSecretObjectives) {
      result.secretObjectives.push(line);
      continue;
    }

    // Unrecognized line - could be a continuation or malformed
    // Try to be forgiving - if it looks like a sub-item without bullet, treat it as one
    if (currentUnit && line.match(/^\d+x\s/i)) {
      const subItem = parseSubItemLine(line);
      currentUnit.subItems.push(subItem);
      continue;
    }
  }

  // Don't forget the last unit
  if (currentUnit) {
    result.units.push(currentUnit);
  }

  return result;
}

/**
 * Parse a unit entry line (after the "points - " prefix)
 * @param {number} points - Points cost from the line
 * @param {string} remainder - Everything after "points - "
 * @returns {Object} Parsed unit object
 */
function parseUnitLine(points, remainder) {
  // Check if it starts with a number (model count) followed by unit name
  // e.g., "31 Clanrats" or "25 Plague Monks, ..."
  const countMatch = remainder.match(/^(\d+)\s+([A-Za-z].*)$/);

  let modelCount = null;
  let nameAndTokens;

  if (countMatch) {
    modelCount = parseInt(countMatch[1], 10);
    nameAndTokens = countMatch[2];
  } else {
    // No model count - this is a character/single model
    nameAndTokens = remainder;
  }

  // Split by comma to get name and tokens
  const parts = nameAndTokens.split(',').map(p => p.trim()).filter(p => p);

  const rawName = parts[0];
  const tokens = parts.slice(1);

  return {
    rawPoints: points,
    rawName: rawName,
    modelCount: modelCount,
    tokens: tokens,
    subItems: []
  };
}

/**
 * Parse a sub-item line (model details within a unit)
 * @param {string} line - The sub-item text (without bullet)
 * @returns {Object} Parsed sub-item object
 */
function parseSubItemLine(line) {
  // Pattern: "30x Clanrat, Shield, Clawleader, Standard Bearer, Musician"
  // or: "1x Weapon Team"
  // or: "1x Weapon Team Crew, Ratling Gun"

  const countMatch = line.match(/^(\d+)x?\s+(.+)$/i);

  if (countMatch) {
    const count = parseInt(countMatch[1], 10);
    const remainder = countMatch[2];

    // Split by comma
    const parts = remainder.split(',').map(p => p.trim()).filter(p => p);
    const name = parts[0];
    const tokens = parts.slice(1);

    return {
      count: count,
      name: name,
      tokens: tokens
    };
  }

  // Fallback: no count found, treat whole line as name
  const parts = line.split(',').map(p => p.trim()).filter(p => p);
  return {
    count: null,
    name: parts[0],
    tokens: parts.slice(1)
  };
}

/**
 * Faction detection configuration
 */
const FACTION_CONFIG = {
  'skaven': {
    slug: 'skaven',
    names: ['skaven', 'ratmen'],
    abbreviations: ['sk'],
    armiesOfInfamy: ['clan pestilens', 'clan skryre', 'clan moulder', 'clan eshin'],
    uniqueUnits: ['clanrats', 'stormvermin', 'grey seer', 'plague monks', 'rat ogres', 'hell pit abomination', 'warplock', 'plague priest', 'warlock engineer', 'doomwheel', 'screaming bell', 'plague furnace', 'giant rats', 'ratling gun', 'warpfire thrower', 'jezzail']
  },
  'wood-elf-realms': {
    slug: 'wood-elf-realms',
    names: ['wood elves', 'wood elf realms', 'wood elf', 'welves', 'woodies'],
    abbreviations: ['we'],
    armiesOfInfamy: ['host of talsyn', "orion's wild hunt", 'orions wild hunt'],
    uniqueUnits: ['glade guard', 'glade lord', 'eternal guard', 'wardancers', 'waywatchers', 'dryads', 'treeman', 'treekin', 'wild riders', 'warhawk riders', 'great eagle', 'sisters of the thorn', 'branchwraith', 'spellweaver', 'forest dragon']
  },
  'empire-of-man': {
    slug: 'empire-of-man',
    names: ['empire', 'the empire', 'empire of man', 'the empire of man'],
    abbreviations: ['eom', 'emp'],
    armiesOfInfamy: ['knightly order', 'city-state', 'nuln', 'altdorf', 'middenheim', 'talabheim', 'averland', 'stirland', 'wissenland', 'ostland', 'ostermark', 'hochland', 'nordland', 'reikland'],
    uniqueUnits: ['state troops', 'halberdiers', 'swordsmen', 'spearmen', 'handgunners', 'crossbowmen', 'greatswords', 'reiksguard', 'demigryph', 'steam tank', 'war altar', 'flagellants', 'outriders', 'pistoliers', 'battle wizard', 'warrior priest', 'grand master', 'general of the empire', 'captain of the empire', 'knights of the inner circle', 'helblaster', 'helstorm', 'mortar', 'great cannon']
  },
  'kingdom-of-bretonnia': {
    slug: 'kingdom-of-bretonnia',
    names: ['bretonnia', 'kingdom of bretonnia', 'bretonnians'],
    abbreviations: ['bret', 'kob'],
    armiesOfInfamy: ['errantry crusade', 'exiles of leonesse', 'defenders of parravon'],
    uniqueUnits: ['knights of the realm', 'knights errant', 'questing knights', 'grail knights', 'pegasus knights', 'battle pilgrims', 'men at arms', 'peasant bowmen', 'trebuchet', 'damsel', 'prophetess', 'paladin', 'bretonnian lord', 'green knight', 'grail reliquae', 'mounted yeomen']
  },
  'dwarfen-mountain-holds': {
    slug: 'dwarfen-mountain-holds',
    names: ['dwarfs', 'dwarves', 'dwarfen mountain holds', 'dwarf', 'dawi'],
    abbreviations: ['dmh', 'dw'],
    armiesOfInfamy: ['karak kadrin', 'zhufbar', 'barak varr', 'karak azul', 'karak hirn'],
    uniqueUnits: ['dwarf warriors', 'longbeards', 'hammerers', 'ironbreakers', 'slayers', 'thunderers', 'quarrellers', 'irondrakes', 'miners', 'grudge thrower', 'cannon', 'organ gun', 'flame cannon', 'gyrocopter', 'gyrobomber', 'runelord', 'runesmith', 'thane', 'dwarf lord', 'master engineer', 'daemon slayer', 'dragon slayer']
  },
  'high-elf-realms': {
    slug: 'high-elf-realms',
    names: ['high elves', 'high elf realms', 'high elf', 'asur'],
    abbreviations: ['he', 'her'],
    armiesOfInfamy: ['defenders of ulthuan', 'saphery', 'eataine', 'caledor', 'nagarythe'],
    uniqueUnits: ['spearmen', 'archers', 'silver helms', 'dragon princes', 'swordmasters', 'white lions', 'phoenix guard', 'shadow warriors', 'lothern sea guard', 'ellyrian reavers', 'great eagle', 'lion chariot', 'tiranoc chariot', 'repeater bolt thrower', 'archmage', 'mage', 'prince', 'noble', 'anointed', 'loremaster', 'frostheart phoenix', 'flamespyre phoenix', 'dragon', 'moon dragon', 'sun dragon', 'star dragon']
  },
  'tomb-kings-of-khemri': {
    slug: 'tomb-kings-of-khemri',
    names: ['tomb kings', 'tomb kings of khemri', 'khemri', 'nehekhara'],
    abbreviations: ['tk', 'tkok'],
    armiesOfInfamy: ['legion of the sands', 'army of numas', 'army of mahrak'],
    uniqueUnits: ['skeleton warriors', 'skeleton archers', 'tomb guard', 'ushabti', 'necropolis knights', 'sepulchral stalkers', 'carrion', 'screaming skull catapult', 'casket of souls', 'warsphinx', 'necrosphinx', 'hierotitan', 'bone giant', 'tomb king', 'tomb prince', 'liche priest', 'tomb herald', 'necrotect', 'skeleton horsemen', 'skeleton horse archers', 'skeleton chariots']
  },
  'vampire-counts': {
    slug: 'vampire-counts',
    names: ['vampire counts', 'vampires', 'undead', 'sylvania'],
    abbreviations: ['vc', 'vamps'],
    armiesOfInfamy: ['von carstein', 'blood dragon', 'necrarch', 'lahmian', 'strigoi'],
    uniqueUnits: ['skeleton warriors', 'zombies', 'crypt ghouls', 'grave guard', 'black knights', 'blood knights', 'dire wolves', 'fell bats', 'bat swarms', 'spirit host', 'hexwraiths', 'vargheists', 'crypt horrors', 'mortis engine', 'corpse cart', 'black coach', 'terrorgheist', 'zombie dragon', 'varghulf', 'vampire lord', 'vampire', 'necromancer', 'master necromancer', 'wight king', 'strigoi ghoul king', 'banshee']
  },
  'warriors-of-chaos': {
    slug: 'warriors-of-chaos',
    names: ['warriors of chaos', 'chaos warriors', 'chaos', 'hordes of chaos'],
    abbreviations: ['woc', 'cw'],
    armiesOfInfamy: ['khorne', 'nurgle', 'tzeentch', 'slaanesh', 'undivided'],
    uniqueUnits: ['chaos warriors', 'chosen', 'chaos knights', 'chaos chariot', 'gorebeast chariot', 'chaos warhounds', 'marauders', 'marauder horsemen', 'forsaken', 'chaos spawn', 'dragon ogres', 'chimera', 'manticore', 'daemon prince', 'chaos lord', 'exalted hero', 'chaos sorcerer', 'chaos sorcerer lord', 'hellcannon', 'chaos warshrine', 'shaggoth', 'mutalith', 'slaughterbrute']
  },
  'orc-and-goblin-tribes': {
    slug: 'orc-and-goblin-tribes',
    names: ['orcs and goblins', 'orcs & goblins', 'orc and goblin tribes', 'greenskins', 'orcs', 'goblins'],
    abbreviations: ['o&g', 'ong', 'oag', 'greenskinz'],
    armiesOfInfamy: ['grimgor', 'wurrzag', 'grom', 'skarsnik', 'black orc waaagh', 'savage orc waaagh', 'night goblin horde'],
    uniqueUnits: ['orc boyz', 'orc arrer boyz', 'black orcs', 'savage orcs', 'savage orc boar boyz', 'boar boyz', 'orc boar chariot', 'goblins', 'night goblins', 'forest goblins', 'goblin wolf riders', 'spider riders', 'squig hoppers', 'squig herd', 'fanatics', 'trolls', 'giants', 'doom diver', 'rock lobber', 'snotlings', 'pump wagon', 'arachnarok', 'orc warboss', 'orc great shaman', 'goblin big boss', 'goblin shaman', 'night goblin warboss']
  },
  'beastmen-brayherds': {
    slug: 'beastmen-brayherds',
    names: ['beastmen', 'beastmen brayherds', 'brayherds', 'beasts of chaos'],
    abbreviations: ['bm', 'bob', 'boc'],
    armiesOfInfamy: ['khorngor', 'pestigor', 'tzaangor', 'slaangor'],
    uniqueUnits: ['gors', 'ungors', 'bestigors', 'centigors', 'minotaurs', 'razorgors', 'harpies', 'chaos warhounds', 'chaos spawn', 'cygor', 'ghorgon', 'jabberslythe', 'beastlord', 'wargor', 'bray-shaman', 'great bray-shaman', 'doombull', 'gorebull']
  },
  'daemons-of-chaos': {
    slug: 'daemons-of-chaos',
    names: ['daemons', 'daemons of chaos', 'chaos daemons', 'demons'],
    abbreviations: ['doc', 'cd'],
    armiesOfInfamy: ['khorne daemons', 'nurgle daemons', 'tzeentch daemons', 'slaanesh daemons'],
    uniqueUnits: ['bloodletters', 'bloodcrushers', 'flesh hounds', 'bloodthirster', 'skull cannon', 'plaguebearers', 'plague drones', 'nurglings', 'beasts of nurgle', 'great unclean one', 'pink horrors', 'blue horrors', 'flamers', 'screamers', 'burning chariot', 'lord of change', 'daemonettes', 'seekers', 'fiends', 'seeker chariot', 'keeper of secrets', 'daemon prince', 'herald']
  },
  'dark-elves': {
    slug: 'dark-elves',
    names: ['dark elves', 'dark elf', 'druchii', 'naggaroth'],
    abbreviations: ['de', 'delves'],
    armiesOfInfamy: ['cult of slaanesh', 'black ark', 'har ganeth', 'karond kar', 'hag graef'],
    uniqueUnits: ['dreadspears', 'darkshards', 'bleakswords', 'black guard', 'executioners', 'witch elves', 'shades', 'dark riders', 'cold one knights', 'cold one chariot', 'war hydra', 'kharibdyss', 'black dragon', 'reaper bolt thrower', 'cauldron of blood', 'dreadlord', 'master', 'supreme sorceress', 'sorceress', 'assassin', 'death hag', 'khainite', 'corsairs', 'harpies']
  },
  'lizardmen': {
    slug: 'lizardmen',
    names: ['lizardmen', 'lizardman', 'seraphon', 'lustria'],
    abbreviations: ['lm', 'liz'],
    armiesOfInfamy: ['itza', 'hexoatl', 'xlanhuapec', 'temple guard host'],
    uniqueUnits: ['saurus warriors', 'saurus cavalry', 'temple guard', 'skinks', 'skink skirmishers', 'chameleon skinks', 'kroxigors', 'cold one riders', 'stegadon', 'bastiladon', 'carnosaur', 'salamanders', 'razordons', 'ripperdactyls', 'terradons', 'slann mage-priest', 'saurus oldblood', 'saurus scar-veteran', 'skink chief', 'skink priest', 'engine of the gods', 'ancient stegadon', 'troglodon']
  },
  'ogre-kingdoms': {
    slug: 'ogre-kingdoms',
    names: ['ogre kingdoms', 'ogres', 'ogre', 'gutbusters'],
    abbreviations: ['ok', 'ogk'],
    armiesOfInfamy: ['great maw', 'fire belly', 'thundertusk'],
    uniqueUnits: ['ogre bulls', 'ironguts', 'leadbelchers', 'maneaters', 'gnoblars', 'gnoblar trappers', 'sabretusks', 'gorgers', 'mournfang cavalry', 'stonehorn', 'thundertusk', 'ironblaster', 'scraplauncher', 'tyrant', 'bruiser', 'butcher', 'slaughtermaster', 'firebelly', 'hunter']
  },
  'chaos-dwarfs': {
    slug: 'chaos-dwarfs',
    names: ['chaos dwarfs', 'chaos dwarves', 'dawi zharr', 'zharr-naggrund'],
    abbreviations: ['chd', 'chdw'],
    armiesOfInfamy: ['hashut', 'legion of azgorh'],
    uniqueUnits: ['infernal guard', 'hobgoblins', 'hobgoblin wolf riders', 'bull centaurs', "k'daai fireborn", "k'daai destroyer", 'iron daemon', 'deathshrieker', 'magma cannon', 'hellcannon', 'dreadquake mortar', 'sorcerer-prophet', 'daemonsmith', 'infernal castellan', 'bull centaur taur\'uk', 'hobgoblin khan']
  },
  'grand-cathay': {
    slug: 'grand-cathay',
    names: ['cathay', 'grand cathay'],
    abbreviations: ['gc', 'cath'],
    armiesOfInfamy: ['ivory road', 'celestial court', 'terracotta sentinel'],
    uniqueUnits: ['jade warriors', 'peasant long spearmen', 'iron hail gunners', 'crane gunners', 'celestial dragon guard', 'dragon-blooded shugengan', 'astromancer', 'longma riders', 'terracotta sentinels', 'war compass', 'great longma', 'dragon emperor', 'moon empress', 'lord magistrate']
  }
};

/**
 * Normalize faction name to OWB slug with robust matching
 * @param {string} factionName - Raw faction name from BCP
 * @returns {string|null} OWB faction slug or null if not found
 */
export function normalizeFactionName(factionName) {
  if (!factionName) return null;

  const input = factionName.toLowerCase().trim();

  // 1. Try exact match first
  for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
    // Check main names
    if (config.names.includes(input)) {
      return slug;
    }
    // Check abbreviations
    if (config.abbreviations.includes(input)) {
      return slug;
    }
    // Check armies of infamy
    for (const aoi of config.armiesOfInfamy) {
      if (input === aoi || input.includes(aoi)) {
        return slug;
      }
    }
  }

  // 2. Try partial/fuzzy matching - check if input contains a faction keyword
  for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
    // Check if any faction name is contained in the input
    for (const name of config.names) {
      if (input.includes(name) || name.includes(input)) {
        return slug;
      }
    }
  }

  // 3. Try word-based matching for compound names like "My Skaven List"
  const words = input.split(/[\s\-_:]+/);
  for (const word of words) {
    if (word.length < 2) continue;
    for (const [slug, config] of Object.entries(FACTION_CONFIG)) {
      for (const name of config.names) {
        // Single word match for core faction names
        if (name.split(/\s+/).some(n => n === word)) {
          return slug;
        }
      }
      // Check abbreviations
      if (config.abbreviations.includes(word)) {
        return slug;
      }
    }
  }

  return null;
}

/**
 * Detect faction from unit names in the list
 * @param {Object[]} units - Parsed units array
 * @returns {string|null} OWB faction slug or null if not detected
 */
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

  // Find the faction with the highest score
  let bestSlug = null;
  let bestScore = 0;
  for (const [slug, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestSlug = slug;
    }
  }

  return bestScore > 0 ? bestSlug : null;
}

/**
 * Get faction slug with fallback to unit-based detection
 * @param {string} factionName - Raw faction name from header
 * @param {Object[]} units - Parsed units array (optional, for fallback)
 * @returns {string|null} OWB faction slug
 */
export function getFactionSlug(factionName, units = []) {
  // Try header-based detection first
  let slug = normalizeFactionName(factionName);

  // Fall back to unit-based detection
  if (!slug && units.length > 0) {
    slug = detectFactionFromUnits(units);
  }

  return slug;
}

/**
 * Army of Infamy detection configuration
 * Maps faction slugs to their armies of infamy with unit-based detection rules
 */
const ARMY_OF_INFAMY_DETECTION = {
  'wood-elf-realms': {
    'host-of-talsyn': {
      name: 'Host of Talsyn',
      // Units that indicate this army of infamy
      indicatorUnits: ['dryads', 'treeman', 'treeman ancient', 'branchwraith', 'treekin'],
      // Units that indicate it's NOT this army (standard wood elf units)
      counterUnits: ['glade guard', 'glade riders', 'wild riders', 'waywatchers', 'wardancers', 'deepwood scouts'],
      // Threshold: if indicator ratio > this, suggest this army
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
  // Add more factions as needed
};

/**
 * Detect Army of Infamy from unit composition
 * @param {string} factionSlug - The faction slug
 * @param {Object[]} units - Parsed units array
 * @returns {Object} { detected: string|null, suggestions: Array, warnings: Array }
 */
export function detectArmyOfInfamy(factionSlug, units) {
  const result = {
    detected: null,
    suggestions: [],
    warnings: []
  };

  if (!factionSlug || !units || units.length === 0) return result;

  const armyConfigs = ARMY_OF_INFAMY_DETECTION[factionSlug];
  if (!armyConfigs) return result;

  // Get all unit names (lowercase)
  const unitNames = units.map(u => u.rawName.toLowerCase());

  for (const [armySlug, config] of Object.entries(armyConfigs)) {
    let indicatorCount = 0;
    let counterCount = 0;
    let totalUnits = units.length;

    // Count indicator units (weighted by model count if available)
    for (const unit of units) {
      const name = unit.rawName.toLowerCase();
      const weight = unit.modelCount || 1;

      for (const indicator of config.indicatorUnits) {
        if (name.includes(indicator)) {
          indicatorCount += weight;
          break;
        }
      }

      for (const counter of config.counterUnits) {
        if (name.includes(counter)) {
          counterCount += weight;
          break;
        }
      }
    }

    // Calculate ratio
    const totalWeighted = indicatorCount + counterCount;
    if (totalWeighted > 0) {
      const ratio = indicatorCount / totalWeighted;

      if (ratio >= config.threshold) {
        result.suggestions.push({
          slug: armySlug,
          name: config.name,
          confidence: ratio,
          indicatorCount,
          counterCount
        });

        // Add warning for user
        if (ratio >= 0.7) {
          result.warnings.push(
            `This looks like a ${config.name} list (${Math.round(ratio * 100)}% indicator units). ` +
            `Select your army composition manually if this is incorrect.`
          );
        } else if (ratio >= config.threshold) {
          result.warnings.push(
            `This might be a ${config.name} list. Select your army composition manually if needed.`
          );
        }
      }
    }
  }

  // Sort suggestions by confidence
  result.suggestions.sort((a, b) => b.confidence - a.confidence);

  // Set detected if high confidence
  if (result.suggestions.length > 0 && result.suggestions[0].confidence >= 0.7) {
    result.detected = result.suggestions[0].slug;
  }

  return result;
}

/**
 * Get available army compositions for a faction
 * @param {string} factionSlug - The faction slug
 * @returns {Array} Array of { slug, name } objects
 */
export function getArmyCompositions(factionSlug) {
  const compositions = [
    { slug: factionSlug, name: 'Grand Army' }
  ];

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

export default { parseBCPText, normalizeFactionName, detectFactionFromUnits, getFactionSlug, detectArmyOfInfamy, getArmyCompositions };
