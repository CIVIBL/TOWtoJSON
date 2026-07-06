// Magic item indexing, scoped to the detected faction (Phase B2).
// Indexes only: 'general' + the faction's own section + mapped extra categories.
// Faction/extra sections are indexed after 'general' so they win on name collision.

const FACTION_EXTRA_CATEGORIES = {
  'kingdom-of-bretonnia': ['knightly-virtues'],
  'wood-elf-realms': ['forest-spites', 'kindreds'],
  'high-elf-realms': ['elven-honours'],
  'dark-elves': ['forbidden-poisons', 'gifts-of-khaine'],
  'vampire-counts': ['vampiric-powers'],
  'warriors-of-chaos': ['gifts-of-chaos', 'chaos-mutations', 'chaotic-traits'],
  'beastmen-brayherds': ['gifts-of-chaos', 'chaos-mutations', 'chaotic-traits'],
  'daemons-of-chaos': ['daemonic-gifts-common', 'daemonic-icons-common',
    'daemonic-gifts-khorne', 'daemonic-icons-khorne', 'daemonic-gifts-nurgle', 'daemonic-icons-nurgle',
    'daemonic-gifts-slaanesh', 'daemonic-icons-slaanesh', 'daemonic-gifts-tzeentch', 'daemonic-icons-tzeentch'],
  'ogre-kingdoms': ['big-names'],
  'lizardmen': ['disciplines-old-ones'],
  'tomb-kings-of-khemri': ['incantation-scrolls'],
};

/**
 * Build index of magic items available to a faction.
 * Normalizes names by removing asterisks and lowercasing.
 * @returns {Map<string, object>} normalized name -> { ...item, source }
 */
export function buildMagicItemIndex(magicItems, factionSlug) {
  const index = new Map();

  // Helper to normalize item name (remove asterisks, lowercase)
  const normalizeName = (name) => {
    return name.toLowerCase().replace(/\*/g, '').trim();
  };

  const indexItem = (item, key, sourceIndex) => {
    // Use name_en first, fall back to name. sourceIndex is the item's position
    // within its section — OWB identifies selected items by this index.
    const rawName = item.name_en || item.name || '';
    const name = normalizeName(rawName);
    if (name) index.set(name, { ...item, source: key, sourceIndex });
  };

  // 'general' first so faction-specific entries override it on collision.
  const keys = ['general', factionSlug, ...(FACTION_EXTRA_CATEGORIES[factionSlug] || [])];

  for (const key of keys) {
    const items = magicItems[key];
    if (!items) continue;
    // Items can be an array or an object with nested arrays
    if (Array.isArray(items)) {
      items.forEach((item, i) => indexItem(item, key, i));
    } else if (typeof items === 'object') {
      // Nested structure (categories within)
      for (const categoryItems of Object.values(items)) {
        if (Array.isArray(categoryItems)) {
          categoryItems.forEach((item, i) => indexItem(item, key, i));
        }
      }
    }
  }

  return index;
}
