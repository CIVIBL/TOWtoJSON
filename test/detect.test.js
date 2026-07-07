// Detection tests against the generated data indexes (Phase C).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { detectFaction, detectArmyOfInfamy, getArmyCompositions } from '../src/js/detect.js';

const fixture = fs.readFileSync(new URL('./fixtures/skaven-bcp.txt', import.meta.url), 'utf8');
const unitNameIndex = JSON.parse(fs.readFileSync(new URL('../src/data/owb/unit-name-index.json', import.meta.url), 'utf8'));
const compositions = JSON.parse(fs.readFileSync(new URL('../src/data/owb/army-compositions.json', import.meta.url), 'utf8'));
const woodElves = JSON.parse(fs.readFileSync(new URL('../src/data/owb/wood-elf-realms.json', import.meta.url), 'utf8'));
const magicItemsData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/magic-items.json', import.meta.url), 'utf8'));

test('detects skaven from the fixture header', () => {
  assert.equal(detectFaction(fixture, unitNameIndex, compositions), 'skaven');
});

test('detects skaven from units alone (header removed)', () => {
  const headerless = fixture.split('\n').slice(1).join('\n');
  assert.equal(detectFaction(headerless, unitNameIndex, compositions), 'skaven');
});

test('detects from units missing in the old curated lists', () => {
  // Rat Swarms and Warplock Jezzails were not in the old FACTION_CONFIG
  // uniqueUnits — the data-driven index must still resolve them.
  const text = '100 - Rat Swarms\n120 - Warplock Jezzails\n80 - Rat Swarms';
  assert.equal(detectFaction(text, unitNameIndex, compositions), 'skaven');
});

test('ambiguous lists return null instead of guessing', () => {
  // Chaos Warhounds exist in both beastmen-brayherds and warriors-of-chaos:
  // a dead tie must not guess.
  const text = '60 - Chaos Warhounds';
  assert.equal(detectFaction(text, unitNameIndex, compositions), null);
});

test('cross-faction units resolve when one faction explains all of them', () => {
  // Chaos Warhounds (beastmen + WoC) and Harpies (beastmen + dark elves):
  // only beastmen-brayherds contains both.
  const text = '60 - Chaos Warhounds\n55 - Harpies';
  assert.equal(detectFaction(text, unitNameIndex, compositions), 'beastmen-brayherds');
});

test('unrelated text detects nothing', () => {
  assert.equal(detectFaction('completely unrelated text\nabout nothing', unitNameIndex, compositions), null);
});

test('faction header name still wins over unit scoring', () => {
  const text = 'Wood Elves\n\n100 - Glade Guard';
  assert.equal(detectFaction(text, unitNameIndex, compositions), 'wood-elf-realms');
});

test('getArmyCompositions returns the official slugs verbatim', () => {
  const comps = getArmyCompositions('wood-elf-realms', compositions);
  assert.deepEqual(comps.map(c => c.slug), ['wood-elf-realms', 'orions-wild-hunt', 'host-of-talsyn']);
  assert.equal(comps[0].name, 'Grand Army');
  // The old string-munged slug must never reappear.
  assert.equal(comps.some(c => c.slug.includes("'")), false);
});

test('skaven has no clan-pestilens composition (OWB does not know it)', () => {
  const comps = getArmyCompositions('skaven', compositions);
  assert.deepEqual(comps.map(c => c.slug), ['skaven', 'sk-renegade']);
});

test('AoI: composition name in the header is detected', () => {
  const text = 'Host of Talsyn\n\n135 - Glade Lord';
  const aoi = detectArmyOfInfamy(text, 'wood-elf-realms', compositions);
  assert.equal(aoi.detected, 'host-of-talsyn');
  assert.equal(aoi.warnings.length, 1);
});

test('AoI: composition-restricted option suggests its composition', () => {
  // Talismanic Tattoos is tagged armyComposition: orions-wild-hunt in the
  // wood elf faction data — it is illegal in any other composition.
  const text = 'My elf list\n\n135 - Glade Lord, Talismanic Tattoos';
  const aoi = detectArmyOfInfamy(text, 'wood-elf-realms', compositions, woodElves, magicItemsData);
  assert.equal(aoi.detected, 'orions-wild-hunt');
});

test('AoI: plain Grand Army list detects nothing, even with full data', () => {
  // Regression: Hell Pit Abomination carries armyComposition keys for BOTH
  // 'skaven' and 'sk-renegade' - dual-legality must not read as renegade.
  const skaven = JSON.parse(fs.readFileSync(new URL('../src/data/owb/skaven.json', import.meta.url), 'utf8'));
  const aoi = detectArmyOfInfamy(fixture, 'skaven', compositions, skaven, magicItemsData);
  assert.equal(aoi.detected, null);
  assert.deepEqual(aoi.suggestions, []);
});
