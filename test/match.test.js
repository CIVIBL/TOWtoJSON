import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractOptions, tokenizeUnitBlock, classifyToken, matchUnitName } from '../src/js/match.js';
import { buildUnitNameIndex } from '../src/js/parse.js';
import { buildMagicItemIndex } from '../src/js/items.js';

const skaven = JSON.parse(readFileSync(new URL('../src/data/owb/skaven.json', import.meta.url), 'utf-8'));
const woodElves = JSON.parse(readFileSync(new URL('../src/data/owb/wood-elf-realms.json', import.meta.url), 'utf-8'));
const magicItems = JSON.parse(readFileSync(new URL('../src/data/owb/magic-items.json', import.meta.url), 'utf-8'));

const skavenItems = buildMagicItemIndex(magicItems, 'skaven');
const weItems = buildMagicItemIndex(magicItems, 'wood-elf-realms');

const greySeer = skaven.characters.find(u => u.name_en === 'Grey Seer');
const clanrats = skaven.core.find(u => u.name_en === 'Clanrats');
const gladeLord = woodElves.characters.find(u => u.name_en === 'Glade Lord');

test('tokenizeUnitBlock splits BCP main line and bullet sub-lines', () => {
  const block = `232 - 31 Clanrats
• 30x Clanrat, Shield, Clawleader, Standard Bearer, Musician
• 1x Weapon Team
• 1x Weapon Team Crew, Ratling Gun`;
  const { mainTokens, subLines } = tokenizeUnitBlock(block);
  assert.deepEqual(mainTokens, []);
  assert.equal(subLines.length, 3);
  assert.deepEqual(subLines[0], {
    count: 30, label: 'Clanrat',
    tokens: ['Shield', 'Clawleader', 'Standard Bearer', 'Musician']
  });
  assert.deepEqual(subLines[1], { count: 1, label: 'Weapon Team', tokens: [] });
});

test('Grey Seer main line classifies every token (b1 case 1)', () => {
  const block = '465 - Grey Seer, General, Screaming Bell, Wizard Level 4, Elementalism, Storm Daemon, Ruby Ring of Ruin';
  const r = extractOptions(block, greySeer, skavenItems);
  assert.equal(r.command.length, 1, 'General command active');
  assert.equal(r.command[0].index, 0);
  // Mount "Screaming Bell {renegade}" must match token "Screaming Bell"
  assert.equal(r.mounts.length, 1, 'Screaming Bell mount matched despite {renegade} annotation');
  assert.equal((r.mounts[0].data.name_en || '').startsWith('Screaming Bell'), true);
  assert.equal(r.wizardLevel, 4);
  assert.ok(r.options.some(o => o.type === 'nested' && /level 4 wizard/i.test(o.name)), 'Level 4 Wizard nested option');
  assert.equal(r.lore, 'elementalism');
  const itemNames = r.items.map(i => i.name).sort();
  assert.deepEqual(itemNames, ['ruby ring of ruin', 'storm daemon']);
  assert.deepEqual(r.unknownTokens, []);
});

test('Clanrats block: unit sub-line owns its tokens, weapon team lines do not leak (b1 case 2)', () => {
  const block = `232 - 31 Clanrats
• 30x Clanrat, Shield, Clawleader, Standard Bearer, Musician
• 1x Weapon Team
• 1x Weapon Team Crew, Ratling Gun`;
  const r = extractOptions(block, clanrats, skavenItems);
  const commandIdx = r.command.map(c => c.index).sort();
  assert.deepEqual(commandIdx, [0, 1, 2], 'Clawleader (champion), Standard bearer, Musician all active');
  assert.ok(r.options.some(o => o.name === 'shield'), 'Shield option active');
  // Nothing from the Weapon Team sub-lines may classify against Clanrats or pollute unknowns
  assert.equal(r.unknownTokens.some(t => /ratling/i.test(t)), false, 'Ratling Gun not treated as a Clanrat token');
});

test('magic item token does not false-activate a same-word option (b1 case 3)', () => {
  const block = '135 - Glade Lord, Charmed Shield';
  const r = extractOptions(block, gladeLord, weItems);
  assert.ok(r.items.some(i => i.name === 'charmed shield'), 'Charmed Shield classified as item');
  assert.equal(r.options.some(o => o.name === 'shield'), false, 'Shield option NOT activated by item token');
  assert.deepEqual(r.unknownTokens, []);
});

test('unknown tokens are reported (b1 case 4)', () => {
  const block = '465 - Grey Seer, Made Up Thing';
  const r = extractOptions(block, greySeer, skavenItems);
  assert.deepEqual(r.unknownTokens, ['Made Up Thing']);
});

test('plural token matches singular option (b1 case 5)', () => {
  const block = '232 - 31 Clanrats, Shields';
  const r = extractOptions(block, clanrats, skavenItems);
  assert.ok(r.options.some(o => o.name === 'shield'), 'Shields matches Shield');
  assert.deepEqual(r.unknownTokens, []);
});

test('unit names with {annotation} suffixes are matchable (b1 case 6)', () => {
  const index = buildUnitNameIndex(skaven);
  const match = matchUnitName('Hell Pit Abomination', index);
  assert.ok(match, 'Hell Pit Abomination resolves despite {renegade} suffix in data');
  assert.equal(match.unit.name_en, 'Hell Pit Abomination {renegade}');
});

test('token matches a comma-part of a compound equipment name', () => {
  const r = extractOptions('232 - 31 Clanrats, Thrusting spear', clanrats, skavenItems);
  assert.ok(
    r.equipment.some(e => /thrusting spear/i.test(e.data.name_en)),
    'Thrusting spear matches equipment "Hand weapon, Thrusting spear"'
  );
  assert.deepEqual(r.unknownTokens, []);
});

test('classifyToken priority: command beats item prefix overlap', () => {
  const c = classifyToken('General', greySeer, skavenItems);
  assert.equal(c.type, 'command');
});

// --- model-group refinement (post-Phase D) ---

test('rank-and-file sub-line count drives unit strength', () => {
  // "31 Clanrats" includes the Weapon Team crew; the 30x line is the real
  // rank-and-file strength.
  const block = `232 - 31 Clanrats
• 30x Clanrat, Shield, Clawleader, Standard Bearer, Musician
• 1x Weapon Team
• 1x Weapon Team Crew, Ratling Gun`;
  const r = extractOptions(block, clanrats, skavenItems);
  assert.equal(r.rankAndFileCount, 30);
});

test('full sub-line matches a compound stackable option with its count', () => {
  const giantRats = skaven.core.find(u => u.id === 'giant-rats');
  const block = `47 - 14 Giant Rats
• 14x Giant Rat
• 1x Packmaster, Whip`;
  const r = extractOptions(block, giantRats, skavenItems);
  assert.equal(r.rankAndFileCount, 14);
  const packmaster = r.options.find(o => /packmaster, whip/i.test(o.name));
  assert.ok(packmaster, 'Packmaster, Whip option matched as a whole line');
  assert.equal(packmaster.stackableCount, 1);
  // The Whip token must not leak into unknowns or double-match.
  assert.deepEqual(r.unknownTokens, []);
});

test('full sub-line match picks the right compound variant', () => {
  const giantRats = skaven.core.find(u => u.id === 'giant-rats');
  const block = `52 - 14 Giant Rats
• 14x Giant Rat
• 1x Packmaster, Things-catcher`;
  const r = extractOptions(block, giantRats, skavenItems);
  const packmaster = r.options.find(o => /things.catcher/i.test(o.name));
  assert.ok(packmaster, 'Things-catcher variant matched, not Whip');
  assert.equal(r.options.some(o => /whip/i.test(o.name)), false);
});

test('champion sub-line items are flagged fromChampion', () => {
  const block = `222 - 25 Plague Monks
• 1x Plague Deacon, Warpstone Amulet`;
  const monks = skaven.core.find(u => u.id === 'plague-monks-core') ||
    [...skaven.core, ...skaven.special].find(u => u.name_en === 'Plague Monks');
  const r = extractOptions(block, monks, skavenItems);
  assert.ok(r.command.some(c => /plague deacon/i.test(c.name)), 'Plague Deacon command active from sub-line label');
  const amulet = r.items.find(i => i.name === 'warpstone amulet');
  assert.ok(amulet, 'Warpstone Amulet found');
  assert.equal(amulet.fromChampion, true);
});
