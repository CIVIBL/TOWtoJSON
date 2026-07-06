// Unit-name and option matching against faction data.
// Extracted verbatim from index.html (Phase A1) — behavior changes land in Phase B.

/**
 * Match a unit name area against the unit index
 * Returns the best matching unit or null
 *
 * For BCP format "Mage, Sea Guard, Lothern Skycutter, Wizard Level 2...",
 * the unit name is the FIRST segment (before first comma).
 * Things after commas are options/mounts, not the unit name.
 */
export function matchUnitName(unitNameArea, unitIndex) {
  const areaLower = unitNameArea.toLowerCase();

  // Extract the first segment (the actual unit name in BCP format)
  // e.g., "Mage, Sea Guard, Lothern Skycutter" -> "Mage"
  const firstSegment = areaLower.split(',')[0].trim();

  // Also handle model count prefix: "20 Sisters of Avelorn" -> "Sisters of Avelorn"
  const firstSegmentNoCount = firstSegment.replace(/^\d+\s+/, '');

  // Sort entries by length (longest first)
  const sortedEntries = [...unitIndex.entries()].sort((a, b) => b[0].length - a[0].length);

  // FIRST: Try to match against just the first segment (highest priority)
  for (const [nameLower, data] of sortedEntries) {
    if (firstSegmentNoCount === nameLower || firstSegmentNoCount.includes(nameLower)) {
      return data;
    }
  }

  // SECOND: Try exact match on first segment with variations
  for (const [nameLower, data] of sortedEntries) {
    // Check singular/plural variations
    const nameNoS = nameLower.endsWith('s') ? nameLower.slice(0, -1) : nameLower;
    const segmentNoS = firstSegmentNoCount.endsWith('s') ? firstSegmentNoCount.slice(0, -1) : firstSegmentNoCount;
    if (segmentNoS === nameNoS) {
      return data;
    }
  }

  // THIRD: Fall back to checking the whole string, but only if match is near the start
  for (const [nameLower, data] of sortedEntries) {
    const matchIndex = areaLower.indexOf(nameLower);
    // Only accept if match is within first 30 chars (likely the actual unit name, not a mount)
    if (matchIndex >= 0 && matchIndex < 30) {
      return data;
    }
  }

  return null;
}

/**
 * Check if a name matches in context with plural/singular flexibility
 * Handles: "Shield" matching "Shields", "Spear" matching "Spears", etc.
 */
export function nameMatchesInContext(name, contextLower) {
  if (!name || name.length < 3) return false;
  const nameLower = name.toLowerCase();

  // Direct match
  if (contextLower.includes(nameLower)) return true;

  // Try singular/plural variations
  // If name ends in 's', try without it
  if (nameLower.endsWith('s') && !nameLower.endsWith('ss')) {
    const singular = nameLower.slice(0, -1);
    if (singular.length >= 3 && contextLower.includes(singular)) return true;
  }
  // If name doesn't end in 's', try with it
  if (!nameLower.endsWith('s')) {
    const plural = nameLower + 's';
    if (contextLower.includes(plural)) return true;
  }

  return false;
}

/**
 * Extract and match equipment/options from context against unit's valid options
 */
export function extractOptions(context, unit, magicItemIndex) {
  const result = {
    equipment: [], armor: [], options: [], mounts: [], command: [],
    items: [], lore: null, wizardLevel: null
  };

  const contextLower = context.toLowerCase();

  // Check equipment
  if (unit.equipment) {
    for (let i = 0; i < unit.equipment.length; i++) {
      const eq = unit.equipment[i];
      const eqName = eq.name_en || eq.name || '';
      if (nameMatchesInContext(eqName, contextLower)) {
        result.equipment.push({ index: i, name: eqName.toLowerCase(), data: eq });
      }
    }
  }

  // Check armor - only match once per armor name (avoid duplicates from Elven Honours variants)
  if (unit.armor) {
    const matchedArmorNames = new Set();
    for (let i = 0; i < unit.armor.length; i++) {
      const arm = unit.armor[i];
      const armName = arm.name_en || arm.name || '';
      const armNameLower = armName.toLowerCase();
      // Skip if already matched this armor name, or if it requires an Elven Honour we don't have
      if (nameMatchesInContext(armName, contextLower) && !matchedArmorNames.has(armNameLower)) {
        // Prefer the version without requiredMagicItem unless we have that item
        if (arm.requiredMagicItem) {
          // Check if we have the required magic item in context
          if (!nameMatchesInContext(arm.requiredMagicItem, contextLower)) {
            continue; // Skip this variant, we don't have the required honour
          }
        }
        matchedArmorNames.add(armNameLower);
        result.armor.push({ index: i, name: armNameLower, data: arm });
      }
    }
  }

  // Check mounts
  if (unit.mounts) {
    for (let i = 0; i < unit.mounts.length; i++) {
      const mount = unit.mounts[i];
      const mountName = mount.name_en || mount.name || '';
      if (nameMatchesInContext(mountName, contextLower)) {
        result.mounts.push({ index: i, name: mountName.toLowerCase(), data: mount });
      }
    }
  }

  // Check command (General, Champion, Standard Bearer, Musician, Battle Standard Bearer)
  if (unit.command) {
    for (let i = 0; i < unit.command.length; i++) {
      const cmd = unit.command[i];
      const cmdName = cmd.name_en || cmd.name || '';
      if (nameMatchesInContext(cmdName, contextLower)) {
        result.command.push({ index: i, name: cmdName.toLowerCase(), data: cmd });
      }
    }
    // Also check for "General" keyword
    if (contextLower.includes('general')) {
      const generalIdx = unit.command.findIndex(c => (c.name_en || '').toLowerCase().includes('general'));
      if (generalIdx >= 0 && !result.command.some(c => c.index === generalIdx)) {
        result.command.push({ index: generalIdx, name: 'general', data: unit.command[generalIdx] });
      }
    }
    // Check for "Battle Standard Bearer" (BSB) - common across factions
    if (contextLower.includes('battle standard bearer') || contextLower.includes('bsb')) {
      const bsbIdx = unit.command.findIndex(c => (c.name_en || '').toLowerCase().includes('battle standard bearer'));
      if (bsbIdx >= 0 && !result.command.some(c => c.index === bsbIdx)) {
        result.command.push({ index: bsbIdx, name: 'battle standard bearer', data: unit.command[bsbIdx] });
      }
    }
  }

  // Check regular options
  if (unit.options) {
    for (let i = 0; i < unit.options.length; i++) {
      const opt = unit.options[i];
      const optName = opt.name_en || opt.name || '';
      if (nameMatchesInContext(optName, contextLower)) {
        result.options.push({ index: i, type: 'option', name: optName.toLowerCase(), data: opt });
      }
      // Check nested options (wizard levels)
      if (opt.options) {
        for (let j = 0; j < opt.options.length; j++) {
          const subOpt = opt.options[j];
          const subOptName = subOpt.name_en || subOpt.name || '';
          if (nameMatchesInContext(subOptName, contextLower)) {
            result.options.push({ index: i, subIndex: j, type: 'nested', name: subOptName.toLowerCase(), data: subOpt });
          }
        }
      }
    }
  }

  // Check for wizard level patterns: "Wizard Level 2" or "Level 2 Wizard" or "Lvl 2"
  const wizardMatch = contextLower.match(/(?:wizard\s+level|level|lvl)\s*(\d)/i);
  if (wizardMatch) {
    result.wizardLevel = parseInt(wizardMatch[1], 10);

    // Find and add the corresponding nested wizard option
    // OWB format is "Level X Wizard", BCP format is "Wizard Level X"
    if (unit.options) {
      for (let i = 0; i < unit.options.length; i++) {
        const opt = unit.options[i];
        const optName = (opt.name_en || opt.name || '').toLowerCase();
        // Check if this is a Wizard option with nested levels
        if (optName === 'wizard' && opt.options) {
          // Find the matching level option
          for (let j = 0; j < opt.options.length; j++) {
            const subOpt = opt.options[j];
            const subOptName = (subOpt.name_en || subOpt.name || '').toLowerCase();
            // Match "Level X Wizard" where X is the extracted level
            if (subOptName.includes(`level ${result.wizardLevel}`) && subOptName.includes('wizard')) {
              // Only add if not already present
              const alreadyAdded = result.options.some(
                o => o.type === 'nested' && o.index === i && o.subIndex === j
              );
              if (!alreadyAdded) {
                result.options.push({ index: i, subIndex: j, type: 'nested', name: subOptName, data: subOpt });
              }
              break;
            }
          }
          break;
        }
      }
    }
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

  // Check magic items (min 5 chars to avoid false positives like "ward")
  for (const [itemName, itemData] of magicItemIndex.entries()) {
    if (itemName.length >= 5 && contextLower.includes(itemName)) {
      result.items.push({ name: itemName, data: itemData });
    }
  }

  return result;
}
