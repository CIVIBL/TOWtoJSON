// Full-pipeline OWB generator tests against the live ES modules in src/js/.
// detectFactionFromText -> buildMagicItemIndex -> parseWithFactionData -> generateOWBJson

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { detectFactionFromText } from '../src/js/detect.js';
import { buildMagicItemIndex } from '../src/js/items.js';
import { parseWithFactionData } from '../src/js/parse.js';
import { generateOWBJson } from '../src/js/generate.js';

const fixture = fs.readFileSync(new URL('./fixtures/skaven-bcp.txt', import.meta.url), 'utf8');
const skavenData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/skaven.json', import.meta.url), 'utf8'));
const magicItemsData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/magic-items.json', import.meta.url), 'utf8'));

function runPipeline() {
  const factionSlug = detectFactionFromText(fixture);
  const itemIndex = buildMagicItemIndex(magicItemsData, factionSlug);
  const parsed = parseWithFactionData(fixture, skavenData, itemIndex);
  const output = generateOWBJson({
    faction: 'Skaven',
    factionSlug,
    totalPoints: parsed.totalPoints,
    units: parsed.units
  }, { name: 'Skaven Test List' });
  return { factionSlug, parsed, output };
}

test('output has the OWB list shape', () => {
  const { output } = runPipeline();

  assert.equal(output.name, 'Skaven Test List');
  assert.equal(output.game, 'the-old-world');
  assert.equal(output.army, 'skaven');
  assert.equal(output.points, 2197);
  assert.equal(output.armyComposition, 'skaven');

  assert.ok(Array.isArray(output.characters));
  assert.ok(Array.isArray(output.core));
  assert.ok(Array.isArray(output.special));
  assert.ok(Array.isArray(output.rare));
});

test('only matched units are placed, in faction-data categories', () => {
  const { output } = runPipeline();
  // 8 matched units (the 2 Hell Pit Abomination entries fail to match — see
  // parse.test.js and phase-b/b1.md test case 6). No section headers in the
  // fixture, so categories come from faction data: 3 characters (Grey Seer +
  // 2 Plague Priests), 5 core (2 Clanrats, 2 Giant Rats, Plague Monks {core}).
  assert.equal(output.characters.length, 3);
  assert.equal(output.core.length, 5);
  assert.equal(output.special.length, 0);
  assert.equal(output.rare.length, 0);
});

test('unit ids are template id plus 8-letter suffix', () => {
  const { output } = runPipeline();
  const units = [...output.characters, ...output.core, ...output.special, ...output.rare];
  assert.equal(units.length, 8);
  for (const unit of units) {
    assert.match(unit.id, /^[a-z-]+\.[a-z]{8}$/);
  }
});

test('Grey Seer has active Level 4 Wizard option and elementalism lore', () => {
  const { output } = runPipeline();
  const greySeer = output.characters.find(u => u.id.startsWith('grey-seer.'));
  assert.ok(greySeer, 'Grey Seer not found in characters');

  assert.equal(greySeer.activeLore, 'elementalism');

  const wizardOption = (greySeer.options || []).find(
    o => (o.name_en || '').toLowerCase() === 'wizard'
  );
  assert.ok(wizardOption, 'Wizard option not found on Grey Seer');
  assert.equal(wizardOption.active, true);

  const level4 = (wizardOption.options || []).find(
    o => (o.name_en || '') === 'Level 4 Wizard'
  );
  assert.ok(level4, 'Level 4 Wizard nested option not found');
  assert.equal(level4.active, true);

  const otherActiveLevels = (wizardOption.options || []).filter(
    o => o.active && o !== level4
  );
  assert.equal(otherActiveLevels.length, 0, 'only Level 4 should be active');
});
