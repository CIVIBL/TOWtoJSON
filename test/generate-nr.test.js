// New Recruit roster generator tests (Phase E2).
// The reference roster (reference-files/In_The_Pines_*.json) is the shape
// contract; the Skaven fixture is the content contract.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { parseWithFactionData } from '../src/js/parse.js';
import { buildMagicItemIndex } from '../src/js/items.js';
import { generateNRJson } from '../src/js/generate-nr.js';

const fixture = fs.readFileSync(new URL('./fixtures/skaven-bcp.txt', import.meta.url), 'utf8');
const skavenData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/skaven.json', import.meta.url), 'utf8'));
const magicItemsData = JSON.parse(fs.readFileSync(new URL('../src/data/owb/magic-items.json', import.meta.url), 'utf8'));
const nrSkaven = JSON.parse(fs.readFileSync(new URL('../src/data/nr/skaven.json', import.meta.url), 'utf8'));
const gameSystem = JSON.parse(fs.readFileSync(new URL('../src/data/nr/game-system.json', import.meta.url), 'utf8'));
const reference = JSON.parse(fs.readFileSync(new URL('../reference-files/In_The_Pines_-_Logan_s_Lair_-__To_Test_.json', import.meta.url), 'utf8'));

function run() {
  const parsed = parseWithFactionData(fixture, skavenData, buildMagicItemIndex(magicItemsData, 'skaven'));
  return generateNRJson(
    { factionSlug: 'skaven', totalPoints: parsed.totalPoints, units: parsed.units },
    nrSkaven, gameSystem, { name: 'Skaven NR test' }
  );
}

function findSel(selections, name) {
  return (selections || []).find(s => s.name === name);
}

test('roster mirrors the reference top-level shape', () => {
  const { roster } = run();
  assert.deepEqual(Object.keys(roster), ['roster']);
  const r = roster.roster;
  for (const key of Object.keys(reference.roster)) {
    assert.ok(key in r, `roster key "${key}" missing`);
  }
  assert.equal(r.gameSystemId, reference.roster.gameSystemId);
  assert.equal(r.gameSystemName, 'Warhammer The Old World');
  const force = r.forces[0];
  for (const key of ['id', 'name', 'entryId', 'catalogueId', 'catalogueRevision', 'catalogueName', 'categories', 'selections']) {
    assert.ok(key in force, `force key "${key}" missing`);
  }
  assert.equal(force.catalogueName, 'Skaven');
  assert.equal(force.entryId, gameSystem.forceEntry.id);
});

test('all 10 fixture entries produce unit selections', () => {
  const { roster, warnings } = run();
  const selections = roster.roster.forces[0].selections;
  assert.equal(selections.length, 10);
  assert.deepEqual(warnings.filter(w => /not found in the New Recruit catalogue/.test(w.reason) && !/option/.test(w.reason)), []);
});

test('every selection has catalogue-verbatim entryIds and positive-integer numbers', () => {
  const { roster } = run();
  const check = (sel) => {
    assert.match(sel.entryId, /^[0-9a-f-]+(::[0-9a-f-]+)*$/i, `bad entryId on ${sel.name}`);
    assert.ok(Number.isInteger(sel.number) && sel.number >= 1, `bad number on ${sel.name}`);
    for (const c of sel.costs || []) {
      assert.equal(c.typeId, 'points');
      assert.equal(typeof c.value, 'number');
    }
    (sel.selections || []).forEach(check);
  };
  roster.roster.forces[0].selections.forEach(check);
});

test('Clanrats: strength, command, shields, and weapon team with ratling gun', () => {
  const { roster } = run();
  const selections = roster.roster.forces[0].selections;
  const clanrats = selections.filter(s => s.name === 'Clanrats');
  assert.equal(clanrats.length, 2);

  const first = clanrats.find(s => findSel(s.selections, 'Clanrat')?.number === 30);
  assert.ok(first, '30-strong Clanrats present');
  const model = findSel(first.selections, 'Clanrat');
  // 30 clanrats at 4 pts
  assert.deepEqual(model.costs, [{ name: 'pts', typeId: 'points', value: 120 }]);
  const shield = findSel(model.selections, 'Shield');
  assert.ok(shield, 'Shield under the model row');
  assert.equal(shield.number, 30);
  assert.deepEqual(shield.costs, [{ name: 'pts', typeId: 'points', value: 30 }]);

  for (const cmd of ['Clawleader', 'Standard Bearer', 'Musician']) {
    assert.ok(findSel(first.selections, cmd), `${cmd} present`);
    assert.equal(findSel(first.selections, cmd).number, 1);
  }

  const weaponTeam = findSel(first.selections, 'Weapon Team');
  assert.ok(weaponTeam, 'Weapon Team present');
  const crew = findSel(weaponTeam.selections, 'Weapon Team Crew');
  assert.ok(crew, 'Weapon Team Crew present');
  const hasRatling = JSON.stringify(weaponTeam).includes('Ratling Gun');
  assert.equal(hasRatling, true, 'Ratling Gun selected on the weapon team');
});

test('Giant Rats: packmaster with whip, not things-catcher', () => {
  const { roster } = run();
  const giantRats = roster.roster.forces[0].selections.filter(s => s.name === 'Giant Rats');
  assert.equal(giantRats.length, 2);
  for (const unit of giantRats) {
    const rats = findSel(unit.selections, 'Giant Rat');
    assert.equal(rats.number, 14);
    const packmaster = findSel(unit.selections, 'Packmaster');
    assert.ok(packmaster, 'Packmaster present');
    assert.equal(packmaster.number, 1);
    assert.ok(findSel(packmaster.selections, 'Whip'), 'Whip selected');
    assert.equal(findSel(packmaster.selections, 'Things-catcher'), undefined, 'Things-catcher NOT selected');
  }
});

test('Grey Seer: wizard level, lore, mount, and items resolve', () => {
  const { roster, warnings } = run();
  const greySeer = findSel(roster.roster.forces[0].selections, 'Grey Seer');
  assert.ok(greySeer, 'Grey Seer present');
  const flat = JSON.stringify(greySeer);
  for (const needle of ['Wizard Level 4', 'Screaming Bell', 'Storm Daemon', 'Ruby Ring of Ruin', 'Elementalism']) {
    assert.equal(flat.includes(needle), true, `${needle} missing from Grey Seer selections`);
  }
  const seerWarnings = warnings.filter(w => w.unit === 'Grey Seer');
  assert.deepEqual(seerWarnings, [], 'no unresolved Grey Seer options');
});

test('roster total cost is self-consistent and near the parsed total', () => {
  const { roster } = run();
  const r = roster.roster;
  const sum = (sels) => sels.reduce((acc, s) =>
    acc + (s.costs || []).reduce((a, c) => a + c.value, 0) + sum(s.selections || []), 0);
  assert.equal(r.costs[0].value, sum(r.forces[0].selections));
  assert.equal(r.costLimits[0].value, 2197);
  // NR prices come from the community catalogue and may legitimately differ
  // from OWB by a few points, but a large gap means structural breakage.
  assert.ok(Math.abs(r.costs[0].value - 2197) <= 60, `total ${r.costs[0].value} too far from 2197`);
});

test('unmatched units become warnings, not silent drops', () => {
  const parsed = parseWithFactionData('232 - 31 Zzzzz', skavenData, buildMagicItemIndex(magicItemsData, 'skaven'));
  const { roster, warnings } = generateNRJson(
    { factionSlug: 'skaven', totalPoints: 232, units: parsed.units },
    nrSkaven, gameSystem, {}
  );
  assert.equal(roster.roster.forces[0].selections.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].reason, /not matched/);
});
