// Parser tests against the live ES modules in src/js/.
// Fixture ground truth: 10 unit anchors, 2197 total points.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { findUnitAnchors, parseWithFactionData } from '../src/js/parse.js';
import { buildMagicItemIndex } from '../src/js/items.js';

const fixture = fs.readFileSync(new URL('./fixtures/skaven-bcp.txt', import.meta.url), 'utf8');
const skavenData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/skaven.json', import.meta.url), 'utf8'));
const magicItemsData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/magic-items.json', import.meta.url), 'utf8'));

const itemIndex = buildMagicItemIndex(magicItemsData, 'skaven');

test('findUnitAnchors finds 10 anchors summing to 2197 points', () => {
  const anchors = findUnitAnchors(fixture);
  assert.equal(anchors.length, 10);
  const totalPoints = anchors.reduce((sum, a) => sum + a.points, 0);
  assert.equal(totalPoints, 2197);
});

test('findUnitAnchors extracts model counts', () => {
  const anchors = findUnitAnchors(fixture);

  const clanrats = anchors.filter(a => a.unitNameArea.startsWith('Clanrats'));
  assert.equal(clanrats.length, 2);
  assert.deepEqual(clanrats.map(a => a.modelCount).sort((x, y) => y - x), [31, 30]);

  const giantRats = anchors.filter(a => a.unitNameArea.startsWith('Giant Rats'));
  assert.equal(giantRats.length, 2);
  assert.deepEqual(giantRats.map(a => a.modelCount), [14, 14]);
});

test('parseWithFactionData returns 10 units totalling 2197 points', () => {
  const parsed = parseWithFactionData(fixture, skavenData, itemIndex);
  assert.equal(parsed.units.length, 10);
  assert.equal(parsed.totalPoints, 2197);
});

test('parseWithFactionData matches all 10 units', { todo: true }, () => {
  // KNOWN LIMITATION: skaven.json names the unit "Hell Pit Abomination {renegade}",
  // so the two "Hell Pit Abomination" entries do not match under the current
  // substring matcher. Phase B fixes this — see phase-b/b1.md test case 6.
  const parsed = parseWithFactionData(fixture, skavenData, itemIndex);
  for (const unit of parsed.units) {
    assert.equal(unit.success, true, `unit "${unit.rawName}" did not match`);
  }
});

test('parseWithFactionData matches exactly 8 of 10 units (current behavior)', () => {
  // Hard pin on current behavior: the two Hell Pit Abomination entries fail
  // ("Hell Pit Abomination {renegade}" in skaven.json). When Phase B lands
  // (phase-b/b1.md test case 6), this becomes 10 and the todo test above passes.
  const parsed = parseWithFactionData(fixture, skavenData, itemIndex);
  const matched = parsed.units.filter(u => u.success);
  assert.equal(matched.length, 8);

  const failed = parsed.units.filter(u => !u.success);
  assert.equal(failed.length, 2);
  for (const unit of failed) {
    assert.equal(unit.rawName, 'Hell Pit Abomination');
  }
});
