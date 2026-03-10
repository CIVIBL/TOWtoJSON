/**
 * Test BCP Parser
 */

import { parseBCPText, normalizeFactionName } from '../src/parser/bcpParser.js';

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

console.log('=== BCP Parser Test ===\n');

const result = parseBCPText(skavenTestList);

console.log('Faction:', result.faction);
console.log('Faction Slug:', normalizeFactionName(result.faction));
console.log('Total Points:', result.totalPoints);
console.log('Drops:', result.drops);
console.log('Secret Objectives:', result.secretObjectives.length);
console.log('Units:', result.units.length);

console.log('\n=== Parsed Units ===\n');

result.units.forEach((unit, i) => {
  console.log(`[${i + 1}] ${unit.rawName}`);
  console.log(`    Points: ${unit.rawPoints}`);
  console.log(`    Model Count: ${unit.modelCount ?? 'single model'}`);
  console.log(`    Tokens: [${unit.tokens.join(', ')}]`);
  if (unit.subItems.length > 0) {
    console.log('    Sub-items:');
    unit.subItems.forEach(sub => {
      console.log(`      - ${sub.count}x ${sub.name} [${sub.tokens.join(', ')}]`);
    });
  }
  console.log('');
});

console.log('=== Full JSON Output ===\n');
console.log(JSON.stringify(result, null, 2));

// Test Wood Elf list (based on the reference Tree Army)
const woodElfTestList = `Wood Elf Realms

6 drops

Secret Objectives
Defend the realm
Forest ambush

585 - Glade Lord, General, Great weapon, Forest Dragon, Armour of Meteoric Iron, Talisman of Protection, Asrai longbow, Aspect of the Cat, An Annoyance of Netlings

305 - Treeman Ancient, Level 3 Wizard, Elementalism, Ambushers

110 - Branchwraith, Level 1 Wizard, Illusion, Great weapon

110 - Branchwraith, Level 1 Wizard, Illusion, Great weapon

82 - 5 Eternal Guard, Shields, Eternal Warden, Sword of Sorrow

266 - 19 Dryads, Nymph

266 - 19 Dryads, Nymph

216 - 4 Tree Kin

225 - Treeman, Ambushers

225 - Treeman`;

console.log('\n\n=== Wood Elf Parser Test ===\n');

const woodElfResult = parseBCPText(woodElfTestList);

console.log('Faction:', woodElfResult.faction);
console.log('Faction Slug:', normalizeFactionName(woodElfResult.faction));
console.log('Total Points:', woodElfResult.totalPoints);
console.log('Drops:', woodElfResult.drops);
console.log('Units:', woodElfResult.units.length);

console.log('\n=== Parsed Units ===\n');

woodElfResult.units.forEach((unit, i) => {
  console.log(`[${i + 1}] ${unit.rawName}`);
  console.log(`    Points: ${unit.rawPoints}`);
  console.log(`    Model Count: ${unit.modelCount ?? 'single model'}`);
  console.log(`    Tokens: [${unit.tokens.join(', ')}]`);
  if (unit.subItems.length > 0) {
    console.log('    Sub-items:');
    unit.subItems.forEach(sub => {
      console.log(`      - ${sub.count}x ${sub.name} [${sub.tokens.join(', ')}]`);
    });
  }
  console.log('');
});
