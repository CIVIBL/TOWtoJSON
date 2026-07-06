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

test('parseWithFactionData matches all 10 units', () => {
  // Includes the two "Hell Pit Abomination" entries, whose data name carries a
  // {renegade} annotation (stripped since Phase B1 — phase-b/b1.md case 6).
  const parsed = parseWithFactionData(fixture, skavenData, itemIndex);
  for (const unit of parsed.units) {
    assert.equal(unit.success, true, `unit "${unit.rawName}" did not match`);
  }
});

