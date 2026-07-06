// Magic item indexing.
// Extracted verbatim from index.html (Phase A1); renamed from buildSmartMagicItemIndex.
// The factionSlug parameter is currently unused — Phase B2 scopes the index to it.

/**
 * Build index of magic items
 * Normalizes names by removing asterisks and other special chars
 */
export function buildMagicItemIndex(magicItems, factionSlug) {
  const index = new Map();

  // Helper to normalize item name (remove asterisks, lowercase)
  const normalizeName = (name) => {
    return name.toLowerCase().replace(/\*/g, '').trim();
  };

  // Process each key in magic items (general, faction-specific, etc.)
  for (const [key, items] of Object.entries(magicItems)) {
    // Items can be an array or an object with nested arrays
    if (Array.isArray(items)) {
      for (const item of items) {
        // Use name_en first, fall back to name
        const rawName = item.name_en || item.name || '';
        const name = normalizeName(rawName);
        if (name) index.set(name, { ...item, source: key });
      }
    } else if (typeof items === 'object') {
      // Nested structure (categories within)
      for (const categoryItems of Object.values(items)) {
        if (Array.isArray(categoryItems)) {
          for (const item of categoryItems) {
            const rawName = item.name_en || item.name || '';
            const name = normalizeName(rawName);
            if (name) index.set(name, { ...item, source: key });
          }
        }
      }
    }
  }

  return index;
}
