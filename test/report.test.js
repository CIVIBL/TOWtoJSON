// Conversion report tests (Phase D1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { parseWithFactionData } from '../src/js/parse.js';
import { buildMagicItemIndex } from '../src/js/items.js';
import { generateOWBJson } from '../src/js/generate.js';
import { buildReport, computeUnitPoints, cleanDisplayName } from '../src/js/report.js';

const fixture = fs.readFileSync(new URL('./fixtures/skaven-bcp.txt', import.meta.url), 'utf8');
const skavenData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/skaven.json', import.meta.url), 'utf8'));
const magicItemsData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/magic-items.json', import.meta.url), 'utf8'));
const itemIndex = buildMagicItemIndex(magicItemsData, 'skaven');

function run(text) {
  const parsed = parseWithFactionData(text, skavenData, itemIndex);
  const owbJson = generateOWBJson({
    faction: 'Skaven', factionSlug: 'skaven',
    totalPoints: parsed.totalPoints, units: parsed.units
  }, { name: 'report test' });
  return { parsed, owbJson, report: buildReport(parsed, owbJson) };
}

test('clean fixture: all matched, no drops', () => {
  const { report } = run(fixture);
  assert.equal(report.total, 10);
  assert.equal(report.matched, 10);
  assert.deepEqual(report.dropped, []);
  assert.equal(report.points.parsed, 2197);
  assert.equal(report.points.header, null);
  assert.equal(typeof report.points.computed, 'number');
});

test('unmatchable unit is reported as dropped with its points (d1 case a)', () => {
  const broken = fixture.replace('232 - 31 Clanrats', '232 - 31 Zzzzz');
  const { report } = run(broken);
  assert.equal(report.matched, 9);
  assert.equal(report.total, 10);
  assert.deepEqual(report.dropped, [{ name: 'Zzzzz', points: 232 }]);
  // Dropped points still count toward the parsed total: the export is short.
  assert.equal(report.points.parsed, 2197);
  assert.ok(report.warnings.some(w => w.includes('NOT in the export')), 'drop warning present');
});

test('unknown tokens are reported per unit (d1 case b)', () => {
  const withUnknown = fixture.replace(
    'Ruby Ring of Ruin',
    'Ruby Ring of Ruin, Made Up Thing'
  );
  const { report } = run(withUnknown);
  const entry = report.unknownTokens.find(u => u.unit === 'Grey Seer');
  assert.ok(entry, 'Grey Seer unknown-token entry present');
  assert.deepEqual(entry.tokens, ['Made Up Thing']);
});

test('per-unit point mismatches are listed', () => {
  const { report } = run(fixture);
  // The Clanrats anchors include Weapon Team model costs that OWB cannot
  // reproduce from the unit alone — those two must show as mismatches.
  const names = report.points.unitMismatches.map(m => m.name);
  assert.ok(names.includes('Clanrats'), 'Clanrats mismatch flagged');
  for (const m of report.points.unitMismatches) {
    assert.equal(typeof m.parsed, 'number');
    assert.equal(typeof m.computed, 'number');
    assert.notEqual(m.parsed, m.computed);
  }
});

test('unplaced items surface as warnings', () => {
  const { report } = run('232 - 31 Clanrats, Talisman of Protection');
  assert.ok(
    report.warnings.some(w => w.includes('talisman of protection')),
    'unplaced item warning present'
  );
});

test('header points are surfaced when present', () => {
  const { report } = run('Skaven [2000 pts]\n\n465 - Grey Seer, General');
  assert.equal(report.points.header, 2000);
});

test('computeUnitPoints prices characters and units differently for items', () => {
  const unit = {
    points: 100, strength: 1,
    items: [{ selected: [{ points: 35, perModelPoints: 5, perModel: true }] }]
  };
  assert.equal(computeUnitPoints(unit, { isCharacter: true }), 135);
  assert.equal(computeUnitPoints({ ...unit, strength: 10 }, { isCharacter: false }), 1050);
});

test('cleanDisplayName strips annotations', () => {
  assert.equal(cleanDisplayName('Hell Pit Abomination {renegade}'), 'Hell Pit Abomination');
});
