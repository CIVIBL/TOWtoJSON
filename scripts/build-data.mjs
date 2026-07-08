// Generates detection data from the faction files we ship plus the
// old-world-builder repo's own definitions (the source of truth for
// army-composition slugs and per-faction magic item sections).
//
//   node scripts/build-data.mjs [--fetch]
//
// --fetch first downloads the current faction JSONs (units, points,
// equipment, magic-items) from the OWB repo into src/data/owb/, so points
// changes upstream flow into the converter. Without it the script runs
// offline against the local snapshots (only the composition/name-map assets
// are fetched).
//
// Outputs:
//   src/data/owb/unit-name-index.json   name variant -> faction slug(s)
//   src/data/owb/army-compositions.json official composition slugs + names,
//                                       per-faction magic item sections
//
// Never hand-edit the outputs; re-run this script instead.

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateNameVariations } from '../src/js/parse.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data', 'owb');

const OWB_RAW = 'https://raw.githubusercontent.com/nthiebes/old-world-builder/main';
const OWB_TREE_URL = 'https://api.github.com/repos/nthiebes/old-world-builder/git/trees/main?recursive=1';
const OWB_ASSET_URL = `${OWB_RAW}/src/assets/the-old-world.json`;
const OWB_NAME_MAP_URL = `${OWB_RAW}/src/pages/magic/name-map.js`;

// Ours, never overwritten by --fetch: generated outputs + hand-maintained aliases.
const LOCAL_ONLY_FILES = ['unit-name-index.json', 'army-compositions.json', 'unit-aliases.json'];

const CATEGORIES = ['characters', 'core', 'special', 'rare', 'mercenaries', 'allies'];

async function fetchText(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} fetching ${url}`);
  return resp.text();
}

/**
 * Download the current faction data files from the OWB repo. The file list
 * comes from the GitHub tree API so newly added factions arrive automatically.
 */
async function fetchFactionFiles() {
  const tree = JSON.parse(await fetchText(OWB_TREE_URL));
  const remote = tree.tree
    .map(e => e.path)
    .filter(p => p.startsWith('public/games/the-old-world/') && p.endsWith('.json'));
  if (remote.length < 15) {
    throw new Error(`suspiciously few faction files upstream (${remote.length}) — repo layout changed?`);
  }
  console.log(`fetching ${remote.length} faction files from the OWB repo`);
  for (const path of remote) {
    const file = path.split('/').pop();
    if (LOCAL_ONLY_FILES.includes(file)) continue;
    const text = await fetchText(`${OWB_RAW}/${path}`);
    JSON.parse(text); // fail loudly on a bad download rather than writing it
    writeFileSync(join(dataDir, file), text.endsWith('\n') ? text : text + '\n');
  }
}

function buildUnitNameIndex(factionFiles, aliases) {
  const names = {};
  const unitCounts = {};
  const addName = (name, slug) => {
    for (const variation of generateNameVariations(name)) {
      const key = variation.toLowerCase();
      if (!names[key]) names[key] = [];
      if (!names[key].includes(slug)) names[key].push(slug);
    }
  };
  for (const [slug, data] of factionFiles) {
    let count = 0;
    for (const category of CATEGORIES) {
      for (const unit of data[category] || []) {
        const name = unit.name_en || unit.name || '';
        if (!name) continue;
        count++;
        addName(name, slug);
      }
    }
    // Colloquial aliases count for detection too ("Halberdiers" -> empire).
    for (const alias of Object.keys(aliases[slug] || {})) {
      if (!alias.startsWith('__')) addName(alias, slug);
    }
    unitCounts[slug] = count;
  }
  return { names, unitCounts };
}

function titleCase(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function buildArmyCompositions() {
  const asset = JSON.parse(await fetchText(OWB_ASSET_URL));

  // name-map.js is an ES module; import it to avoid hand-parsing JS.
  const nameMapSource = await fetchText(OWB_NAME_MAP_URL);
  const tmp = mkdtempSync(join(tmpdir(), 'owb-'));
  const tmpFile = join(tmp, 'name-map.mjs');
  writeFileSync(tmpFile, nameMapSource);
  const { nameMap } = await import(pathToFileURL(tmpFile).href);
  rmSync(tmp, { recursive: true, force: true });

  const factions = {};
  for (const army of asset.armies) {
    factions[army.id] = {
      name: army.name_en || titleCase(army.id),
      compositions: (army.armyComposition || [army.id]).map(slug => ({
        slug,
        name: slug === army.id
          ? 'Grand Army'
          : (nameMap[slug]?.name_en || titleCase(slug))
      })),
      // Which magic-items.json sections this faction may take items from.
      items: army.items || ['general']
    };
  }
  return factions;
}

if (process.argv.includes('--fetch')) {
  await fetchFactionFiles();
}

const factionFiles = readdirSync(dataDir)
  .filter(f => f.endsWith('.json') && f !== 'magic-items.json' && !LOCAL_ONLY_FILES.includes(f))
  .map(f => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dataDir, f), 'utf-8'))]);

const unitAliases = JSON.parse(readFileSync(join(dataDir, 'unit-aliases.json'), 'utf-8'));
const { names, unitCounts } = buildUnitNameIndex(factionFiles, unitAliases);
const factions = await buildArmyCompositions();

const stamp = {
  sources: [OWB_ASSET_URL, OWB_NAME_MAP_URL],
  retrievedAt: new Date().toISOString().slice(0, 10),
  note: 'Generated by scripts/build-data.mjs — do not edit by hand.'
};

writeFileSync(join(dataDir, 'unit-name-index.json'),
  JSON.stringify({ __source: stamp, unitCounts, names }, null, 1) + '\n');
writeFileSync(join(dataDir, 'army-compositions.json'),
  JSON.stringify({ __source: stamp, factions }, null, 1) + '\n');

console.log(`unit-name-index.json: ${Object.keys(names).length} name variants across ${factionFiles.length} factions`);
console.log(`army-compositions.json: ${Object.keys(factions).length} factions`);
for (const [slug, f] of Object.entries(factions)) {
  console.log(`  ${slug}: ${f.compositions.map(c => c.slug).join(', ')}`);
}
