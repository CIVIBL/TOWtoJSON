/**
 * OWB JSON Generator
 * Generates Old World Builder importable JSON from matched unit data.
 */

/**
 * Generate a random alphanumeric ID suffix
 * @param {number} length - Length of the suffix
 * @returns {string} Random suffix
 */
function generateIdSuffix(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random list ID
 * @returns {string} Random list ID
 */
function generateListId() {
  return generateIdSuffix(8);
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Build a unit for the OWB JSON from matched data
 * @param {Object} matchedUnit - Matched unit from FactionMatcher
 * @returns {Object} OWB-formatted unit object
 */
function buildUnit(matchedUnit) {
  // Deep clone the template to avoid mutations
  const unit = deepClone(matchedUnit.unitTemplate);

  // Generate unique ID with suffix
  const baseId = unit.id;
  unit.id = `${baseId}.${generateIdSuffix()}`;

  // Set strength (model count)
  unit.strength = matchedUnit.modelCount || 1;

  // Process classified tokens to set active flags and add items
  const magicItems = [];
  let activeLore = null;

  for (const token of matchedUnit.classifiedTokens) {
    switch (token.type) {
      case 'command':
        activateCommand(unit, token);
        break;
      case 'equipment':
        activateEquipment(unit, token);
        break;
      case 'armor':
        activateArmor(unit, token);
        break;
      case 'mount':
        activateMount(unit, token);
        break;
      case 'option':
        activateOption(unit, token);
        break;
      case 'wizard':
        activateWizard(unit, token);
        break;
      case 'lore':
        activeLore = extractLoreName(token.raw);
        break;
      case 'item':
      case 'banner':
        magicItems.push(token.match);
        break;
    }
  }

  // Also process sub-item tokens (for command options on ranked units)
  for (const subItem of matchedUnit.subItems || []) {
    for (const token of subItem.classifiedTokens || []) {
      switch (token.type) {
        case 'command':
          activateCommand(unit, token);
          break;
        case 'option':
          activateOption(unit, token);
          break;
        case 'equipment':
          activateEquipment(unit, token);
          break;
        case 'item':
        case 'banner':
          magicItems.push(token.match);
          break;
      }
    }
  }

  // Set active lore if wizard
  if (activeLore && unit.lores) {
    unit.activeLore = activeLore;
  }

  // Add magic items to the appropriate items[] slot
  if (magicItems.length > 0) {
    addMagicItems(unit, magicItems);
  }

  // Ensure all arrays have proper id fields
  ensureIds(unit.command);
  ensureIds(unit.equipment);
  ensureIds(unit.armor);
  ensureIds(unit.options);
  ensureIds(unit.mounts);

  return unit;
}

/**
 * Activate a command option (General, Champion, Standard Bearer, Musician)
 */
function activateCommand(unit, token) {
  if (!unit.command || token.index === null) return;

  if (token.index < unit.command.length) {
    unit.command[token.index].active = true;
  }
}

/**
 * Activate an equipment option
 */
function activateEquipment(unit, token) {
  if (!unit.equipment) return;

  // Deactivate all equipment first (they're usually exclusive)
  for (const eq of unit.equipment) {
    eq.active = false;
  }

  if (token.index !== null && token.index < unit.equipment.length) {
    unit.equipment[token.index].active = true;
  }
}

/**
 * Activate an armor option
 */
function activateArmor(unit, token) {
  if (!unit.armor || token.index === null) return;

  if (token.index < unit.armor.length) {
    unit.armor[token.index].active = true;
  }
}

/**
 * Activate a mount option
 */
function activateMount(unit, token) {
  if (!unit.mounts) return;

  // Deactivate all mounts first
  for (const mount of unit.mounts) {
    mount.active = false;
  }

  if (token.index !== null && token.index < unit.mounts.length) {
    unit.mounts[token.index].active = true;
  }
}

/**
 * Activate a regular option
 */
function activateOption(unit, token) {
  if (!unit.options || token.index === null) return;

  if (token.index < unit.options.length) {
    unit.options[token.index].active = true;
  }
}

/**
 * Activate wizard level in nested options
 */
function activateWizard(unit, token) {
  if (!unit.options || !token.match) return;

  const { parentIndex, subIndex } = token.match;

  if (parentIndex !== undefined && unit.options[parentIndex]) {
    const wizardOption = unit.options[parentIndex];
    wizardOption.active = true;

    if (wizardOption.options && subIndex !== undefined) {
      // Deactivate all wizard level options first
      for (const sub of wizardOption.options) {
        sub.active = false;
      }
      // Activate the selected level
      if (wizardOption.options[subIndex]) {
        wizardOption.options[subIndex].active = true;
      }
    }
  }
}

/**
 * Extract lore name from token (normalize to OWB format)
 */
function extractLoreName(raw) {
  const normalized = raw.toLowerCase().trim();

  const loreMap = {
    'battle magic': 'battle-magic',
    'battle-magic': 'battle-magic',
    'daemonology': 'daemonology',
    'dark magic': 'dark-magic',
    'dark-magic': 'dark-magic',
    'elementalism': 'elementalism',
    'high magic': 'high-magic',
    'high-magic': 'high-magic',
    'illusion': 'illusion',
    'necromancy': 'necromancy',
    'lore of the wilds': 'lore-of-the-wilds',
    'lore of athel loren': 'lore-of-athel-loren',
    'lore of the horned rat': 'lore-of-the-horned-rat',
    'lore of nurgle': 'lore-of-nurgle',
    'lore of slaanesh': 'lore-of-slaanesh',
    'lore of tzeentch': 'lore-of-tzeentch',
    'lore of khorne': 'lore-of-khorne'
  };

  return loreMap[normalized] || normalized.replace(/\s+/g, '-');
}

/**
 * Add magic items to the unit's items array
 * Banners go in the Standard Bearer's command[].magic.selected
 */
function addMagicItems(unit, magicItems) {
  if (!unit.items) {
    unit.items = [];
  }

  for (const item of magicItems) {
    // Special handling for banners - they go in Standard Bearer's magic slot
    if (item.type === 'banner') {
      const added = addBannerToStandardBearer(unit, item);
      if (added) continue;
    }

    // Find the appropriate items slot based on item type
    let targetSlot = findItemsSlot(unit.items, item.type);

    if (!targetSlot) {
      // Create a generic magic items slot if needed
      targetSlot = {
        name_en: 'Magic Items',
        types: ['weapon', 'armor', 'talisman', 'enchanted-item', 'arcane-item'],
        selected: [],
        maxPoints: 100
      };
      unit.items.push(targetSlot);
    }

    // Add the item to selected array
    if (!targetSlot.selected) {
      targetSlot.selected = [];
    }

    // Clone the item and add required fields
    const selectedItem = {
      ...item,
      name: item.name || item.name_en?.toLowerCase(),
      id: item.id || targetSlot.selected.length
    };

    // Remove source field (internal use only)
    delete selectedItem.source;

    targetSlot.selected.push(selectedItem);
  }
}

/**
 * Add a banner to the Standard Bearer's magic slot
 * @returns {boolean} true if successfully added
 */
function addBannerToStandardBearer(unit, bannerItem) {
  if (!unit.command) return false;

  // Find the Standard Bearer command option
  for (let i = 0; i < unit.command.length; i++) {
    const cmd = unit.command[i];
    const nameNorm = (cmd.name_en || '').toLowerCase();

    if (nameNorm.includes('standard') && cmd.magic?.types?.includes('banner')) {
      // Activate the standard bearer
      cmd.active = true;

      // Initialize magic.selected if needed
      if (!cmd.magic.selected) {
        cmd.magic.selected = [];
      }

      // Clone and add the banner
      const selectedBanner = {
        ...bannerItem,
        name: bannerItem.name || bannerItem.name_en?.toLowerCase(),
        id: bannerItem.id || cmd.magic.selected.length
      };
      delete selectedBanner.source;

      cmd.magic.selected.push(selectedBanner);
      return true;
    }
  }

  return false;
}

/**
 * Find the appropriate items slot for an item type
 */
function findItemsSlot(itemsArray, itemType) {
  for (const slot of itemsArray) {
    if (slot.types && slot.types.includes(itemType)) {
      return slot;
    }
  }

  // Check for generic magic items slot
  for (const slot of itemsArray) {
    if (slot.name_en?.toLowerCase().includes('magic items')) {
      return slot;
    }
  }

  return null;
}

/**
 * Ensure all items in an array have id fields
 */
function ensureIds(arr) {
  if (!arr) return;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id === undefined) {
      arr[i].id = i;
    }
  }
}

/**
 * Generate the complete OWB JSON structure
 * @param {Object} matchedList - Matched list from FactionMatcher
 * @param {Object} options - Generation options
 * @returns {Object} Complete OWB JSON structure
 */
export function generateOWBJson(matchedList, options = {}) {
  const {
    name = 'Converted Army List',
    description = 'Converted from BCP format',
    armyComposition = null,
    compositionRule = 'grand-melee-combined-arms'
  } = options;

  // Categorize units
  const characters = [];
  const core = [];
  const special = [];
  const rare = [];
  const mercenaries = [];
  const allies = [];

  for (const matchedUnit of matchedList.units) {
    if (!matchedUnit.success) continue;

    const unit = buildUnit(matchedUnit);

    switch (matchedUnit.category) {
      case 'characters':
        characters.push(unit);
        break;
      case 'core':
        core.push(unit);
        break;
      case 'special':
        special.push(unit);
        break;
      case 'rare':
        rare.push(unit);
        break;
      case 'mercenaries':
        mercenaries.push(unit);
        break;
      case 'allies':
        allies.push(unit);
        break;
      default:
        // Default to special if unknown
        special.push(unit);
    }
  }

  return {
    name,
    description,
    game: 'the-old-world',
    points: matchedList.totalPoints,
    army: matchedList.factionSlug,
    characters,
    core,
    special,
    rare,
    mercenaries,
    allies,
    id: generateListId(),
    armyComposition: armyComposition || matchedList.factionSlug,
    compositionRule
  };
}

/**
 * Generate OWB JSON and return as a formatted string
 * @param {Object} matchedList - Matched list from FactionMatcher
 * @param {Object} options - Generation options
 * @returns {string} Formatted JSON string
 */
export function generateOWBJsonString(matchedList, options = {}) {
  const json = generateOWBJson(matchedList, options);
  return JSON.stringify(json, null, 2);
}

export default { generateOWBJson, generateOWBJsonString };
