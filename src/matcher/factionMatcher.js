/**
 * Faction Matcher
 * Maps parsed BCP data to OWB faction data structures.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Load faction data from JSON files
 * @param {string} factionSlug - OWB faction slug (e.g., 'skaven')
 * @returns {Object} Faction data
 */
export function loadFactionData(factionSlug) {
  try {
    return require(`../data/owb/${factionSlug}.json`);
  } catch (e) {
    throw new Error(`Failed to load faction data for: ${factionSlug}`);
  }
}

/**
 * Load magic items data
 * @returns {Object} Magic items data
 */
export function loadMagicItems() {
  return require('../data/owb/magic-items.json');
}

/**
 * Build a searchable index of all units in a faction
 * @param {Object} factionData - Loaded faction data
 * @returns {Map} Map of normalized names to unit templates
 */
export function buildUnitIndex(factionData) {
  const index = new Map();

  const categories = ['characters', 'core', 'special', 'rare', 'mercenaries', 'allies'];

  for (const category of categories) {
    const units = factionData[category] || [];
    for (const unit of units) {
      const key = normalizeString(unit.name_en);
      if (!index.has(key)) {
        index.set(key, { unit, category });
      }
    }
  }

  return index;
}

/**
 * Build a searchable index of all magic items
 * @param {Object} magicItemsData - Loaded magic items data
 * @param {string} factionSlug - Faction slug for faction-specific items
 * @returns {Map} Map of normalized names to item data
 */
export function buildMagicItemsIndex(magicItemsData, factionSlug) {
  const index = new Map();

  // Add general items
  for (const item of magicItemsData.general || []) {
    const key = normalizeString(item.name_en);
    index.set(key, { ...item, source: 'general' });
  }

  // Add faction-specific items
  if (magicItemsData[factionSlug]) {
    for (const item of magicItemsData[factionSlug]) {
      const key = normalizeString(item.name_en);
      index.set(key, { ...item, source: factionSlug });
    }
  }

  // Add special item categories that might apply
  const specialCategories = [
    'forest-spites', 'kindreds', 'vampiric-powers', 'knightly-virtues',
    'elven-honours', 'gifts-of-chaos', 'chaos-mutations', 'chaotic-traits',
    'big-names', 'disciplines-old-ones', 'forbidden-poisons', 'gifts-of-khaine',
    'daemonic-gifts-common', 'daemonic-icons-common',
    'daemonic-gifts-khorne', 'daemonic-icons-khorne',
    'daemonic-gifts-nurgle', 'daemonic-icons-nurgle',
    'daemonic-gifts-slaanesh', 'daemonic-icons-slaanesh',
    'daemonic-gifts-tzeentch', 'daemonic-icons-tzeentch',
    'incantation-scrolls'
  ];

  for (const cat of specialCategories) {
    if (magicItemsData[cat]) {
      for (const item of magicItemsData[cat]) {
        const key = normalizeString(item.name_en);
        if (!index.has(key)) {
          index.set(key, { ...item, source: cat });
        }
      }
    }
  }

  return index;
}

/**
 * Normalize a string for fuzzy matching
 * @param {string} str - Input string
 * @returns {string} Normalized string
 */
export function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '')
    .trim();
}

/**
 * Find the best matching unit for a given name
 * @param {string} rawName - Raw unit name from BCP
 * @param {Map} unitIndex - Unit index from buildUnitIndex
 * @returns {Object|null} Matched unit data or null
 */
export function findUnit(rawName, unitIndex) {
  const normalized = normalizeString(rawName);

  // Exact match
  if (unitIndex.has(normalized)) {
    return unitIndex.get(normalized);
  }

  // Try plural/singular variations
  const variations = [
    normalized,
    normalized.replace(/s$/, ''),           // Remove trailing 's'
    normalized + 's',                        // Add trailing 's'
    normalized.replace(/ies$/, 'y'),         // ponies -> pony
    normalized.replace(/y$/, 'ies'),         // pony -> ponies
    normalized.replace(/men$/, 'man'),       // treemen -> treeman
    normalized.replace(/man$/, 'men'),       // treeman -> treemen
  ];

  for (const variant of variations) {
    if (unitIndex.has(variant)) {
      return unitIndex.get(variant);
    }
  }

  // Fuzzy match: find best substring match
  let bestMatch = null;
  let bestScore = 0;

  for (const [key, value] of unitIndex) {
    const score = fuzzyScore(normalized, key);
    if (score > bestScore && score > 0.7) {
      bestScore = score;
      bestMatch = value;
    }
  }

  return bestMatch;
}

/**
 * Simple fuzzy matching score
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Score between 0 and 1
 */
function fuzzyScore(a, b) {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  // Levenshtein-based similarity
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const distance = levenshtein(a, b);
  return 1 - distance / maxLen;
}

/**
 * Levenshtein distance
 */
function levenshtein(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Token classification result
 * @typedef {Object} ClassifiedToken
 * @property {string} type - Token type (command, equipment, armor, mount, option, item, wizard, lore, banner, unknown)
 * @property {string} raw - Original token text
 * @property {Object|null} match - Matched data from faction/items
 * @property {number|null} index - Index in the matched array (for active flag)
 */

/**
 * Classify tokens against a unit's available options
 * @param {string[]} tokens - Array of token strings from BCP
 * @param {Object} unitTemplate - Unit template from faction data
 * @param {Map} magicItemsIndex - Magic items index
 * @returns {ClassifiedToken[]} Array of classified tokens
 */
export function classifyTokens(tokens, unitTemplate, magicItemsIndex) {
  const results = [];

  for (const token of tokens) {
    const classified = classifyToken(token, unitTemplate, magicItemsIndex);
    results.push(classified);
  }

  return results;
}

/**
 * Classify a single token
 * @param {string} token - Token string
 * @param {Object} unitTemplate - Unit template from faction data
 * @param {Map} magicItemsIndex - Magic items index
 * @returns {ClassifiedToken} Classified token
 */
function classifyToken(token, unitTemplate, magicItemsIndex) {
  const normalized = normalizeString(token);
  const result = { type: 'unknown', raw: token, match: null, index: null };

  // Check for General
  if (normalized === 'general') {
    const commandMatch = findInArray(unitTemplate.command, 'General');
    if (commandMatch) {
      return { type: 'command', raw: token, match: commandMatch.item, index: commandMatch.index };
    }
  }

  // Check for Wizard Level patterns
  const wizardMatch = token.match(/wizard\s*level\s*(\d+)/i) || token.match(/level\s*(\d+)\s*wizard/i);
  if (wizardMatch) {
    const level = parseInt(wizardMatch[1], 10);
    // Look in options for wizard sub-options
    for (let i = 0; i < (unitTemplate.options || []).length; i++) {
      const opt = unitTemplate.options[i];
      if (opt.name_en?.toLowerCase().includes('wizard') && opt.options) {
        for (let j = 0; j < opt.options.length; j++) {
          const subOpt = opt.options[j];
          if (subOpt.name_en?.toLowerCase().includes(`level ${level}`)) {
            return { type: 'wizard', raw: token, match: { parentIndex: i, subIndex: j, option: subOpt }, index: i };
          }
        }
      }
    }
  }

  // Check for magic lores
  const lores = [
    'battle magic', 'battle-magic',
    'daemonology', 'dark magic', 'dark-magic',
    'elementalism', 'high magic', 'high-magic',
    'illusion', 'necromancy',
    'lore of the wilds', 'lore of athel loren',
    'lore of the horned rat', 'lore of nurgle',
    'lore of slaanesh', 'lore of tzeentch', 'lore of khorne'
  ];
  if (lores.some(l => normalized.includes(l.replace(/-/g, ' ')) || normalized.includes(l))) {
    return { type: 'lore', raw: token, match: { lore: token }, index: null };
  }

  // Check command options (champion names, standard bearer, musician)
  const commandMatch = findInArrayFuzzy(unitTemplate.command, token);
  if (commandMatch && commandMatch.score > 0.7) {
    return { type: 'command', raw: token, match: commandMatch.item, index: commandMatch.index };
  }

  // Check mounts
  const mountMatch = findInArrayFuzzy(unitTemplate.mounts, token);
  if (mountMatch && mountMatch.score > 0.7) {
    return { type: 'mount', raw: token, match: mountMatch.item, index: mountMatch.index };
  }

  // Check equipment
  const equipMatch = findInArrayFuzzy(unitTemplate.equipment, token);
  if (equipMatch && equipMatch.score > 0.7) {
    return { type: 'equipment', raw: token, match: equipMatch.item, index: equipMatch.index };
  }

  // Check armor
  const armorMatch = findInArrayFuzzy(unitTemplate.armor, token);
  if (armorMatch && armorMatch.score > 0.7) {
    return { type: 'armor', raw: token, match: armorMatch.item, index: armorMatch.index };
  }

  // Check options
  const optionMatch = findInArrayFuzzy(unitTemplate.options, token);
  if (optionMatch && optionMatch.score > 0.7) {
    return { type: 'option', raw: token, match: optionMatch.item, index: optionMatch.index };
  }

  // Check magic items
  const itemMatch = magicItemsIndex.get(normalized);
  if (itemMatch) {
    return { type: 'item', raw: token, match: itemMatch, index: null };
  }

  // Fuzzy match magic items
  for (const [key, item] of magicItemsIndex) {
    if (fuzzyScore(normalized, key) > 0.8) {
      return { type: 'item', raw: token, match: item, index: null };
    }
  }

  // Check for common patterns
  if (normalized.includes('standard bearer') || normalized.includes('banner bearer')) {
    const cmdMatch = findInArray(unitTemplate.command, 'Standard');
    if (cmdMatch) {
      return { type: 'command', raw: token, match: cmdMatch.item, index: cmdMatch.index };
    }
  }

  if (normalized === 'musician') {
    const cmdMatch = findInArray(unitTemplate.command, 'Musician');
    if (cmdMatch) {
      return { type: 'command', raw: token, match: cmdMatch.item, index: cmdMatch.index };
    }
  }

  // Check if it might be a magic banner (contains "banner" but not matched above)
  if (normalized.includes('banner') && !normalized.includes('bearer')) {
    // It's likely a magic banner - search in magic items
    for (const [key, item] of magicItemsIndex) {
      if (item.type === 'banner' && fuzzyScore(normalized, key) > 0.6) {
        return { type: 'banner', raw: token, match: item, index: null };
      }
    }
  }

  return result;
}

/**
 * Find an item in an array by name_en
 * @param {Array} arr - Array of items with name_en
 * @param {string} searchTerm - Term to search for
 * @returns {Object|null} { item, index } or null
 */
function findInArray(arr, searchTerm) {
  if (!arr) return null;
  const normalized = normalizeString(searchTerm);

  for (let i = 0; i < arr.length; i++) {
    if (arr[i].name_en && normalizeString(arr[i].name_en).includes(normalized)) {
      return { item: arr[i], index: i };
    }
  }
  return null;
}

/**
 * Find best fuzzy match in an array
 * @param {Array} arr - Array of items with name_en
 * @param {string} searchTerm - Term to search for
 * @returns {Object|null} { item, index, score } or null
 */
function findInArrayFuzzy(arr, searchTerm) {
  if (!arr || arr.length === 0) return null;

  const normalized = normalizeString(searchTerm);
  let best = null;
  let bestScore = 0;

  for (let i = 0; i < arr.length; i++) {
    if (!arr[i].name_en) continue;

    const itemNormalized = normalizeString(arr[i].name_en);
    const score = fuzzyScore(normalized, itemNormalized);

    // Also check if searchTerm is contained in the item name
    if (itemNormalized.includes(normalized)) {
      const containScore = 0.85;
      if (containScore > bestScore) {
        bestScore = containScore;
        best = { item: arr[i], index: i, score: containScore };
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = { item: arr[i], index: i, score };
    }
  }

  return best;
}

/**
 * Main matcher class that combines all functionality
 */
export class FactionMatcher {
  constructor(factionSlug) {
    this.factionSlug = factionSlug;
    this.factionData = loadFactionData(factionSlug);
    this.magicItemsData = loadMagicItems();
    this.unitIndex = buildUnitIndex(this.factionData);
    this.magicItemsIndex = buildMagicItemsIndex(this.magicItemsData, factionSlug);
  }

  /**
   * Match a parsed unit to faction data
   * @param {Object} parsedUnit - Parsed unit from BCP parser
   * @returns {Object} Matched unit with classified tokens
   */
  matchUnit(parsedUnit) {
    const unitMatch = findUnit(parsedUnit.rawName, this.unitIndex);

    if (!unitMatch) {
      return {
        success: false,
        rawName: parsedUnit.rawName,
        error: `Unit not found: ${parsedUnit.rawName}`,
        parsedUnit
      };
    }

    const classifiedTokens = classifyTokens(
      parsedUnit.tokens,
      unitMatch.unit,
      this.magicItemsIndex
    );

    // Also classify sub-item tokens if present
    const classifiedSubItems = parsedUnit.subItems.map(sub => ({
      ...sub,
      classifiedTokens: classifyTokens(sub.tokens, unitMatch.unit, this.magicItemsIndex)
    }));

    return {
      success: true,
      rawName: parsedUnit.rawName,
      unitTemplate: unitMatch.unit,
      category: unitMatch.category,
      modelCount: parsedUnit.modelCount,
      rawPoints: parsedUnit.rawPoints,
      classifiedTokens,
      subItems: classifiedSubItems,
      unknownTokens: classifiedTokens.filter(t => t.type === 'unknown').map(t => t.raw)
    };
  }

  /**
   * Match all units from a parsed BCP list
   * @param {Object} parsedList - Parsed list from BCP parser
   * @returns {Object} Full matched list
   */
  matchList(parsedList) {
    const matchedUnits = parsedList.units.map(u => this.matchUnit(u));

    return {
      faction: parsedList.faction,
      factionSlug: this.factionSlug,
      totalPoints: parsedList.totalPoints,
      drops: parsedList.drops,
      secretObjectives: parsedList.secretObjectives,
      units: matchedUnits,
      warnings: matchedUnits
        .filter(u => !u.success || u.unknownTokens?.length > 0)
        .map(u => u.error || `Unknown tokens in ${u.rawName}: ${u.unknownTokens.join(', ')}`)
    };
  }
}

export default FactionMatcher;
