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
  // All 10 units match since Phase B1 ({...} annotation stripping). No section
  // headers in the fixture, so categories come from faction data: 3 characters,
  // 5 core (2 Clanrats, 2 Giant Rats, Plague Monks core), 2 rare (Hell Pits).
  assert.equal(output.characters.length, 3);
  assert.equal(output.core.length, 5);
  assert.equal(output.special.length, 0);
  assert.equal(output.rare.length, 2);
});

test('unit ids are template id plus 8-letter suffix', () => {
  const { output } = runPipeline();
  const units = [...output.characters, ...output.core, ...output.special, ...output.rare];
  assert.equal(units.length, 10);
  for (const unit of units) {
    assert.match(unit.id, /^[a-z-]+\.[a-z]{8}$/);
  }
});

// --- B3: magic item placement (phase-b/b3.md) ---

function sectionIndexOf(section, itemName) {
  const idx = magicItemsData[section].findIndex(
    i => (i.name_en || '').toLowerCase().replace(/\*/g, '').trim() === itemName
  );
  assert.notEqual(idx, -1, `${itemName} not found in magic-items.json[${section}]`);
  return idx;
}

test('character items land in unit.items slots with source-section ids (b3 case 1)', () => {
  const { output } = runPipeline();
  const greySeer = output.characters.find(u => u.id.startsWith('grey-seer.'));
  const slot = greySeer.items.find(s => (s.types || []).includes('arcane-item'));
  assert.ok(slot, 'Grey Seer magic items slot not found');
  const selected = slot.selected || [];
  const names = selected.map(s => s.name).sort();
  assert.deepEqual(names, ['ruby ring of ruin', 'storm daemon']);

  // OWB resolves selected items by their index within the source section
  // (verified against reference-files/tree-army_owb.json).
  const storm = selected.find(s => s.name === 'storm daemon');
  const ruby = selected.find(s => s.name === 'ruby ring of ruin');
  assert.equal(storm.id, sectionIndexOf('skaven', 'storm daemon'));
  assert.equal(ruby.id, sectionIndexOf('general', 'ruby ring of ruin'));

  // Same key set as the reference export: no converter bookkeeping leaks.
  for (const s of selected) {
    assert.equal('source' in s, false);
    assert.equal('sourceIndex' in s, false);
    assert.equal('fromChampion' in s, false);
  }

  // Character items never land on command entries.
  for (const cmd of greySeer.command || []) {
    assert.equal((cmd.magic?.selected || []).length, 0, 'item wrongly placed on command entry');
  }
});

test('banner items land on the Standard bearer (b3 case 2)', () => {
  const { output } = runPipeline();
  const monks = output.core.find(u => u.id.startsWith('plague-monks'));
  assert.ok(monks, 'Plague Monks not found in core');
  const standard = monks.command.find(c => /standard/i.test(c.name_en || ''));
  assert.equal(standard.active, true);
  const sel = (standard.magic?.selected || [])[0];
  assert.ok(sel, 'banner not placed on standard bearer');
  assert.equal(sel.name, 'banner of verminous scurrying');
  assert.equal(sel.id, sectionIndexOf('skaven', 'banner of verminous scurrying'));
  // Not on the champion.
  const deacon = monks.command.find(c => /deacon/i.test(c.name_en || ''));
  assert.equal((deacon.magic?.selected || []).length, 0);
});

test('champion sub-line items land on the champion (b3 case 3)', () => {
  const factionSlug = 'skaven';
  const itemIndex = buildMagicItemIndex(magicItemsData, factionSlug);
  const block = `222 - 25 Plague Monks
• 1x Plague Deacon, Warpstone Amulet`;
  const parsed = parseWithFactionData(block, skavenData, itemIndex);
  const output = generateOWBJson(
    { faction: 'Skaven', factionSlug, totalPoints: 222, units: parsed.units },
    { name: 'champion item test' }
  );
  const monks = [...output.core, ...output.special].find(u => u.id.startsWith('plague-monks'));
  const deacon = monks.command.find(c => /deacon/i.test(c.name_en || ''));
  assert.equal(deacon.active, true);
  const sel = (deacon.magic?.selected || [])[0];
  assert.ok(sel, 'champion item not placed on champion');
  assert.equal(sel.name, 'warpstone amulet');
  assert.equal(sel.id, sectionIndexOf('skaven', 'warpstone amulet'));
});

test('unplaceable items are surfaced, not silently dropped (b3 case 4)', () => {
  const factionSlug = 'skaven';
  const itemIndex = buildMagicItemIndex(magicItemsData, factionSlug);
  // A non-banner item on a ranked unit's main line has no legal slot.
  const block = '232 - 31 Clanrats, Talisman of Protection';
  const parsed = parseWithFactionData(block, skavenData, itemIndex);
  const output = generateOWBJson(
    { faction: 'Skaven', factionSlug, totalPoints: 232, units: parsed.units },
    { name: 'unplaced item test' }
  );
  assert.deepEqual(parsed.units[0].unplacedItems, ['talisman of protection']);
  assert.equal(JSON.stringify(output).includes('__unplacedItems'), false, 'bookkeeping leaked into JSON');
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
