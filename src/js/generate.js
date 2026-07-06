// Old World Builder JSON generator.
// Extracted verbatim from index.html (Phase A1) — item placement fixes land in Phase B3.

function generateIdSuffix(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let r = '';
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

export function buildUnit(matchedUnit) {
  const unit = deepClone(matchedUnit.unitTemplate);
  unit.id = `${matchedUnit.unitTemplate.id}.${generateIdSuffix()}`;
  unit.strength = matchedUnit.modelCount || 1;

  // Activate equipment (from smart parser: matchedUnit.equipment = [{index, name, data}])
  if (matchedUnit.equipment?.length > 0) {
    unit.equipment?.forEach(e => e.active = false);
    for (const eq of matchedUnit.equipment) {
      if (unit.equipment?.[eq.index]) unit.equipment[eq.index].active = true;
    }
  }

  // Activate armor (exclusive - deactivate all others first)
  if (matchedUnit.armor?.length > 0) {
    unit.armor?.forEach(a => a.active = false);
    for (const arm of matchedUnit.armor) {
      if (unit.armor?.[arm.index]) unit.armor[arm.index].active = true;
    }
  }

  // Activate mounts
  if (matchedUnit.mounts?.length > 0) {
    unit.mounts?.forEach(m => m.active = false);
    for (const mount of matchedUnit.mounts) {
      if (unit.mounts?.[mount.index]) unit.mounts[mount.index].active = true;
    }
  }

  // Activate command options
  for (const cmd of matchedUnit.command || []) {
    if (unit.command?.[cmd.index]) unit.command[cmd.index].active = true;
  }

  // Activate regular options
  for (const opt of matchedUnit.options || []) {
    if (opt.type === 'nested' && opt.subIndex !== undefined) {
      // Nested option (wizard level)
      if (unit.options?.[opt.index]) {
        unit.options[opt.index].active = true;
        unit.options[opt.index].options?.forEach(o => o.active = false);
        if (unit.options[opt.index].options?.[opt.subIndex]) {
          unit.options[opt.index].options[opt.subIndex].active = true;
        }
      }
    } else if (unit.options?.[opt.index]) {
      unit.options[opt.index].active = true;
    }
  }

  // Set lore
  if (matchedUnit.lore && unit.lores) {
    unit.activeLore = matchedUnit.lore;
  }

  // Add magic items
  for (const item of matchedUnit.items || []) {
    const itemData = item.data;
    // Special handling for banners
    if (itemData.type === 'banner' && unit.command) {
      let added = false;
      for (const cmd of unit.command) {
        if ((cmd.name_en || '').toLowerCase().includes('standard') && cmd.magic?.types?.includes('banner')) {
          cmd.active = true;
          if (!cmd.magic.selected) cmd.magic.selected = [];
          const sel = { ...itemData, name: itemData.name || itemData.name_en?.toLowerCase(), id: cmd.magic.selected.length };
          delete sel.source;
          cmd.magic.selected.push(sel);
          added = true;
          break;
        }
      }
      if (added) continue;
    }
    // For ranked units, check if champion has a magic slot for this item type
    let addedToChampion = false;
    if (unit.command) {
      for (const cmd of unit.command) {
        // Find champion command options (typically first entry, or one with magic slot)
        if (cmd.magic?.types?.includes(itemData.type)) {
          cmd.active = true;
          if (!cmd.magic.selected) cmd.magic.selected = [];
          const sel = { ...itemData, name: itemData.name || itemData.name_en?.toLowerCase(), id: cmd.magic.selected.length };
          delete sel.source;
          cmd.magic.selected.push(sel);
          addedToChampion = true;
          break;
        }
      }
    }

    // Fall back to unit.items for characters/units with their own items array
    if (!addedToChampion && unit.items) {
      let slot = unit.items.find(s => s.types?.includes(itemData.type)) || unit.items.find(s => s.name_en?.toLowerCase().includes('magic'));
      if (slot) {
        if (!slot.selected) slot.selected = [];
        const sel = { ...itemData, name: itemData.name || itemData.name_en?.toLowerCase(), id: slot.selected.length };
        delete sel.source;
        slot.selected.push(sel);
      }
    }
  }

  // Add detachments (for regimental units like Beast Pack)
  if (matchedUnit.detachments?.length > 0) {
    unit.detachments = [];
    for (const det of matchedUnit.detachments) {
      const detachUnit = deepClone(det.unit);
      detachUnit.id = `${det.unit.id}.${generateIdSuffix()}`;
      detachUnit.strength = det.count;
      // Ensure equipment is active
      if (detachUnit.equipment) {
        detachUnit.equipment.forEach((eq, i) => {
          if (eq.id === undefined) eq.id = i;
          if (eq.active === undefined && i === 0) eq.active = true;
        });
      }
      unit.detachments.push(detachUnit);
    }
  }

  // Ensure IDs
  [unit.command, unit.equipment, unit.armor, unit.options, unit.mounts].forEach(arr => {
    if (arr) arr.forEach((item, i) => { if (item.id === undefined) item.id = i; });
  });

  return unit;
}

export function generateOWBJson(matchedList, options = {}) {
  const { name = 'Converted Army', description = '', armyComposition = null } = options;
  const result = {
    name, description, game: 'the-old-world', points: matchedList.totalPoints,
    army: matchedList.factionSlug,
    characters: [], core: [], special: [], rare: [], mercenaries: [], allies: [],
    id: generateIdSuffix(8),
    armyComposition: armyComposition || matchedList.factionSlug,
    compositionRule: 'grand-melee-combined-arms'
  };

  for (const m of matchedList.units) {
    if (!m.success) continue;
    const unit = buildUnit(m);
    (result[m.category] || result.special).push(unit);
  }

  return result;
}
