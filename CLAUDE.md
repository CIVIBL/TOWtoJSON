# CLAUDE.md — Claude Code Session Instructions

## Project: BCP List Converter

A web tool that converts Warhammer: The Old World army lists from Best Coast Pairings (BCP) text format into importable JSON for Old World Builder and New Recruit.

## Read First

1. **Read `bcp-converter-brief.md`** — the full project brief with architecture, specs, and build plan
2. **Examine `reference-files/tree-army_owb.json`** — this is the OWB target format (a real exported Wood Elf list)
3. **Examine `reference-files/In_The_Pines_-_Logan_s_Lair_-__To_Test_.json`** — this is the NR target format (the same list exported from New Recruit)
4. Both reference files represent the **exact same 2200pt Wood Elf Host of Talsyn army** — use them as your Rosetta Stone

## Build Order

### Phase 1: OWB converter
1. Clone `https://github.com/nthiebes/old-world-builder.git` and extract the faction data JSON files from `public/games/the-old-world/`
2. Build the BCP text parser
3. Build the faction matcher (maps BCP text tokens to OWB unit IDs, equipment, items)
4. Build the OWB JSON generator
5. Build the UI (single page, Tailwind, clean/minimal, Buy Me a Coffee button)
6. Test by importing generated JSON into old-world-builder.com

### Phase 2: NR converter (immediately after)
1. Clone `https://github.com/vflam/Warhammer-The-Old-World.git` and extract `.cat` and `.gst` files
2. Parse catalogue XML into a searchable index
3. Build the NR JSON generator using the BattleScribe roster format
4. Add NR output option to the UI

## Test Data

Use this Skaven BCP list as your primary test input:

```
Skaven

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

210 - Hell Pit Abomination
```

## UI Requirements Summary

- Single page, no navigation
- Large textarea for pasting BCP text
- Radio/segmented toggle: "Old World Builder" / "New Recruit"  
- One "Convert & Download" button
- Feedback panel showing parse results, warnings, errors
- Buy Me a Coffee button (top-right, non-intrusive, opens in new tab)
- Dark theme with gold/amber accents (Warhammer-adjacent, not garish)
- Mobile-friendly
- No accounts, no login, no tracking

## Key Technical Notes

- All parsing is client-side (no backend)
- OWB faction data is clean JSON — straightforward to work with
- NR data is BattleScribe XML (.cat files) — more complex, deeply nested UUIDs
- The BCP text format is semi-structured and varies by player — parser should be forgiving
- Fuzzy matching needed for unit names (handle plural/singular, abbreviations, case differences)
- Magic items data is shared across factions in OWB (`magic-items.json`)
- Army of Infamy detection needed (e.g., "Host of Talsyn" changes unit categories)
