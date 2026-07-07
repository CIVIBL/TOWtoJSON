// Generated NR data integrity (scripts/build-nr-data.mjs output).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { childrenOf } from '../src/js/generate-nr.js';

const nrDir = new URL('../src/data/nr/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('index.json', nrDir), 'utf8'));
const compositions = JSON.parse(fs.readFileSync(new URL('../src/data/owb/army-compositions.json', import.meta.url), 'utf8'));
const reference = JSON.parse(fs.readFileSync(new URL('../reference-files/In_The_Pines_-_Logan_s_Lair_-__To_Test_.json', import.meta.url), 'utf8'));

test('every shipped NR file parses with catalogue metadata and units', () => {
  const files = fs.readdirSync(nrDir).filter(f =>
    f.endsWith('.json') && !['game-system.json', 'index.json'].includes(f));
  assert.ok(files.length >= 35, `expected 35+ catalogue files, got ${files.length}`);
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(new URL(f, nrDir), 'utf8'));
    assert.ok(data.catalogueId, `${f}: missing catalogueId`);
    assert.ok(data.catalogueName, `${f}: missing catalogueName`);
    assert.ok(Array.isArray(data.units) && data.units.length > 0, `${f}: no units`);
    assert.equal(typeof data.shared, 'object', `${f}: missing shared dict`);
  }
});

test('every OWB composition slug resolves to a shipped NR file', () => {
  const missing = [];
  for (const faction of Object.values(compositions.factions)) {
    for (const comp of faction.compositions) {
      const file = manifest.files[comp.slug];
      if (!file || !fs.existsSync(new URL(`${file}.json`, nrDir))) missing.push(comp.slug);
    }
  }
  assert.deepEqual(missing, [], `compositions without NR data: ${missing.join(', ')}`);
});

test('all 70 reference roster entryIds are reproduced (with shared expansion)', () => {
  const data = JSON.parse(fs.readFileSync(new URL('host-of-talsyn.json', nrDir), 'utf8'));
  const ctx = { shared: data.shared, childrenCache: new Map() };
  const paths = new Set();
  const collect = (node) => {
    paths.add(node.path);
    for (const c of childrenOf(node, ctx)) collect(c);
  };
  for (const u of data.units) {
    paths.add(u.path);
    for (const c of u.children || []) collect(c);
  }

  const refIds = [];
  const collectRef = (sel) => {
    refIds.push([sel.name, sel.entryId]);
    for (const c of sel.selections || []) collectRef(c);
  };
  for (const s of reference.roster.forces[0].selections) collectRef(s);

  assert.equal(refIds.length, 70);
  const misses = refIds.filter(([, id]) => !paths.has(id));
  assert.deepEqual(misses, [], `reference entryIds not reproduced: ${JSON.stringify(misses)}`);
});
