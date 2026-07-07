// Faction and Army of Infamy detection, driven by generated data:
//   unit-name-index.json   (scripts/build-data.mjs, from shipped faction files)
//   army-compositions.json (scripts/build-data.mjs, from the OWB repo itself)
// Only faction display names/abbreviations are hand-maintained — everything a
// list can be identified by (unit rosters, composition slugs, tagged options)
// comes from data.

// Human names and shorthand players use for factions. Header detection only;
// unit-based detection uses the generated index.
export const FACTION_NAMES = {
  'skaven': { names: ['skaven', 'ratmen'], abbreviations: ['sk'] },
  'wood-elf-realms': { names: ['wood elves', 'wood elf realms', 'wood elf', 'welves', 'woodies'], abbreviations: ['we'] },
  'empire-of-man': { names: ['empire', 'the empire', 'empire of man', 'the empire of man'], abbreviations: ['eom', 'emp'] },
  'kingdom-of-bretonnia': { names: ['bretonnia', 'kingdom of bretonnia', 'bretonnians'], abbreviations: ['bret', 'kob'] },
  'dwarfen-mountain-holds': { names: ['dwarfs', 'dwarves', 'dwarfen mountain holds', 'dwarf', 'dawi'], abbreviations: ['dmh', 'dw'] },
  'high-elf-realms': { names: ['high elves', 'high elf realms', 'high elf', 'asur'], abbreviations: ['he', 'her'] },
  'tomb-kings-of-khemri': { names: ['tomb kings', 'tomb kings of khemri', 'khemri', 'nehekhara'], abbreviations: ['tk', 'tkok'] },
  'vampire-counts': { names: ['vampire counts', 'vampires', 'undead', 'sylvania'], abbreviations: ['vc', 'vamps'] },
  'warriors-of-chaos': { names: ['warriors of chaos', 'chaos warriors', 'hordes of chaos'], abbreviations: ['woc', 'cw'] },
  'orc-and-goblin-tribes': { names: ['orcs and goblins', 'orcs & goblins', 'orc and goblin tribes', 'greenskins', 'orcs', 'goblins'], abbreviations: ['o&g', 'ong', 'oag'] },
  'beastmen-brayherds': { names: ['beastmen', 'beastmen brayherds', 'brayherds', 'beasts of chaos'], abbreviations: ['bm', 'boc'] },
  'daemons-of-chaos': { names: ['daemons', 'daemons of chaos', 'chaos daemons', 'demons'], abbreviations: ['doc'] },
  'dark-elves': { names: ['dark elves', 'dark elf', 'druchii', 'naggaroth'], abbreviations: ['de', 'delves'] },
  'lizardmen': { names: ['lizardmen', 'lizardman', 'seraphon', 'lustria'], abbreviations: ['lm', 'liz'] },
  'ogre-kingdoms': { names: ['ogre kingdoms', 'ogres', 'ogre', 'gutbusters'], abbreviations: ['ok', 'ogk'] },
  'chaos-dwarfs': { names: ['chaos dwarfs', 'chaos dwarves', 'dawi zharr'], abbreviations: ['chd', 'chdw'] },
  'grand-cathay': { names: ['cathay', 'grand cathay'], abbreviations: ['gc', 'cath'] },
  'renegade-crowns': { names: ['renegade crowns'], abbreviations: ['rc'] }
};

function isUnitLine(line) {
  const trimmed = line.trim();
  return /^\d+\s*-\s*.+/.test(trimmed) || /\[\d+\s*pts?\]/.test(trimmed);
}

/**
 * Candidate unit names from entry lines (BCP "465 - Name, ..." and
 * OWB "15 Name [225 pts]" formats): the first comma segment, count stripped.
 */
function extractCandidateNames(text) {
  const candidates = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    let nameArea = null;
    const owbMatch = trimmed.match(/^(.+?)\s*\[\d+\s*pts?\]$/i);
    const bcpMatch = trimmed.match(/^\d+\s*-\s*(.+)$/);
    if (owbMatch) nameArea = owbMatch[1];
    else if (bcpMatch) nameArea = bcpMatch[1];
    if (!nameArea) continue;
    const name = nameArea.split(',')[0].trim().replace(/^\d+\s+/, '').toLowerCase();
    if (name) candidates.push(name);
  }
  return candidates;
}

/**
 * Detect the faction of a list.
 * 1. Header scan (first 5 non-unit lines): faction names, abbreviations,
 *    and official composition display names.
 * 2. Score candidate unit names against the generated unit-name index; the
 *    winner needs a clear margin (2x the runner-up, or 3+ unique matches).
 * Returns a faction slug or null (caller should offer a manual picker).
 */
export function detectFaction(text, unitNameIndex, compositionsData) {
  const lines = text.split('\n');

  // Step 1: explicit header
  const headerLines = [];
  for (const line of lines) {
    if (headerLines.length >= 5) break;
    const clean = line.trim().toLowerCase().replace(/\s*\[\d+\s*pts?\]\s*$/i, '').trim();
    if (!clean || isUnitLine(line)) continue;
    headerLines.push(clean);
  }
  for (const clean of headerLines) {
    for (const [slug, config] of Object.entries(FACTION_NAMES)) {
      if (config.names.includes(clean) || config.abbreviations.includes(clean)) return slug;
    }
    if (compositionsData) {
      for (const [slug, faction] of Object.entries(compositionsData.factions)) {
        for (const comp of faction.compositions) {
          if (comp.name === 'Grand Army') continue;
          const compName = comp.name.toLowerCase();
          if (clean === compName || clean.includes(compName)) return slug;
        }
      }
    }
  }

  // Step 2: unit-name scoring
  const candidates = [...new Set(extractCandidateNames(text))];
  const scores = {};
  for (const name of candidates) {
    const factions = unitNameIndex.names[name];
    if (!factions) continue;
    for (const slug of factions) scores[slug] = (scores[slug] || 0) + 1;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  const [bestSlug, bestScore] = ranked[0];
  const secondScore = ranked.length > 1 ? ranked[1][1] : 0;
  if (secondScore === 0 || bestScore >= 2 * secondScore || bestScore >= 3) {
    // A 3+ tie (e.g. a pure Chaos Warhounds/Harpies list) is still ambiguous.
    if (bestScore === secondScore) return null;
    return bestSlug;
  }
  return null;
}

/**
 * Official army compositions for the dropdown. First entry is the Grand Army.
 */
export function getArmyCompositions(factionSlug, compositionsData) {
  return compositionsData?.factions?.[factionSlug]?.compositions
    || [{ slug: factionSlug, name: 'Grand Army' }];
}

/**
 * Collect names of options/equipment/command entries and magic items that are
 * tagged with an armyComposition restriction — their presence in a list is
 * strong evidence for that composition (they are illegal outside it).
 */
function collectCompositionTaggedNames(factionSlug, compositionsData, factionData, magicItemsData) {
  const tagged = [];
  const validSlugs = new Set(getArmyCompositions(factionSlug, compositionsData).map(c => c.slug));

  const addEntry = (entry) => {
    const name = (entry.name_en || entry.name || '').toLowerCase().replace(/\*/g, '').trim();
    const comp = entry.armyComposition;
    if (!name || name.length < 5 || typeof comp !== 'string') return;
    if (validSlugs.has(comp) && comp !== factionSlug) tagged.push({ name, slug: comp });
  };

  if (factionData) {
    const categories = ['characters', 'core', 'special', 'rare', 'mercenaries', 'allies'];
    const unitName = (unit) => (unit.name_en || '').toLowerCase().replace(/\s*\{[^}]*\}/g, '').trim();

    // Names available in the Grand Army: no armyComposition restriction, or a
    // restriction object that includes the faction's own slug (see OWB
    // src/utils/army.js — units usually carry BOTH the grand-army key and the
    // composition keys they are legal in).
    const grandArmyNames = new Set();
    for (const category of categories) {
      for (const unit of factionData[category] || []) {
        const ac = unit.armyComposition;
        if (!ac || (typeof ac === 'object' && ac[factionSlug])) grandArmyNames.add(unitName(unit));
      }
    }

    for (const category of categories) {
      for (const unit of factionData[category] || []) {
        for (const list of [unit.options, unit.equipment, unit.armor, unit.command, unit.mounts]) {
          for (const entry of list || []) {
            addEntry(entry);
            for (const sub of entry.options || []) addEntry(sub);
          }
        }
        // A unit's presence is evidence for a composition only when it is
        // exclusive to it: not legal in the grand army under any template.
        const ac = unit.armyComposition;
        if (ac && typeof ac === 'object' && !ac[factionSlug]) {
          const name = unitName(unit);
          const slugs = Object.keys(ac).filter(s => validSlugs.has(s) && s !== factionSlug);
          if (name && slugs.length === 1 && !grandArmyNames.has(name)) {
            tagged.push({ name, slug: slugs[0] });
          }
        }
      }
    }
  }

  if (magicItemsData && compositionsData) {
    const sections = compositionsData.factions?.[factionSlug]?.items || [];
    for (const section of sections) {
      const items = magicItemsData[section];
      if (Array.isArray(items)) for (const item of items) addEntry(item);
    }
  }

  return tagged;
}

/**
 * Detect an Army of Infamy. Signals, strongest first:
 * 1. A composition's display name in the first 5 lines (confidence 1.0).
 * 2. Options/items only legal in a composition appearing in the text (0.9).
 * Only official slugs from army-compositions.json are ever suggested.
 * Returns { detected, suggestions: [{slug, name, confidence}], warnings }.
 */
export function detectArmyOfInfamy(text, factionSlug, compositionsData, factionData = null, magicItemsData = null) {
  const result = { detected: null, suggestions: [], warnings: [] };
  if (!text || !factionSlug) return result;

  const compositions = getArmyCompositions(factionSlug, compositionsData);
  const byName = new Map(compositions.map(c => [c.slug, c.name]));
  const suggest = (slug, confidence) => {
    const existing = result.suggestions.find(s => s.slug === slug);
    if (existing) existing.confidence = Math.max(existing.confidence, confidence);
    else result.suggestions.push({ slug, name: byName.get(slug) || slug, confidence });
  };

  // 1. Composition name in the header
  const headerLines = text.split('\n').slice(0, 5).map(l => l.trim().toLowerCase());
  for (const comp of compositions) {
    if (comp.slug === factionSlug) continue;
    const compName = comp.name.toLowerCase();
    if (headerLines.some(l => l && l.includes(compName))) suggest(comp.slug, 1.0);
  }

  // 2. Composition-restricted options/items present in the text
  const textLower = text.toLowerCase();
  for (const { name, slug } of collectCompositionTaggedNames(factionSlug, compositionsData, factionData, magicItemsData)) {
    if (textLower.includes(name)) suggest(slug, 0.9);
  }

  result.suggestions.sort((a, b) => b.confidence - a.confidence);
  const top = result.suggestions[0];
  if (top && top.confidence >= 0.9) {
    result.detected = top.slug;
    result.warnings.push(`This looks like a ${top.name} list. Change the army composition if that is wrong.`);
  } else if (top) {
    result.warnings.push(`This might be a ${top.name} list. Select the army composition manually if so.`);
  }
  return result;
}
