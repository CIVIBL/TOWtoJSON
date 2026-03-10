/**
 * Test OWB Generator
 */

import { parseBCPText, normalizeFactionName } from '../src/parser/bcpParser.js';
import { FactionMatcher } from '../src/matcher/factionMatcher.js';
import { generateOWBJson, generateOWBJsonString } from '../src/generator/owbGenerator.js';
import fs from 'fs';
import path from 'path';

const skavenTestList = `Skaven

8 drops

Secret Objectives

Beast hunter
Hold the line

465 - Grey Seer, General, Screaming Bell, Wizard Level 4, Elementalism, Storm Daemon, Ruby Ring of Ruin

266 - Plague Priest, Plague censer, Plague Furnace, Talisman Of Protection

232 - 31 Clanrats
• 30x Clanrat, Shield, Clawleader, Standard Bearer, Musician
• 1x Weapon Team
• 1x Weapon Team Crew, Ratling Gun

222 - 25 Plague Monks, Plague Deacon, Standard Bearer, Banner Of Verminous Scurrying

210 - Hell Pit Abomination`;

console.log('=== OWB Generator Test ===\n');

// Parse and match
const parsed = parseBCPText(skavenTestList);
const factionSlug = normalizeFactionName(parsed.faction);
const matcher = new FactionMatcher(factionSlug);
const matched = matcher.matchList(parsed);

console.log('Parsed:', parsed.faction, '-', parsed.totalPoints, 'pts');
console.log('Matched units:', matched.units.filter(u => u.success).length);
console.log('');

// Generate OWB JSON
const owbJson = generateOWBJson(matched, {
  name: 'Test Skaven Army',
  description: 'Generated from BCP format'
});

console.log('=== Generated Structure ===\n');
console.log('List ID:', owbJson.id);
console.log('Army:', owbJson.army);
console.log('Points:', owbJson.points);
console.log('Characters:', owbJson.characters.length);
console.log('Core:', owbJson.core.length);
console.log('Special:', owbJson.special.length);
console.log('Rare:', owbJson.rare.length);

console.log('\n=== Unit Details ===\n');

// Check Grey Seer
const greySeer = owbJson.characters.find(u => u.name_en === 'Grey Seer');
if (greySeer) {
  console.log('Grey Seer:');
  console.log('  ID:', greySeer.id);
  console.log('  Strength:', greySeer.strength);

  const generalActive = greySeer.command?.find(c => c.name_en === 'General')?.active;
  console.log('  General:', generalActive ? 'YES' : 'NO');

  const mountActive = greySeer.mounts?.find(m => m.active);
  console.log('  Mount:', mountActive?.name_en || 'None');

  const wizardOpt = greySeer.options?.find(o => o.name_en === 'Wizard');
  const wizardLevel = wizardOpt?.options?.find(o => o.active);
  console.log('  Wizard Level:', wizardLevel?.name_en || 'None');

  console.log('  Active Lore:', greySeer.activeLore || 'None');

  const magicItemsSlot = greySeer.items?.find(i => i.name_en === 'Magic Items');
  console.log('  Magic Items:', magicItemsSlot?.selected?.map(i => i.name_en).join(', ') || 'None');
}

console.log('');

// Check Clanrats
const clanrats = owbJson.core.find(u => u.name_en === 'Clanrats');
if (clanrats) {
  console.log('Clanrats:');
  console.log('  ID:', clanrats.id);
  console.log('  Strength:', clanrats.strength);

  const championActive = clanrats.command?.find(c => c.name_en?.includes('Clawleader'))?.active;
  console.log('  Champion:', championActive ? 'YES' : 'NO');

  const stdActive = clanrats.command?.find(c => c.name_en?.includes('Standard'))?.active;
  console.log('  Standard:', stdActive ? 'YES' : 'NO');

  const musicianActive = clanrats.command?.find(c => c.name_en === 'Musician')?.active;
  console.log('  Musician:', musicianActive ? 'YES' : 'NO');

  const shieldActive = clanrats.options?.find(o => o.name_en === 'Shield')?.active;
  console.log('  Shield:', shieldActive ? 'YES' : 'NO');
}

console.log('');

// Check Plague Monks with banner
const plagueMonks = owbJson.core.find(u => u.name_en === 'Plague Monks');
if (plagueMonks) {
  console.log('Plague Monks:');
  console.log('  ID:', plagueMonks.id);
  console.log('  Strength:', plagueMonks.strength);

  // Check for magic banner
  let foundBanner = false;
  for (const itemSlot of plagueMonks.items || []) {
    if (itemSlot.selected?.length > 0) {
      console.log('  Magic Items:', itemSlot.selected.map(i => i.name_en).join(', '));
      foundBanner = true;
    }
  }
  if (!foundBanner) {
    console.log('  Magic Items: None');
  }
}

// Write output file for manual inspection
const outputPath = path.join(process.cwd(), 'test', 'output-skaven.json');
fs.writeFileSync(outputPath, generateOWBJsonString(matched, {
  name: 'Test Skaven Army',
  description: 'Generated from BCP format'
}));

console.log('\n=== Output ===\n');
console.log('Generated JSON written to:', outputPath);
console.log('');
console.log('To validate: Import this file into old-world-builder.com');
