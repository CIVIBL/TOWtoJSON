// Unit-name and option matching against faction data.
// Phase B1: options are matched per token (comma segments and bullet lines),
// never by substring search across the whole unit block.

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
 * Normalize a name for comparison: lowercase, drop {faction} / (role) annotations
 * and asterisk footnote markers, collapse whitespace.
 */
function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function depluralize(s) {
  return s.endsWith('s') && !s.endsWith('ss') ? s.slice(0, -1) : s;
}

/**
 * Token-vs-name equality with annotation stripping, singular/plural flexibility,
 * and comma-part matching for compound names like "Hand weapon, Thrusting spear".
 */
export function tokenEquals(token, name) {
  const t = norm(token);
  const n = norm(name);
  if (!t || !n) return false;
  if (t === n) return true;
  if (depluralize(t) === depluralize(n)) return true;
  if (n.includes(',')) {
    for (const part of n.split(',').map(p => p.trim())) {
      if (t === part || depluralize(t) === depluralize(part)) return true;
    }
  }
  return false;
}

function findByName(arr, token) {
  if (!arr) return -1;
  return arr.findIndex(entry => tokenEquals(token, entry.name_en || entry.name || ''));
}

const LORES = [
  'battle magic', 'daemonology', 'dark magic', 'elementalism',
  'high magic', 'illusion', 'necromancy', 'lore of the wilds',
  'lore of athel loren', 'lore of the horned rat', 'lore of nurgle',
  'lore of slaanesh', 'lore of tzeentch', 'lore of khorne'
];

/**
 * Split a unit block into the main entry line's option tokens and bullet sub-lines.
 * Main line: "465 - Grey Seer, General, ..." or "15 Glade Guard [225 pts]".
 * Sub-line: "• 30x Clanrat, Shield, ..." -> { count, label, tokens }.
 */
export function tokenizeUnitBlock(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { mainTokens: [], subLines: [] };

  const main = lines[0]
    .replace(/^\d+\s*-\s*/, '')
    .replace(/\s*\[\d+\s*pts?\]$/i, '');
  const mainParts = main.split(',').map(s => s.trim()).filter(Boolean);
  const mainTokens = mainParts.slice(1);

  const subLines = [];
  for (const line of lines.slice(1)) {
    const m = line.match(/^[•\-\*]?\s*(?:(\d+)x?\s+)?(.+)$/);
    if (!m) continue;
    const parts = m[2].split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    subLines.push({
      count: m[1] ? parseInt(m[1], 10) : 1,
      label: parts[0],
      tokens: parts.slice(1)
    });
  }
  return { mainTokens, subLines };
}

/**
 * Classify one token against a unit's own data and the magic item index.
 * Priority: wizard level, lore, command, mount, equipment, armor, option, magic item.
 * allTokensNorm (optional Set) provides sibling-token context for armor variants
 * gated by requiredMagicItem.
 */
export function classifyToken(token, unit, magicItemIndex, allTokensNorm = null) {
  // 1. Wizard level: "Wizard Level 4" / "Level 4 Wizard" / "Lvl 4"
  const wizardMatch = token.match(/(?:wizard\s+level|level|lvl)\s*(\d)/i);
  if (wizardMatch) {
    return { type: 'wizard', raw: token, level: parseInt(wizardMatch[1], 10) };
  }

  // 2. Lore
  const tNorm = norm(token);
  for (const lore of LORES) {
    if (tNorm === lore || tNorm === lore.replace(/^lore of (the )?/, '')) {
      return { type: 'lore', raw: token, lore: lore.replace(/\s+/g, '-') };
    }
  }

  // 3. Command ("bsb" is a common abbreviation for Battle Standard Bearer)
  let idx = findByName(unit.command, token);
  if (idx < 0 && tNorm === 'bsb' && unit.command) {
    idx = unit.command.findIndex(c => norm(c.name_en || '').includes('battle standard bearer'));
  }
  if (idx >= 0) {
    return { type: 'command', raw: token, index: idx, data: unit.command[idx] };
  }

  // 4. Mount
  idx = findByName(unit.mounts, token);
  if (idx >= 0) {
    return { type: 'mount', raw: token, index: idx, data: unit.mounts[idx] };
  }

  // 5. Equipment
  idx = findByName(unit.equipment, token);
  if (idx >= 0) {
    return { type: 'equipment', raw: token, index: idx, data: unit.equipment[idx] };
  }

  // 6. Armor (variants gated on a magic item are only valid when that item
  //    is also present among the unit's tokens)
  if (unit.armor) {
    const candidates = [];
    for (let i = 0; i < unit.armor.length; i++) {
      if (tokenEquals(token, unit.armor[i].name_en || unit.armor[i].name || '')) {
        candidates.push(i);
      }
    }
    const usable = candidates.filter(i => {
      const req = unit.armor[i].requiredMagicItem;
      if (!req) return true;
      return allTokensNorm ? allTokensNorm.has(norm(req)) : false;
    });
    const pick = usable.find(i => !unit.armor[i].requiredMagicItem) ?? usable[0];
    if (pick !== undefined) {
      return { type: 'armor', raw: token, index: pick, data: unit.armor[pick] };
    }
  }

  // 7. Options, including nested sub-options
  if (unit.options) {
    for (let i = 0; i < unit.options.length; i++) {
      const opt = unit.options[i];
      if (tokenEquals(token, opt.name_en || opt.name || '')) {
        return { type: 'option', raw: token, index: i, data: opt };
      }
      if (opt.options) {
        for (let j = 0; j < opt.options.length; j++) {
          const sub = opt.options[j];
          if (tokenEquals(token, sub.name_en || sub.name || '')) {
            return { type: 'nested-option', raw: token, index: i, subIndex: j, data: sub };
          }
        }
      }
    }
  }

  // 8. Magic item: exact normalized match, then unique prefix match (>= 5 chars)
  const exact = magicItemIndex.get(tNorm);
  if (exact) {
    return { type: 'item', raw: token, name: tNorm, data: exact };
  }
  if (tNorm.length >= 5) {
    const prefixHits = [];
    for (const [key, data] of magicItemIndex.entries()) {
      if (key.length >= 5 && (key.startsWith(tNorm) || tNorm.startsWith(key))) {
        prefixHits.push({ key, data });
      }
    }
    if (prefixHits.length === 1) {
      return { type: 'item', raw: token, name: prefixHits[0].key, data: prefixHits[0].data };
    }
  }

  return { type: 'unknown', raw: token };
}

/**
 * Resolve a wizard level to the unit's nested "Level X Wizard" option.
 */
function findWizardNestedOption(unit, level) {
  if (!unit.options) return null;
  for (let i = 0; i < unit.options.length; i++) {
    const opt = unit.options[i];
    if (norm(opt.name_en || opt.name || '') === 'wizard' && opt.options) {
      for (let j = 0; j < opt.options.length; j++) {
        const subName = norm(opt.options[j].name_en || opt.options[j].name || '');
        if (subName.includes(`level ${level}`) && subName.includes('wizard')) {
          return { index: i, subIndex: j, data: opt.options[j] };
        }
      }
    }
  }
  return null;
}

/**
 * Extract equipment/options/command/mounts/items for a unit from its text block.
 * Tokens come only from the main entry line and from sub-lines owned by the unit
 * (rank-and-file lines matching the unit name, command lines, or option lines).
 * Sub-lines that match nothing are left for detachment extraction.
 */
export function extractOptions(context, unit, magicItemIndex) {
  const result = {
    equipment: [], armor: [], options: [], mounts: [], command: [],
    items: [], lore: null, wizardLevel: null, unknownTokens: []
  };

  const { mainTokens, subLines } = tokenizeUnitBlock(context);
  const unitName = unit.name_en || unit.name || '';

  // Decide sub-line ownership before classifying tokens.
  const tokenGroups = [{ tokens: mainTokens, fromChampion: false }];
  const pendingLabelClassifications = [];

  for (const line of subLines) {
    if (tokenEquals(line.label, unitName)) {
      tokenGroups.push({ tokens: line.tokens, fromChampion: false });
      continue;
    }
    const cmdIdx = findByName(unit.command, line.label);
    if (cmdIdx >= 0) {
      addCommand(result, cmdIdx, unit.command[cmdIdx]);
      tokenGroups.push({ tokens: line.tokens, fromChampion: true });
      continue;
    }
    // OWB-style option lines ("- Shields") classify by their label.
    pendingLabelClassifications.push(line);
  }

  // Sibling-token context for armor requiredMagicItem gating.
  const allTokensNorm = new Set();
  for (const g of tokenGroups) for (const t of g.tokens) allTokensNorm.add(norm(t));
  for (const line of pendingLabelClassifications) allTokensNorm.add(norm(line.label));

  for (const line of pendingLabelClassifications) {
    const c = classifyToken(line.label, unit, magicItemIndex, allTokensNorm);
    if (c.type !== 'unknown') {
      apply(result, c, unit, false);
      tokenGroups.push({ tokens: line.tokens, fromChampion: false });
    }
    // Unmatched labels are detachments or noise — not this unit's tokens,
    // so they are not reported as unknown here.
  }

  for (const group of tokenGroups) {
    for (const token of group.tokens) {
      const c = classifyToken(token, unit, magicItemIndex, allTokensNorm);
      if (c.type === 'unknown') {
        result.unknownTokens.push(token);
      } else {
        apply(result, c, unit, group.fromChampion);
      }
    }
  }

  return result;
}

function addCommand(result, index, data) {
  if (!result.command.some(c => c.index === index)) {
    result.command.push({ index, name: norm(data.name_en || data.name || ''), data });
  }
}

function apply(result, c, unit, fromChampion) {
  switch (c.type) {
    case 'command':
      addCommand(result, c.index, c.data);
      break;
    case 'mount':
      if (!result.mounts.some(m => m.index === c.index)) {
        result.mounts.push({ index: c.index, name: norm(c.data.name_en || ''), data: c.data });
      }
      break;
    case 'equipment':
      if (!result.equipment.some(e => e.index === c.index)) {
        result.equipment.push({ index: c.index, name: norm(c.data.name_en || ''), data: c.data });
      }
      break;
    case 'armor':
      if (!result.armor.some(a => a.index === c.index)) {
        result.armor.push({ index: c.index, name: norm(c.data.name_en || ''), data: c.data });
      }
      break;
    case 'option':
      if (!result.options.some(o => o.type === 'option' && o.index === c.index)) {
        result.options.push({ index: c.index, type: 'option', name: norm(c.data.name_en || ''), data: c.data });
      }
      break;
    case 'nested-option':
      if (!result.options.some(o => o.type === 'nested' && o.index === c.index && o.subIndex === c.subIndex)) {
        result.options.push({ index: c.index, subIndex: c.subIndex, type: 'nested', name: norm(c.data.name_en || ''), data: c.data });
      }
      break;
    case 'wizard': {
      result.wizardLevel = c.level;
      const nested = findWizardNestedOption(unit, c.level);
      if (nested && !result.options.some(o => o.type === 'nested' && o.index === nested.index && o.subIndex === nested.subIndex)) {
        result.options.push({ index: nested.index, subIndex: nested.subIndex, type: 'nested', name: norm(nested.data.name_en || ''), data: nested.data });
      }
      break;
    }
    case 'lore':
      if (!result.lore) result.lore = c.lore;
      break;
    case 'item':
      if (!result.items.some(i => i.name === c.name)) {
        result.items.push({ name: c.name, data: c.data, fromChampion: !!fromChampion });
      }
      break;
  }
}
