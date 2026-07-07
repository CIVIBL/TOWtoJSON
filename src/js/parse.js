// Smart format-agnostic parser.
// Uses faction data as dictionary to find units in ANY text format.
// Extracted verbatim from index.html (Phase A1) — behavior changes land in Phase B.

import { matchUnitName, extractOptions, tokenizeUnitBlock, tokenEquals } from './match.js';

/**
 * Build a searchable index of unit names from faction data
 */
export function buildUnitNameIndex(factionData) {
  const index = new Map();
  const categories = ['characters', 'core', 'special', 'rare'];

  for (const category of categories) {
    const units = factionData[category] || [];
    for (const unit of units) {
      const name = unit.name_en || unit.name || '';
      if (!name) continue;

      // Generate variations for flexible matching
      const variations = generateNameVariations(name);
      for (const variation of variations) {
        const key = variation.toLowerCase();
        // Keep the longest match (prefer full names over partial)
        if (!index.has(key) || name.length > index.get(key).originalName.length) {
          index.set(key, { unit, category, originalName: name, matchLength: variation.length });
        }
      }
    }
  }
  return index;
}

/**
 * Generate variations of a unit name for flexible matching
 */
export function generateNameVariations(name) {
  const variations = [name];
  // Strip {faction} annotations like "Hell Pit Abomination {renegade}" so the
  // clean name is matchable (phase-b/b1.md case 6).
  const stripped = name.replace(/\s*\{[^}]*\}/g, '').trim();
  const bases = new Set([name.toLowerCase(), stripped.toLowerCase()]);

  for (const lower of bases) {
    variations.push(lower);

    // Handle plurals
    if (lower.endsWith('s') && !lower.endsWith('ss')) variations.push(lower.slice(0, -1));
    if (!lower.endsWith('s')) variations.push(lower + 's');

    // Handle "of the" variations
    if (lower.includes(' of the ')) variations.push(lower.replace(/ of the /g, ' '));
    if (lower.includes(' of ')) variations.push(lower.replace(/ of /g, ' '));
  }

  return [...new Set(variations)];
}

/**
 * Parse section headers to get category mapping
 * Returns array of { category, startIndex }
 */
export function parseSectionHeaders(text) {
  const sections = [];
  const regex = /\+\+\s*(Characters|Core|Special|Rare)\s*(?:Units?)?\s*\[[\d,]+\s*pts?\]\s*\+\+/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const categoryName = match[1].toLowerCase();
    sections.push({
      category: categoryName === 'characters' ? 'characters' : categoryName,
      startIndex: match.index
    });
  }
  return sections;
}

/**
 * Get category for a position in the text based on section headers
 */
export function getCategoryAtPosition(position, sections) {
  let category = 'special'; // default
  for (const section of sections) {
    if (position >= section.startIndex) {
      category = section.category;
    }
  }
  return category;
}

/**
 * Extract total points from list header if present
 * Looks for patterns like "Wood Elf Realms [2000 pts]" or "Skaven [1500pts]"
 */
export function extractHeaderPoints(text) {
  const lines = text.split('\n').slice(0, 10); // Check first 10 lines
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip section headers like "++ Characters [1284 pts] ++"
    if (trimmed.startsWith('++')) continue;
    // Match faction header with points: "Wood Elf Realms [2000 pts]"
    const match = trimmed.match(/^[A-Za-z][A-Za-z\s\-]+\s*\[(\d+)\s*pts?\]$/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

/**
 * Find unit entry "anchors" - lines that have points, indicating a real unit entry
 * Returns array of { lineStart, lineEnd, line, points, modelCount, unitNameArea }
 */
export function findUnitAnchors(text) {
  const anchors = [];
  const lines = text.split('\n');
  let position = 0;
  let seenSectionHeader = false;
  let lineNumber = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const lineStart = position;
    const lineEnd = position + line.length;
    lineNumber++;

    // Skip section headers like "++ Characters [1284 pts] ++"
    if (trimmed.startsWith('++') && trimmed.endsWith('++')) {
      seenSectionHeader = true;
      position = lineEnd + 1;
      continue;
    }

    // Skip faction header lines like "Wood Elf Realms [2000 pts]"
    // Only check in first 5 lines AND before any section headers
    // Faction headers don't have model counts and appear at the very top
    if (lineNumber <= 5 && !seenSectionHeader && anchors.length === 0) {
      const isFactionHeader = /^[A-Za-z][A-Za-z\s\-]+\s*\[\d+\s*pts?\]$/i.test(trimmed);
      if (isFactionHeader) {
        position = lineEnd + 1;
        continue;
      }
    }

    // Pattern 1: OWB format "Unit Name [XXX pts]" or "15 Glade Guard [225 pts]"
    const owbMatch = trimmed.match(/^(.+?)\s*\[(\d+)\s*pts?\]$/i);
    if (owbMatch) {
      let unitNameArea = owbMatch[1].trim();
      const points = parseInt(owbMatch[2], 10);

      // Extract model count if present at start
      let modelCount = 1;
      const countMatch = unitNameArea.match(/^(\d+)\s+(.+)$/);
      if (countMatch) {
        modelCount = parseInt(countMatch[1], 10);
        unitNameArea = countMatch[2].trim();
      }

      anchors.push({ lineStart, lineEnd, line: trimmed, points, modelCount, unitNameArea });
    }

    // Pattern 2: BCP format "XXX - Unit Name, options..."
    const bcpMatch = trimmed.match(/^(\d+)\s*-\s*(.+)$/);
    if (bcpMatch && !owbMatch) {
      const points = parseInt(bcpMatch[1], 10);
      let unitNameArea = bcpMatch[2].trim();

      // Extract model count if present
      let modelCount = 1;
      const countMatch = unitNameArea.match(/^(\d+)\s+(.+)$/);
      if (countMatch) {
        modelCount = parseInt(countMatch[1], 10);
        unitNameArea = countMatch[2].trim();
      }

      anchors.push({ lineStart, lineEnd, line: trimmed, points, modelCount, unitNameArea });
    }

    position = lineEnd + 1; // +1 for newline
  }

  return anchors;
}

/**
 * Build index of detachment units from faction data
 * Returns Map of detachment name -> detachment unit template
 */
export function buildDetachmentIndex(factionData) {
  const index = new Map();
  const categories = ['characters', 'core', 'special', 'rare'];

  for (const category of categories) {
    const units = factionData[category] || [];
    for (const unit of units) {
      if (unit.detachment) {
        const name = (unit.name_en || unit.name || '').toLowerCase();
        if (name) {
          index.set(name, unit);
          // Add variations
          if (name.endsWith('s')) index.set(name.slice(0, -1), unit);
          if (!name.endsWith('s')) index.set(name + 's', unit);
        }
      }
    }
  }
  return index;
}

/**
 * Extract detachments from a unit block's sub-lines.
 * A line whose label IS a detachment unit ("1x Weapon Team") creates one;
 * a matching crew line ("1x Weapon Team Crew, Ratling Gun") contributes its
 * tokens (the weapon choice) to that detachment instead of duplicating it.
 */
export function extractDetachments(context, detachmentIndex) {
  const { subLines } = tokenizeUnitBlock(context);
  const detachments = [];

  for (const line of subLines) {
    let matchedUnit = null;
    for (const [detachName, detachUnit] of detachmentIndex.entries()) {
      if (tokenEquals(line.label, detachName)) {
        matchedUnit = detachUnit;
        break;
      }
    }
    if (matchedUnit) {
      const existing = detachments.find(d => d.unit === matchedUnit);
      if (existing) {
        existing.count += line.count;
        existing.tokens.push(...line.tokens);
      } else {
        detachments.push({ unit: matchedUnit, count: line.count, tokens: [...line.tokens] });
      }
      continue;
    }

    const crewMatch = line.label.match(/^(.+?)\s+crew$/i);
    if (crewMatch) {
      const det = detachments.find(d => tokenEquals(crewMatch[1], d.unit.name_en || d.unit.name || ''));
      if (det) det.tokens.push(...line.tokens);
    }
  }
  return detachments;
}

/**
 * Main parsing function - anchor-based approach
 * Only creates units from lines that have points (real unit entries)
 */
export function parseWithFactionData(text, factionData, magicItemIndex) {
  const unitIndex = buildUnitNameIndex(factionData);
  const detachmentIndex = buildDetachmentIndex(factionData);
  const sections = parseSectionHeaders(text);
  const anchors = findUnitAnchors(text);

  // Try to get total points from header first
  const headerPoints = extractHeaderPoints(text);

  const units = [];
  let calculatedPoints = 0;

  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const nextAnchorStart = i + 1 < anchors.length ? anchors[i + 1].lineStart : text.length;

    // Get the context for this unit (from this anchor to the next)
    const context = text.substring(anchor.lineStart, nextAnchorStart);

    // Try to match the unit name against faction data
    const matchedUnit = matchUnitName(anchor.unitNameArea, unitIndex);

    if (matchedUnit) {
      // Determine category from section headers or faction data
      const category = sections.length > 0
        ? getCategoryAtPosition(anchor.lineStart, sections)
        : matchedUnit.category;

      // Extract options from the full context
      const options = extractOptions(context, matchedUnit.unit, magicItemIndex);

      // Check for detachments if this is a regimental unit
      let detachments = [];
      if (matchedUnit.unit.regimentalUnit || matchedUnit.unit.maxDetachments) {
        detachments = extractDetachments(context, detachmentIndex);
      }

      units.push({
        rawName: matchedUnit.originalName,
        matchedName: anchor.unitNameArea,
        category: category,
        unitTemplate: matchedUnit.unit,
        // Anchor counts like "31 Clanrats" include sub-models (weapon team
        // crew); the rank-and-file sub-line carries the real strength.
        modelCount: options.rankAndFileCount ?? anchor.modelCount,
        rawPoints: anchor.points,
        detachments: detachments,
        ...options,
        success: true
      });

      calculatedPoints += anchor.points;
    } else {
      // Unit not found in faction data - still track it
      units.push({
        rawName: anchor.unitNameArea,
        matchedName: anchor.unitNameArea,
        category: sections.length > 0 ? getCategoryAtPosition(anchor.lineStart, sections) : 'special',
        unitTemplate: null,
        modelCount: anchor.modelCount,
        rawPoints: anchor.points,
        detachments: [],
        equipment: [], armor: [], options: [], mounts: [], command: [], items: [],
        success: false
      });

      calculatedPoints += anchor.points;
    }
  }

  // Use header points if available, otherwise use calculated sum
  const totalPoints = headerPoints !== null ? headerPoints : calculatedPoints;

  return { units, totalPoints, unitCount: units.length, headerPoints };
}
