/**
 * Smart Format-Agnostic Parser
 * Uses faction data as a dictionary to find units and options in any text format.
 */

/**
 * Build a searchable index of unit names from faction data
 * @param {Object} factionData - Loaded faction JSON
 * @returns {Map} Map of normalized name -> { unit, category, variations }
 */
export function buildUnitNameIndex(factionData) {
  const index = new Map();

  const categories = ['characters', 'core', 'special', 'rare'];

  for (const category of categories) {
    const units = factionData[category] || [];
    for (const unit of units) {
      const name = unit.name_en || unit.name || '';
      if (!name) continue;

      // Generate variations of the name for matching
      const variations = generateNameVariations(name);

      for (const variation of variations) {
        const key = variation.toLowerCase();
        if (!index.has(key)) {
          index.set(key, {
            unit,
            category,
            originalName: name,
            matchLength: variation.length
          });
        }
      }
    }
  }

  return index;
}

/**
 * Generate variations of a unit name for flexible matching
 * @param {string} name - Original unit name
 * @returns {string[]} Array of name variations
 */
function generateNameVariations(name) {
  const variations = [name];
  const lower = name.toLowerCase();

  // Add lowercase
  variations.push(lower);

  // Handle plurals: "Dryads" -> "Dryad", "Glade Guard" stays same
  if (lower.endsWith('s') && !lower.endsWith('ss')) {
    variations.push(lower.slice(0, -1));
  }
  // Add plural if singular
  if (!lower.endsWith('s')) {
    variations.push(lower + 's');
  }

  // Handle "of the" variations: "Knights of the Realm" -> "Knights Realm"
  if (lower.includes(' of the ')) {
    variations.push(lower.replace(/ of the /g, ' '));
  }
  if (lower.includes(' of ')) {
    variations.push(lower.replace(/ of /g, ' '));
  }

  return [...new Set(variations)];
}

/**
 * Build index of magic items
 * @param {Object} magicItems - Magic items JSON
 * @param {string} factionSlug - Faction identifier
 * @returns {Map} Map of normalized name -> item data
 */
export function buildMagicItemIndex(magicItems, factionSlug) {
  const index = new Map();

  // Process each key in magic items (general, faction-specific, etc.)
  for (const [key, items] of Object.entries(magicItems)) {
    // Items can be an array or an object with nested arrays
    if (Array.isArray(items)) {
      for (const item of items) {
        const name = (item.name_en || item.name || '').toLowerCase();
        if (name) index.set(name, { ...item, source: key });
      }
    } else if (typeof items === 'object') {
      // Nested structure (categories within)
      for (const categoryItems of Object.values(items)) {
        if (Array.isArray(categoryItems)) {
          for (const item of categoryItems) {
            const name = (item.name_en || item.name || '').toLowerCase();
            if (name) index.set(name, { ...item, source: key });
          }
        }
      }
    }
  }

  return index;
}

/**
 * Find all unit matches in the text
 * @param {string} text - Input text
 * @param {Map} unitIndex - Unit name index
 * @returns {Array} Array of { unit, category, startIndex, endIndex, matchedName }
 */
export function findUnitMatches(text, unitIndex) {
  const matches = [];
  const textLower = text.toLowerCase();

  // Sort index entries by length (longest first) to match "Treeman Ancient" before "Treeman"
  const sortedEntries = [...unitIndex.entries()].sort((a, b) => b[0].length - a[0].length);

  // Track which positions have been matched to avoid duplicates
  const matchedRanges = [];

  for (const [nameLower, data] of sortedEntries) {
    let searchStart = 0;

    while (true) {
      const idx = textLower.indexOf(nameLower, searchStart);
      if (idx === -1) break;

      const endIdx = idx + nameLower.length;

      // Check if this position overlaps with an existing match
      const overlaps = matchedRanges.some(([start, end]) =>
        (idx >= start && idx < end) || (endIdx > start && endIdx <= end)
      );

      if (!overlaps) {
        // Verify word boundaries (not in middle of another word)
        const charBefore = idx > 0 ? textLower[idx - 1] : ' ';
        const charAfter = endIdx < textLower.length ? textLower[endIdx] : ' ';

        const isWordBoundary = (ch) => /[\s,.\-\(\)\[\]:;'"0-9]/.test(ch);

        if (isWordBoundary(charBefore) && isWordBoundary(charAfter)) {
          matches.push({
            unit: data.unit,
            category: data.category,
            originalName: data.originalName,
            startIndex: idx,
            endIndex: endIdx,
            matchedName: text.substring(idx, endIdx)
          });
          matchedRanges.push([idx, endIdx]);
        }
      }

      searchStart = idx + 1;
    }
  }

  // Sort by position in text
  matches.sort((a, b) => a.startIndex - b.startIndex);

  return matches;
}

/**
 * Extract context window around a unit match
 * @param {string} text - Full input text
 * @param {number} startIndex - Match start position
 * @param {number} endIndex - Match end position
 * @param {number} nextUnitStart - Start of next unit (or text length)
 * @returns {string} Context text around the unit
 */
function extractContext(text, startIndex, endIndex, nextUnitStart) {
  // Look back up to 50 chars for model count/points
  const lookBack = Math.max(0, startIndex - 50);
  // Look forward until next unit or 500 chars
  const lookForward = Math.min(nextUnitStart, endIndex + 500);

  return text.substring(lookBack, lookForward);
}

/**
 * Extract model count from context
 * Patterns: "20 Dryads", "20x Dryads", "x20", "20 x"
 * @param {string} context - Text around unit name
 * @param {string} unitName - The matched unit name
 * @returns {number|null} Model count or null
 */
function extractModelCount(context, unitName) {
  const unitLower = unitName.toLowerCase();
  const contextLower = context.toLowerCase();

  // Find position of unit name in context
  const unitIdx = contextLower.indexOf(unitLower);
  if (unitIdx === -1) return null;

  // Look for number patterns before the unit name
  const beforeUnit = context.substring(0, unitIdx);

  // Pattern: "20 Dryads" or "20x Dryads" or "20 x Dryads"
  const countMatch = beforeUnit.match(/(\d+)\s*x?\s*$/i);
  if (countMatch) {
    return parseInt(countMatch[1], 10);
  }

  // Pattern: "x20" right before unit
  const xCountMatch = beforeUnit.match(/x\s*(\d+)\s*$/i);
  if (xCountMatch) {
    return parseInt(xCountMatch[1], 10);
  }

  return null;
}

/**
 * Extract points from context
 * Patterns: "[489 pts]", "[489pts]", "489 -", "489 pts", "(489)"
 * @param {string} context - Text around unit name
 * @returns {number|null} Points or null
 */
function extractPoints(context) {
  // Pattern: [XXX pts] or [XXX pt]
  const bracketMatch = context.match(/\[(\d+)\s*pts?\]/i);
  if (bracketMatch) {
    return parseInt(bracketMatch[1], 10);
  }

  // Pattern: (XXX pts)
  const parenMatch = context.match(/\((\d+)\s*pts?\)/i);
  if (parenMatch) {
    return parseInt(parenMatch[1], 10);
  }

  // Pattern: XXX pts (standalone)
  const ptsMatch = context.match(/(\d+)\s*pts?\b/i);
  if (ptsMatch) {
    return parseInt(ptsMatch[1], 10);
  }

  // Pattern: XXX - (BCP format, number at start of line or after newline)
  const bcpMatch = context.match(/(?:^|\n)\s*(\d+)\s*-/);
  if (bcpMatch) {
    return parseInt(bcpMatch[1], 10);
  }

  return null;
}

/**
 * Extract and match equipment/options from context against unit's valid options
 * @param {string} context - Text around unit name
 * @param {Object} unit - Unit data with equipment, options, etc.
 * @param {Map} magicItemIndex - Magic items index
 * @returns {Object} { equipment, options, mounts, command, items, lore, unknownTokens }
 */
function extractOptions(context, unit, magicItemIndex) {
  const result = {
    equipment: [],
    options: [],
    mounts: [],
    command: [],
    items: [],
    lore: null,
    wizardLevel: null,
    unknownTokens: []
  };

  const contextLower = context.toLowerCase();

  // Check equipment options
  if (unit.equipment) {
    for (let i = 0; i < unit.equipment.length; i++) {
      const eq = unit.equipment[i];
      const eqName = (eq.name_en || eq.name || '').toLowerCase();
      if (eqName && contextLower.includes(eqName)) {
        result.equipment.push({ index: i, name: eqName, data: eq });
      }
    }
  }

  // Check armor options
  if (unit.armor) {
    for (let i = 0; i < unit.armor.length; i++) {
      const arm = unit.armor[i];
      const armName = (arm.name_en || arm.name || '').toLowerCase();
      if (armName && contextLower.includes(armName)) {
        result.options.push({ index: i, type: 'armor', name: armName, data: arm });
      }
    }
  }

  // Check mount options
  if (unit.mounts) {
    for (let i = 0; i < unit.mounts.length; i++) {
      const mount = unit.mounts[i];
      const mountName = (mount.name_en || mount.name || '').toLowerCase();
      if (mountName && contextLower.includes(mountName)) {
        result.mounts.push({ index: i, name: mountName, data: mount });
      }
    }
  }

  // Check command options (General, Champion, Standard Bearer, Musician)
  if (unit.command) {
    for (let i = 0; i < unit.command.length; i++) {
      const cmd = unit.command[i];
      const cmdName = (cmd.name_en || cmd.name || '').toLowerCase();
      if (cmdName && contextLower.includes(cmdName)) {
        result.command.push({ index: i, name: cmdName, data: cmd });
      }
    }
    // Also check for "General" keyword
    if (contextLower.includes('general')) {
      const generalIdx = unit.command.findIndex(c =>
        (c.name_en || c.name || '').toLowerCase().includes('general')
      );
      if (generalIdx >= 0 && !result.command.some(c => c.index === generalIdx)) {
        result.command.push({ index: generalIdx, name: 'general', data: unit.command[generalIdx] });
      }
    }
  }

  // Check regular options
  if (unit.options) {
    for (let i = 0; i < unit.options.length; i++) {
      const opt = unit.options[i];
      const optName = (opt.name_en || opt.name || '').toLowerCase();
      if (optName && contextLower.includes(optName)) {
        result.options.push({ index: i, type: 'option', name: optName, data: opt });
      }

      // Check nested options (like wizard levels)
      if (opt.options) {
        for (let j = 0; j < opt.options.length; j++) {
          const subOpt = opt.options[j];
          const subOptName = (subOpt.name_en || subOpt.name || '').toLowerCase();
          if (subOptName && contextLower.includes(subOptName)) {
            result.options.push({
              index: i,
              subIndex: j,
              type: 'nested',
              name: subOptName,
              data: subOpt
            });
          }
        }
      }
    }
  }

  // Check for wizard level patterns
  const wizardMatch = contextLower.match(/(?:level|lvl)\s*(\d)/i);
  if (wizardMatch) {
    result.wizardLevel = parseInt(wizardMatch[1], 10);
  }

  // Check for lore
  const lores = [
    'battle magic', 'daemonology', 'dark magic', 'elementalism',
    'high magic', 'illusion', 'necromancy', 'lore of the wilds',
    'lore of athel loren', 'lore of the horned rat', 'lore of nurgle',
    'lore of slaanesh', 'lore of tzeentch', 'lore of khorne'
  ];
  for (const lore of lores) {
    if (contextLower.includes(lore)) {
      result.lore = lore.replace(/\s+/g, '-');
      break;
    }
  }

  // Check magic items
  for (const [itemName, itemData] of magicItemIndex.entries()) {
    if (contextLower.includes(itemName)) {
      result.items.push({ name: itemName, data: itemData });
    }
  }

  return result;
}

/**
 * Parse text using faction data as dictionary
 * @param {string} text - Raw input text (any format)
 * @param {Object} factionData - Loaded faction JSON
 * @param {Map} magicItemIndex - Magic items index
 * @returns {Object} Parsed list with units and their options
 */
export function parseWithFactionData(text, factionData, magicItemIndex) {
  const unitIndex = buildUnitNameIndex(factionData);
  const matches = findUnitMatches(text, unitIndex);

  const units = [];
  let totalPoints = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].startIndex : text.length;

    // Extract context around this unit
    const context = extractContext(text, match.startIndex, match.endIndex, nextStart);

    // Extract model count
    const modelCount = extractModelCount(context, match.matchedName);

    // Extract points
    const points = extractPoints(context);
    if (points) totalPoints += points;

    // Extract and match options
    const options = extractOptions(context, match.unit, magicItemIndex);

    units.push({
      rawName: match.originalName,
      matchedName: match.matchedName,
      category: match.category,
      unitTemplate: match.unit,
      modelCount: modelCount || 1,
      rawPoints: points || 0,
      context: context.trim(),
      ...options,
      success: true
    });
  }

  return {
    units,
    totalPoints,
    unitCount: units.length
  };
}

export default {
  buildUnitNameIndex,
  buildMagicItemIndex,
  findUnitMatches,
  parseWithFactionData
};
