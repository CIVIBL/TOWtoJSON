// Conversion report: what matched, what was dropped, and whether the points
// OWB will show match what the pasted list claimed.
// computeUnitPoints is a port of OWB's src/utils/points.js getUnitPoints so
// mismatch warnings reflect what old-world-builder.com will actually display.

export function cleanDisplayName(name) {
  return String(name || '').replace(/\s*\{[^}]*\}/g, '').trim();
}

function unitHasItem(unit, itemName) {
  const target = String(itemName).toLowerCase();
  for (const slot of unit.items || []) {
    for (const sel of slot.selected || []) {
      if ((sel.name_en || sel.name || '').toLowerCase().includes(target)) return true;
    }
  }
  return false;
}

function magicItemPoints(item, isCharacter, strength) {
  if (!isCharacter && item.perModel) {
    return strength * (item.amount ? item.amount * item.perModelPoints : item.perModelPoints);
  }
  if (!isCharacter && item.perUnitPoints) {
    return item.amount ? item.amount * item.perUnitPoints : item.perUnitPoints;
  }
  return item.amount ? item.amount * item.points : item.points;
}

const activeGated = (unit) => ({ active, requiredMagicItem }) =>
  (active && !requiredMagicItem) ||
  (active && requiredMagicItem && unitHasItem(unit, requiredMagicItem));

/**
 * What OWB will display for this generated unit (see OWB getUnitPoints).
 * `isCharacter` affects magic item pricing; pass category === 'characters'.
 */
export function computeUnitPoints(unit, { isCharacter = false, army = null } = {}) {
  const strength = unit.strength || unit.minimum || 1;
  let points = strength > 1 ? strength * unit.points : unit.points;

  const detachmentActive = (unit.options || []).some(o => o.name_en === 'Detachment' && o.active);

  for (const option of unit.options || []) {
    if (option.stackable) {
      points += (option.stackableCount || option.minimum || 0) * option.points;
    } else if ((option.active || option.alwaysActive) && option.perModel) {
      points += strength * option.points;
    } else if ((option.active || option.alwaysActive) && option.options?.length > 0) {
      points += option.points;
      for (const sub of option.options) {
        if (sub.active) points += sub.perModel ? strength * sub.points : sub.points;
      }
    } else if (option.active || (option.alwaysActive && option.armyComposition === army)) {
      points += option.points;
    }
  }

  for (const list of [unit.equipment, unit.armor]) {
    for (const option of (list || []).filter(activeGated(unit))) {
      points += option.perModel ? strength * option.points : option.points;
    }
  }

  if (!detachmentActive) {
    for (const cmd of unit.command || []) {
      if (!cmd.active) continue;
      points += cmd.points;
      for (const sel of cmd.magic?.selected || []) {
        points += sel.amount ? sel.amount * sel.points : sel.points;
      }
      for (const sub of cmd.options || []) {
        if (sub.active) points += sub.perModel ? strength * sub.points : sub.points;
      }
    }
  }

  for (const mount of (unit.mounts || []).filter(activeGated(unit))) {
    points += mount.perModel ? strength * mount.points : mount.points;
    for (const sub of mount.options || []) {
      if (sub.active) points += sub.perModel ? strength * sub.points : sub.points;
    }
  }

  for (const slot of unit.items || []) {
    for (const sel of slot.selected || []) {
      points += magicItemPoints(sel, isCharacter, strength);
    }
  }

  for (const det of unit.detachments || []) {
    points += det.strength * det.points;
    for (const list of [det.equipment, det.armor, det.options]) {
      for (const option of list || []) {
        if (option.stackable) points += (option.stackableCount || option.minimum || 0) * option.points;
        else if (option.active) points += option.perModel ? det.strength * option.points : option.points;
      }
    }
  }

  return points;
}

/**
 * Build the conversion report shown before download.
 * `parsed` is the parseWithFactionData result; `owbJson` the generated list.
 * Pairing relies on generateOWBJson pushing units in parse order per category.
 */
export function buildReport(parsed, owbJson) {
  const report = {
    total: parsed.units.length,
    matched: 0,
    dropped: [],
    unknownTokens: [],
    warnings: [],
    points: {
      parsed: parsed.totalPoints,
      header: parsed.headerPoints ?? null,
      computed: 0,
      unitMismatches: []
    }
  };

  const categoryCursor = {};

  for (const m of parsed.units) {
    const displayName = cleanDisplayName(m.rawName);

    if (!m.success) {
      report.dropped.push({ name: displayName, points: m.rawPoints });
      continue;
    }
    report.matched++;

    if (m.unknownTokens?.length > 0) {
      report.unknownTokens.push({ unit: displayName, tokens: [...m.unknownTokens] });
    }
    if (m.unplacedItems?.length > 0) {
      report.warnings.push(
        `${displayName}: could not place ${m.unplacedItems.join(', ')} — it will be missing from the export.`
      );
    }

    const category = owbJson[m.category] ? m.category : 'special';
    const cursor = categoryCursor[category] || 0;
    const generated = (owbJson[category] || [])[cursor];
    categoryCursor[category] = cursor + 1;
    if (!generated) continue;

    const computed = computeUnitPoints(generated, { isCharacter: category === 'characters', army: owbJson.army });
    report.points.computed += computed;
    if (computed !== m.rawPoints) {
      report.points.unitMismatches.push({ name: displayName, parsed: m.rawPoints, computed });
    }
  }

  if (report.dropped.length > 0) {
    report.warnings.unshift(
      `${report.dropped.length} of ${report.total} entries could not be matched and are NOT in the export.`
    );
  }

  return report;
}
