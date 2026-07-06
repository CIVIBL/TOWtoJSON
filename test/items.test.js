import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMagicItemIndex } from '../src/js/items.js';

const magicItems = JSON.parse(
  readFileSync(new URL('../src/data/owb/magic-items.json', import.meta.url), 'utf8')
);

// Collect normalized names from a raw section of magic-items.json
// (mirrors the index normalization: lowercase, strip asterisks, trim).
function sectionNames(section) {
  const value = magicItems[section];
  const arrays = Array.isArray(value)
    ? [value]
    : Object.values(value).filter(Array.isArray);
  return arrays
    .flat()
    .map((item) => (item.name_en || item.name || '').toLowerCase().replace(/\*/g, '').trim())
    .filter(Boolean);
}

test('skaven index contains faction and general items', () => {
  const index = buildMagicItemIndex(magicItems, 'skaven');
  // Faction-specific
  assert.ok(index.has('storm daemon'), 'missing storm daemon (skaven)');
  assert.ok(index.has('warpstone amulet'), 'missing warpstone amulet (skaven)');
  // General
  assert.ok(index.has('talisman of protection'), 'missing talisman of protection (general)');
  assert.ok(index.has('ruby ring of ruin'), 'missing ruby ring of ruin (general)');
});

test('skaven index excludes other factions\' extra categories', () => {
  const index = buildMagicItemIndex(magicItems, 'skaven');
  const virtues = sectionNames('knightly-virtues');
  const powers = sectionNames('vampiric-powers');
  assert.ok(virtues.length > 0, 'knightly-virtues section is empty in data');
  assert.ok(powers.length > 0, 'vampiric-powers section is empty in data');
  for (const name of virtues) {
    assert.ok(!index.has(name), `skaven index should not contain knightly virtue "${name}"`);
  }
  for (const name of powers) {
    assert.ok(!index.has(name), `skaven index should not contain vampiric power "${name}"`);
  }
});

test('wood-elf-realms index contains forest-spites and kindreds entries', () => {
  const index = buildMagicItemIndex(magicItems, 'wood-elf-realms');
  const spites = sectionNames('forest-spites');
  const kindreds = sectionNames('kindreds');
  assert.ok(spites.length > 0, 'forest-spites section is empty in data');
  assert.ok(kindreds.length > 0, 'kindreds section is empty in data');
  for (const name of spites) {
    assert.ok(index.has(name), `missing forest spite "${name}"`);
    assert.equal(index.get(name).source, 'forest-spites');
  }
  for (const name of kindreds) {
    assert.ok(index.has(name), `missing kindred "${name}"`);
    assert.equal(index.get(name).source, 'kindreds');
  }
});

test('names are normalized: asterisks stripped, lowercased, trimmed', () => {
  // Find a real general item whose raw name contains an asterisk.
  const starred = magicItems.general.find((item) =>
    (item.name_en || item.name || '').includes('*')
  );
  assert.ok(starred, 'expected at least one general item with * in its raw name');

  const rawName = starred.name_en || starred.name;
  const normalized = rawName.toLowerCase().replace(/\*/g, '').trim();
  const index = buildMagicItemIndex(magicItems, 'skaven');

  assert.ok(!normalized.includes('*'));
  assert.ok(index.has(normalized), `expected normalized key "${normalized}" in index`);
  assert.ok(!index.has(rawName), 'raw (unnormalized) name should not be a key');
});

test('faction entries win over general on name collision', () => {
  const fixture = {
    general: [{ name_en: 'Shared Trinket', points: 10 }],
    skaven: [{ name_en: 'Shared Trinket*', points: 25 }],
  };
  const index = buildMagicItemIndex(fixture, 'skaven');
  const entry = index.get('shared trinket');
  assert.ok(entry, 'missing shared trinket');
  assert.equal(entry.source, 'skaven');
  assert.equal(entry.points, 25);
});

test('unknown faction slug still indexes general items only', () => {
  const index = buildMagicItemIndex(magicItems, 'no-such-faction');
  assert.ok(index.has('talisman of protection'));
  for (const [, entry] of index) {
    assert.equal(entry.source, 'general');
  }
});
