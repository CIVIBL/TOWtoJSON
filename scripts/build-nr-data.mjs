// Builds New Recruit (BattleScribe) catalogue indexes from the community
// .cat/.gst files at https://github.com/vflam/Warhammer-The-Old-World.
//
//   node scripts/build-nr-data.mjs [--src <dir>] [--faction <slug>]...
//
// Without --src the repo is shallow-cloned to a temp dir. Default factions:
// skaven, wood-elf-realms, host-of-talsyn.
//
// Outputs src/data/nr/game-system.json and src/data/nr/<slug>.json.
// Every id is copied verbatim from the source files — NR resolves selections
// against the community catalogue by these exact ids.
//
// Roster entryId anatomy (verified against reference-files/In_The_Pines_*.json):
// the '::'-joined ids of every entryLink traversed from the unit root, plus
// the terminal selectionEntry id. Intermediate plain selectionEntries and
// selectionEntryGroups contribute NO segment; groups only contribute their
// display name to the `group` field.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'data', 'nr');

const REPO_URL = 'https://github.com/vflam/Warhammer-The-Old-World.git';

// Our composition slugs -> catalogue file names in the repo.
const CATALOGUE_MAP = {
  'skaven': 'Skaven.cat',
  'wood-elf-realms': 'Wood Elf Realms.cat',
  'host-of-talsyn': 'Wood Elf Realms - Host of Talsyn.cat',
  'orions-wild-hunt': "Wood Elf Realms - Orion's Wild hunt.cat"
};

// --- args ---
const args = process.argv.slice(2);
let srcDir = null;
const factions = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--src') srcDir = args[++i];
  if (args[i] === '--faction') factions.push(args[++i]);
}
if (factions.length === 0) factions.push('skaven', 'wood-elf-realms', 'host-of-talsyn');

if (!srcDir) {
  srcDir = join(tmpdir(), 'nr-cat');
  if (!existsSync(join(srcDir, 'Warhammer_Old_World.gst'))) {
    console.log(`cloning ${REPO_URL} -> ${srcDir}`);
    execSync(`git clone --depth 1 "${REPO_URL}" "${srcDir}"`, { stdio: 'inherit' });
  }
}

// --- parse all catalogues ---
const ARRAY_TAGS = new Set([
  'selectionEntry', 'selectionEntryGroup', 'entryLink', 'categoryLink',
  'cost', 'constraint', 'catalogueLink', 'categoryEntry', 'forceEntry',
  'characteristic', 'profile', 'infoLink', 'modifier', 'condition', 'rule'
]);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  isArray: (name) => ARRAY_TAGS.has(name)
});

const files = readdirSync(srcDir).filter(f => f.endsWith('.cat') || f.endsWith('.gst'));
const catalogues = [];       // { file, root, id, name, revision }
const nodeIndex = new Map(); // id -> { node, kind }

function indexTree(node) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(indexTree); return; }
  if (node['@id'] && (node['@name'] || node['@type'])) {
    // Last write wins is fine: ids are globally unique in practice.
    if (!nodeIndex.has(node['@id'])) nodeIndex.set(node['@id'], node);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@') || key === 'profiles' || key === 'infoLinks' || key === 'rules' || key === 'modifiers') continue;
    indexTree(value);
  }
}

for (const file of files) {
  const doc = parser.parse(readFileSync(join(srcDir, file), 'utf-8'));
  const rootNode = doc.catalogue || doc.gameSystem;
  if (!rootNode) continue;
  catalogues.push({
    file,
    root: rootNode,
    id: rootNode['@id'],
    name: rootNode['@name'],
    revision: parseInt(rootNode['@revision'] || '0', 10),
    isGameSystem: Boolean(doc.gameSystem)
  });
  indexTree(rootNode);
}
console.log(`parsed ${catalogues.length} files, indexed ${nodeIndex.size} nodes`);

const gst = catalogues.find(c => c.isGameSystem);
if (!gst) throw new Error('no .gst game system file found');

// --- tree walking ---
const asArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const childEntries = (node) => asArray(node.selectionEntries?.selectionEntry);
const childLinks = (node) => asArray(node.entryLinks?.entryLink);
const childGroups = (node) => asArray(node.selectionEntryGroups?.selectionEntryGroup);

function pointsOf(node) {
  const cost = asArray(node?.costs?.cost).find(c => c['@typeId'] === 'points' || c['@name'] === 'pts');
  return cost ? parseFloat(cost['@value']) : null;
}

function minMaxOf(node) {
  let min = null, max = null;
  for (const c of asArray(node?.constraints?.constraint)) {
    if (c['@field'] !== 'selections') continue;
    if (c['@type'] === 'min') min = parseFloat(c['@value']);
    if (c['@type'] === 'max') max = parseFloat(c['@value']);
  }
  return { min, max };
}

function categoriesOf(node) {
  return asArray(node.categoryLinks?.categoryLink).map(l => ({
    entryId: l['@targetId'],
    name: l['@name'],
    primary: l['@primary'] === 'true'
  }));
}

/**
 * Walk an entry's children, emitting option nodes.
 * linkTrail: entryLink ids traversed so far (the roster entryId prefix).
 * groupPath: '::'-joined group display names (roster `group` field).
 */
function walkChildren(entry, linkTrail, groupPath, depth, seen) {
  if (depth > 10) return [];
  const out = [];

  for (const child of childEntries(entry)) {
    out.push(makeNode(child, null, linkTrail, groupPath, depth, seen));
  }
  for (const link of childLinks(entry)) {
    const target = nodeIndex.get(link['@targetId']);
    if (!target) continue;
    out.push(makeNode(target, link, linkTrail, groupPath, depth, seen));
  }
  for (const group of childGroups(entry)) {
    const nested = walkChildren(
      group, linkTrail,
      groupPath ? `${groupPath}::${group['@name']}` : group['@name'],
      depth + 1, seen
    );
    const def = group['@defaultSelectionEntryId'];
    if (def) for (const n of nested) {
      if (n.entryId === def || n.targetId === def) n.default = true;
    }
    out.push(...nested);
  }
  return out.filter(Boolean);
}

function makeNode(entry, viaLink, linkTrail, groupPath, depth, seen) {
  const id = entry['@id'];
  // Cycle guard (magic item groups link back into shared trees).
  const seenKey = `${id}|${groupPath}`;
  if (seen.has(seenKey)) return null;
  const nextSeen = new Set(seen); nextSeen.add(seenKey);

  const trail = viaLink ? [...linkTrail, viaLink['@id']] : linkTrail;
  const node = {
    name: viaLink?.['@name'] || entry['@name'],
    type: entry['@type'] || 'upgrade',
    entryId: id,
    targetId: viaLink ? entry['@id'] : undefined,
    path: [...trail, id].join('::'),
    points: viaLink ? (pointsOf(viaLink) ?? pointsOf(entry)) : pointsOf(entry),
    group: groupPath || undefined,
    ...minMaxOf(viaLink || entry)
  };
  const children = walkChildren(entry, trail, '', depth + 1, nextSeen);
  if (children.length > 0) node.children = children;
  if (node.points === null) delete node.points;
  if (node.min === null) delete node.min;
  if (node.max === null) delete node.max;
  if (node.targetId === undefined) delete node.targetId;
  return node;
}

function buildFactionData(slug) {
  const file = CATALOGUE_MAP[slug];
  if (!file) throw new Error(`no catalogue mapping for slug: ${slug}`);
  const cat = catalogues.find(c => c.file === file);
  if (!cat) throw new Error(`catalogue file not found in repo: ${file}`);

  const units = [];
  const rootLinks = asArray(cat.root.entryLinks?.entryLink);
  for (const link of rootLinks) {
    const target = nodeIndex.get(link['@targetId']);
    if (!target) { console.warn(`  unresolved root link: ${link['@name']}`); continue; }
    const seen = new Set([`${target['@id']}|`]);
    units.push({
      name: link['@name'] || target['@name'],
      type: target['@type'],
      path: [link['@id'], target['@id']].join('::'),
      linkId: link['@id'],
      entryId: target['@id'],
      points: pointsOf(link) ?? pointsOf(target) ?? undefined,
      categories: categoriesOf(target),
      children: walkChildren(target, [link['@id']], '', 0, seen)
    });
  }
  // Some catalogues also declare units as direct root selection entries.
  for (const entry of childEntries(cat.root)) {
    if (entry['@type'] !== 'unit' && entry['@type'] !== 'model') continue;
    const seen = new Set([`${entry['@id']}|`]);
    units.push({
      name: entry['@name'],
      type: entry['@type'],
      path: entry['@id'],
      entryId: entry['@id'],
      points: pointsOf(entry) ?? undefined,
      categories: categoriesOf(entry),
      children: walkChildren(entry, [], '', 0, seen)
    });
  }

  return {
    __source: { repo: REPO_URL, file, note: 'Generated by scripts/build-nr-data.mjs — do not edit by hand.' },
    catalogueId: cat.id,
    catalogueName: cat.name,
    catalogueRevision: cat.revision,
    units
  };
}

// --- emit ---
mkdirSync(outDir, { recursive: true });

const forceEntry = asArray(gst.root.forceEntries?.forceEntry)[0];
const gameSystem = {
  __source: { repo: REPO_URL, file: gst.file, note: 'Generated by scripts/build-nr-data.mjs — do not edit by hand.' },
  gameSystemId: gst.id,
  gameSystemName: gst.name,
  gameSystemRevision: gst.revision,
  battleScribeVersion: gst.root['@battleScribeVersion'] || '2.03',
  pointsTypeId: 'points',
  forceEntry: { id: forceEntry['@id'], name: forceEntry['@name'] },
  categories: asArray(gst.root.categoryEntries?.categoryEntry).map(c => ({
    entryId: c['@id'],
    name: c['@name']
  }))
};
writeFileSync(join(outDir, 'game-system.json'), JSON.stringify(gameSystem, null, 1) + '\n');
console.log(`game-system.json: ${gameSystem.gameSystemId} rev ${gameSystem.gameSystemRevision}, force "${gameSystem.forceEntry.name}", ${gameSystem.categories.length} categories`);

for (const slug of factions) {
  const data = buildFactionData(slug);
  const out = join(outDir, `${slug}.json`);
  writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
  const kb = Math.round(JSON.stringify(data).length / 1024);
  console.log(`${slug}.json: ${data.catalogueName} (${data.catalogueId}) — ${data.units.length} units, ${kb} KB`);
}
