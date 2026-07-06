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

  // Add magic items. Placement is decided by where the item was tokenized and
  // by type: banners go to the Standard bearer, champion sub-line items to the
  // champion's magic slot, everything else to the unit's own items slots.
  // OWB resolves a selected item by its index within its magic-items.json
  // section, so `id` must be the item's sourceIndex (see phase-b/b3.md).
  const unplaced = [];
  for (const item of matchedUnit.items || []) {
    const itemData = item.data;
    const makeSelected = () => {
      const sel = { ...itemData, name: itemData.name || itemData.name_en?.toLowerCase(), id: itemData.sourceIndex ?? 0 };
      delete sel.source;
      delete sel.sourceIndex;
      return sel;
    };
    const placeOnCommand = (cmd) => {
      cmd.active = true;
      if (!cmd.magic.selected) cmd.magic.selected = [];
      cmd.magic.selected.push(makeSelected());
    };

    // 1. Banners belong to the Standard bearer.
    if (itemData.type === 'banner' && unit.command) {
      const standard = unit.command.find(c =>
        (c.name_en || '').toLowerCase().includes('standard') && c.magic?.types?.includes('banner'));
      if (standard) {
        placeOnCommand(standard);
        continue;
      }
    }

    // 2. Items tokenized from a champion sub-line belong to the champion.
    if (item.fromChampion && unit.command) {
      const champion = unit.command.find(c => c.magic?.types?.includes(itemData.type));
      if (champion) {
        placeOnCommand(champion);
        continue;
      }
    }

    // 3. Characters and units with their own items slots.
    if (unit.items) {
      const slot = unit.items.find(s => s.types?.includes(itemData.type))
        || unit.items.find(s => s.name_en?.toLowerCase().includes('magic'));
      if (slot) {
        if (!slot.selected) slot.selected = [];
        slot.selected.push(makeSelected());
        continue;
      }
    }

    // 4. No legal slot: surface it instead of dropping silently (read by the
    //    Phase D report; stripped from the JSON in generateOWBJson).
    unplaced.push(item.name);
  }
  if (unplaced.length > 0) unit.__unplacedItems = unplaced;

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
    if (unit.__unplacedItems) {
      m.unplacedItems = unit.__unplacedItems;
      delete unit.__unplacedItems;
    }
    (result[m.category] || result.special).push(unit);
  }

  return result;
}
