/**
 * Test Faction Matcher
 */

import { parseBCPText, normalizeFactionName } from '../src/parser/bcpParser.js';
import { FactionMatcher } from '../src/matcher/factionMatcher.js';

const skavenTestList = `Skaven

8 drops

Secret Objectives

Beast hunter
Hold the line
Magical Dominion
Cut off their retreat
Capture colums
Bounty hunter

465 - Grey Seer, General, Screaming Bell, Wizard Level 4, Elementalism, Storm Daemon, Ruby Ring of Ruin

266 - Plague Priest, Plague censer, Plague Furnace, Talisman Of Protection

271 - Plague Priest, Plague censer, Plague Furnace, Warpstone Amulet

232 - 31 Clanrats
• 30x Clanrat, Shield, Clawleader, Standard Bearer, Musician
• 1x Weapon Team
• 1x Weapon Team Crew, Ratling Gun

227 - 30 Clanrats
• 29x Clanrat, Shield, Clawleader, Standard Bearer, Musician
• 1x Weapon Team
• 1x Weapon Team Crew, Ratling Gun

47 - 14 Giant Rats
• 14x Giant Rat
• 1x Packmaster, Whip

47 - 14 Giant Rats
• 14x Giant Rat
• 1x Packmaster, Whip

222 - 25 Plague Monks, Plague Deacon, Standard Bearer, Banner Of Verminous Scurrying

210 - Hell Pit Abomination

210 - Hell Pit Abomination`;

console.log('=== Faction Matcher Test ===\n');

// Parse the BCP text
const parsed = parseBCPText(skavenTestList);
const factionSlug = normalizeFactionName(parsed.faction);

console.log('Parsed faction:', parsed.faction);
console.log('Faction slug:', factionSlug);
console.log('');

// Create matcher and match the list
const matcher = new FactionMatcher(factionSlug);
const matched = matcher.matchList(parsed);

console.log('=== Matched Units ===\n');

for (const unit of matched.units) {
  console.log(`[${unit.success ? 'OK' : 'FAIL'}] ${unit.rawName}`);

  if (unit.success) {
    console.log(`    Template: ${unit.unitTemplate.name_en} (${unit.unitTemplate.id})`);
    console.log(`    Category: ${unit.category}`);
    console.log(`    Points: ${unit.rawPoints}`);
    console.log(`    Models: ${unit.modelCount ?? 1}`);

    if (unit.classifiedTokens.length > 0) {
      console.log('    Tokens:');
      for (const tok of unit.classifiedTokens) {
        const matchName = tok.match?.name_en || tok.match?.lore || tok.match?.option?.name_en || '?';
        console.log(`      - [${tok.type}] "${tok.raw}" => ${matchName}`);
      }
    }

    if (unit.unknownTokens.length > 0) {
      console.log(`    UNKNOWN: ${unit.unknownTokens.join(', ')}`);
    }
  } else {
    console.log(`    Error: ${unit.error}`);
  }
  console.log('');
}

console.log('=== Warnings ===\n');
if (matched.warnings.length > 0) {
  matched.warnings.forEach(w => console.log('  - ' + w));
} else {
  console.log('  No warnings');
}

// Test Wood Elf list
const woodElfTestList = `Wood Elf Realms

6 drops

Secret Objectives
Defend the realm

585 - Glade Lord, General, Great weapon, Forest Dragon, Armour of Meteoric Iron, Talisman of Protection, Asrai longbow, Aspect of the Cat, An Annoyance of Netlings

305 - Treeman Ancient, Level 3 Wizard, Elementalism, Ambushers

110 - Branchwraith, Level 1 Wizard, Illusion, Great weapon

266 - 19 Dryads, Nymph

216 - 4 Tree Kin

225 - Treeman, Ambushers`;

console.log('\n\n=== Wood Elf Matcher Test ===\n');

const parsedWE = parseBCPText(woodElfTestList);
const weSlug = normalizeFactionName(parsedWE.faction);
const weMatcher = new FactionMatcher(weSlug);
const matchedWE = weMatcher.matchList(parsedWE);

console.log('Faction:', matchedWE.faction, '(' + matchedWE.factionSlug + ')');
console.log('');

for (const unit of matchedWE.units) {
  console.log(`[${unit.success ? 'OK' : 'FAIL'}] ${unit.rawName}`);
  if (unit.success) {
    console.log(`    Template: ${unit.unitTemplate.name_en} (${unit.unitTemplate.id})`);
    console.log(`    Category: ${unit.category}`);
    if (unit.classifiedTokens.length > 0) {
      console.log('    Tokens:');
      for (const tok of unit.classifiedTokens) {
        const matchName = tok.match?.name_en || tok.match?.lore || tok.match?.option?.name_en || '?';
        console.log(`      - [${tok.type}] "${tok.raw}" => ${matchName}`);
      }
    }
    if (unit.unknownTokens.length > 0) {
      console.log(`    UNKNOWN: ${unit.unknownTokens.join(', ')}`);
    }
  }
  console.log('');
}

if (matchedWE.warnings.length > 0) {
  console.log('Warnings:');
  matchedWE.warnings.forEach(w => console.log('  - ' + w));
}
