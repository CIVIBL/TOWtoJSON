// New Recruit (BattleScribe roster JSON) generator.
// Consumes the same matched IR as generate.js plus the per-faction catalogue
// index from scripts/build-nr-data.mjs. Mirrors the structure of
// reference-files/In_The_Pines_-_Logan_s_Lair_-__To_Test_.json.

import { tokenEquals } from './match.js';

function rid() {
  let s = '';
  for (let i = 0; i < 24; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  return s;
}

const ptsCosts = (value) => [{ name: 'pts', typeId: 'points', value }];

function stripAnnotations(name) {
  return String(name || '').replace(/\s*\{[^}]*\}/g, '').trim();
}

function findNrUnit(units, rawName) {
  const wanted = stripAnnotations(rawName);
  return units.find(u => tokenEquals(u.name, wanted)) || null;
}

/**
 * Requested option names for one matched unit, with per-name number overrides.
 * Compound OWB names ("Packmaster, Whip") intentionally match multiple NR
 * nodes via tokenEquals' comma-part rule (the Packmaster model AND its Whip).
 */
function collectRequests(m) {
  const requests = new Map(); // name -> { number, aliases }
  const add = (name, number = null, aliases = []) => {
    if (name) requests.set(name, { number, aliases });
  };
  for (const list of [m.equipment, m.armor, m.mounts]) {
    for (const e of list || []) add(e.name);
  }
  for (const c of m.command || []) add(stripAnnotations(c.name));
  for (const o of m.options || []) add(o.name, o.stackableCount ?? null);
  for (const i of m.items || []) add(i.name);
  if (m.lore) add(m.lore.replace(/^lore-of-(the-)?/, '').replace(/-/g, ' '));
  // OWB says "Level 4 Wizard", the NR catalogue "Wizard Level 4".
  if (m.wizardLevel) add(`level ${m.wizardLevel} wizard`, null, [`wizard level ${m.wizardLevel}`]);
  for (const d of m.detachments || []) {
    add(stripAnnotations(d.unit.name_en || d.unit.name || ''), d.count);
    for (const t of d.tokens || []) add(t);
  }
  return requests;
}

function matchRequest(node, requests) {
  for (const [name, meta] of requests.entries()) {
    if (tokenEquals(node.name, name) || (meta.aliases || []).some(a => tokenEquals(node.name, a))) {
      return { name, ...meta };
    }
  }
  return null;
}

const isMandatory = (node) => typeof node.min === 'number' && node.min >= 1;

/**
 * Does this subtree contain a requested node? (memoized per call tree)
 */
function subtreeWants(node, requests, memo) {
  if (memo.has(node)) return memo.get(node);
  let wants = Boolean(matchRequest(node, requests));
  if (!wants) {
    for (const c of node.children || []) {
      if (subtreeWants(c, requests, memo)) { wants = true; break; }
    }
  }
  memo.set(node, wants);
  return wants;
}

/**
 * Build a roster selection from a catalogue node.
 * Included when requested (directly or in its subtree) or mandatory under an
 * included parent. number: main model row = unit strength; upgrades under a
 * model row inherit its number; everything else 1 unless overridden.
 */
function buildSelection(node, ctx, parentNumber, matchedNames) {
  const request = matchRequest(node, ctx.requests);
  if (request) matchedNames.add(request.name);

  let number = 1;
  if (node.type === 'model' && ctx.mainModel === node) {
    number = ctx.strength;
  } else if (request?.number) {
    number = request.number;
  } else if (node.type !== 'model' && node.type !== 'unit' && parentNumber > 1) {
    number = parentNumber;
  }
  // A node's min constraint is a floor (e.g. the Plague Furnace requires
  // exactly 3 Plague Monk Crew) — NR flags rosters below it.
  if (typeof node.min === 'number' && node.min > number) number = node.min;

  const memo = ctx.wantsMemo;
  const children = [];
  for (const child of node.children || []) {
    const childRequested = subtreeWants(child, ctx.requests, memo);
    if (childRequested || isMandatory(child)) {
      children.push(buildSelection(child, ctx, node.type === 'model' ? number : 1, matchedNames));
    }
  }

  const sel = {
    id: rid(),
    name: node.name,
    entryId: node.path,
    number,
    type: node.type || 'upgrade',
    from: node.group ? 'group' : 'entry'
  };
  if (node.group) sel.group = node.group;
  if (typeof node.points === 'number' && node.points > 0) {
    sel.costs = ptsCosts(node.points * number);
  }
  if (children.length > 0) sel.selections = children;
  return sel;
}

function sumCosts(selections) {
  let total = 0;
  for (const s of selections) {
    for (const c of s.costs || []) total += c.value;
    total += sumCosts(s.selections || []);
  }
  return total;
}

/**
 * Generate a New Recruit roster.
 * matchedList: { factionSlug, totalPoints, units } (same IR as generateOWBJson)
 * nrFaction: src/data/nr/<slug>.json  gameSystem: src/data/nr/game-system.json
 * Returns { roster, warnings: [{ unit, reason }] }.
 */
export function generateNRJson(matchedList, nrFaction, gameSystem, options = {}) {
  const { name = 'Converted Army' } = options;
  const warnings = [];
  const selections = [];
  const usedCategories = new Map();

  for (const m of matchedList.units) {
    if (!m.success) {
      warnings.push({ unit: stripAnnotations(m.rawName), reason: 'not matched from the list text' });
      continue;
    }
    const nrUnit = findNrUnit(nrFaction.units, m.rawName);
    if (!nrUnit) {
      warnings.push({ unit: stripAnnotations(m.rawName), reason: 'not found in the New Recruit catalogue' });
      continue;
    }

    const requests = collectRequests(m);
    // Main model row: the model whose name is the unit's (Clanrats -> Clanrat).
    const models = (nrUnit.children || []).filter(c => c.type === 'model');
    const mainModel = models.find(c => tokenEquals(c.name, stripAnnotations(nrUnit.name)))
      || models.find(isMandatory) || models[0] || null;

    const ctx = {
      requests,
      strength: m.modelCount || 1,
      mainModel,
      wantsMemo: new Map()
    };
    const matchedNames = new Set();
    const children = [];
    for (const child of nrUnit.children || []) {
      if (subtreeWants(child, requests, ctx.wantsMemo) || isMandatory(child) || child === mainModel) {
        children.push(buildSelection(child, ctx, 1, matchedNames));
      }
    }

    for (const reqName of requests.keys()) {
      if (!matchedNames.has(reqName)) {
        warnings.push({ unit: stripAnnotations(m.rawName), reason: `option "${reqName}" not found in the New Recruit catalogue` });
      }
    }

    const categories = (nrUnit.categories || []).filter(c => !c.name.startsWith('1 single'));
    for (const c of categories) usedCategories.set(c.entryId, c.name);

    selections.push({
      id: rid(),
      name: nrUnit.name,
      entryId: nrUnit.path,
      number: 1,
      type: nrUnit.type || 'unit',
      from: 'entry',
      categories: categories.map(c => ({ id: c.entryId, entryId: c.entryId, name: c.name, primary: c.primary })),
      ...(children.length > 0 ? { selections: children } : {})
    });
  }

  const total = sumCosts(selections);
  const roster = {
    id: rid(),
    name,
    battleScribeVersion: gameSystem.battleScribeVersion,
    generatedBy: 'TOW List Converter',
    gameSystemId: gameSystem.gameSystemId,
    gameSystemName: gameSystem.gameSystemName,
    gameSystemRevision: gameSystem.gameSystemRevision,
    xmlns: 'http://www.battlescribe.net/schema/rosterSchema',
    costs: ptsCosts(total),
    costLimits: ptsCosts(matchedList.totalPoints),
    forces: [{
      id: rid(),
      name: gameSystem.forceEntry.name,
      entryId: gameSystem.forceEntry.id,
      catalogueId: nrFaction.catalogueId,
      catalogueRevision: nrFaction.catalogueRevision,
      catalogueName: nrFaction.catalogueName,
      categories: [...usedCategories.entries()].map(([entryId, catName]) => ({
        id: rid().slice(0, 8), entryId, name: catName, primary: false
      })),
      selections
    }]
  };

  return { roster: { roster }, warnings };
}
