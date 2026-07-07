// Colloquial unit-name aliases and hyphen normalization (hardening sweep).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildUnitNameIndex, parseWithFactionData } from '../src/js/parse.js';
import { matchUnitName } from '../src/js/match.js';
import { buildMagicItemIndex } from '../src/js/items.js';

const load = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const aliases = load('../src/data/owb/unit-aliases.json');
const magicItemsData = load('../src/data/owb/magic-items.json');
const empire = load('../src/data/owb/empire-of-man.json');
const bretonnia = load('../src/data/owb/kingdom-of-bretonnia.json');
const vampires = load('../src/data/owb/vampire-counts.json');
const highElves = load('../src/data/owb/high-elf-realms.json');

test('hyphenated data names match space-separated input without an alias', () => {
  const index = buildUnitNameIndex(bretonnia);
  const match = matchUnitName('Men at Arms', index);
  assert.ok(match, 'Men at Arms resolves');
  assert.equal(match.unit.name_en, 'Men-at-Arms');

  const heIndex = buildUnitNameIndex(highElves);
  const bolt = matchUnitName('Eagle Claw Bolt Thrower', heIndex);
  assert.ok(bolt, 'Eagle Claw Bolt Thrower resolves');
  assert.equal(bolt.unit.name_en, 'Eagle-Claw Bolt Thrower');
});

test('string alias resolves to the canonical unit', () => {
  const index = buildUnitNameIndex(vampires, aliases['vampire-counts']);
  const match = matchUnitName('Skeletons', index);
  assert.ok(match, 'Skeletons resolves via alias');
  assert.equal(match.unit.name_en, 'Skeleton Warriors {vampire counts}');
});

test('alias with implied equipment activates it end-to-end (Halberdiers)', () => {
  const itemIndex = buildMagicItemIndex(magicItemsData, 'empire-of-man');
  const parsed = parseWithFactionData(
    '200 - 20 Halberdiers, Sergeant, Standard Bearer, Musician',
    empire, itemIndex, aliases['empire-of-man']
  );
  assert.equal(parsed.units.length, 1);
  const unit = parsed.units[0];
  assert.equal(unit.success, true, 'Halberdiers matched');
  assert.equal(unit.unitTemplate.name_en, 'State Troops');
  assert.ok(
    unit.equipment.some(e => /halberds/i.test(e.data.name_en)),
    'implied Halberds equipment active'
  );
  assert.equal(unit.modelCount, 20);
});

test('alias implying multiple entries activates all (Swordsmen)', () => {
  const itemIndex = buildMagicItemIndex(magicItemsData, 'empire-of-man');
  const parsed = parseWithFactionData('120 - 20 Swordsmen', empire, itemIndex, aliases['empire-of-man']);
  const unit = parsed.units[0];
  assert.equal(unit.success, true);
  assert.equal(unit.unitTemplate.name_en, 'State Troops');
  assert.ok(unit.equipment.some(e => /hand weapons/i.test(e.data.name_en)), 'Hand weapons active');
  assert.ok(unit.options.some(o => /shields/i.test(o.name)), 'Shields option active');
});

test('handgunners imply the right compound equipment', () => {
  const itemIndex = buildMagicItemIndex(magicItemsData, 'empire-of-man');
  const parsed = parseWithFactionData('130 - 10 Handgunners', empire, itemIndex, aliases['empire-of-man']);
  const unit = parsed.units[0];
  assert.equal(unit.unitTemplate.name_en, 'State Missile Troops');
  assert.ok(
    unit.equipment.some(e => e.data.name_en === 'Hand weapons, Handguns'),
    'Handguns equipment active'
  );
});

test('every alias target exists in its faction data', () => {
  const norm = (s) => s.toLowerCase().replace(/\s*\{[^}]*\}/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [slug, factionAliases] of Object.entries(aliases)) {
    if (slug.startsWith('__')) continue;
    const data = load(`../src/data/owb/${slug}.json`);
    const names = new Set();
    for (const cat of ['characters', 'core', 'special', 'rare', 'mercenaries', 'allies']) {
      for (const u of data[cat] || []) names.add(norm(u.name_en || ''));
    }
    for (const [alias, target] of Object.entries(factionAliases)) {
      const canonical = typeof target === 'string' ? target : target.unit;
      assert.ok(names.has(norm(canonical)), `${slug}: alias "${alias}" targets unknown unit "${canonical}"`);
    }
  }
});
