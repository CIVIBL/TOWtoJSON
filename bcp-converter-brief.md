# BCP List Converter — Claude Code Project Brief

## Project Overview

Build a lightweight, single-page web app that converts Warhammer: The Old World army lists from **Best Coast Pairings (BCP) text format** into importable JSON for **Old World Builder (OWB)** and **New Recruit (NR)**.

**Target users:** Tournament Warhammer: The Old World players who submit lists on BCP and want to import them into army builder apps.

**Core workflow:** Paste BCP text → Select output format (OWB or NR) → Download JSON file.

---

## Phase 1: OWB Output (Build First)

### Phase 2: NR / BattleScribe Output (Immediately After)

---

## Tech Stack

- **Frontend:** Single HTML file with vanilla JS (or lightweight React if needed), Tailwind CSS via CDN
- **No backend required** — all parsing happens client-side
- **Hosted:** Static site (GitHub Pages, Netlify, or Vercel)
- **Monetization:** Buy Me a Coffee button (non-intrusive)

---

## UI Requirements — CRITICAL

The UI must be **extremely clean and laser-focused on usability**. No clutter. No feature creep. Think "single-purpose tool that just works."

### Layout

```
┌─────────────────────────────────────────────────┐
│  [Logo/Title]              [Buy Me a Coffee ☕]  │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │                                             │ │
│  │   Paste your BCP list here...               │ │
│  │                                             │ │
│  │                                             │ │
│  │                                             │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Output format:  [OWB ●]  [New Recruit ○]        │
│                                                   │
│         [ Convert & Download ]                    │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  ✓ Parsed: Skaven — 2197 pts               │ │
│  │    8 units detected                         │ │
│  │    ⚠ 1 warning: "Storm Daemon" not found   │ │
│  │      in magic items — added as raw text     │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  [footer: version, github link]                   │
└─────────────────────────────────────────────────┘
```

### Design Principles

1. **One screen, no navigation.** Everything on a single page.
2. **Large, obvious textarea** as the primary interaction.
3. **Format toggle** — simple radio or segmented control: "Old World Builder" / "New Recruit"
4. **Single action button** — "Convert & Download" (disabled until text is pasted)
5. **Feedback panel** below the button showing parse results, warnings, and errors.
6. **Buy Me a Coffee** — small, tasteful button in the top-right corner. Use the official BMC widget/button (https://www.buymeacoffee.com). It should NOT be a popup or modal — just a simple link-style button that opens in a new tab. Consider a subtle placement that's visible but doesn't compete with the tool's primary function.
7. **Dark mode support** — respect `prefers-color-scheme` or offer a toggle.
8. **Mobile-friendly** — textarea and button should work on phone screens.
9. **No accounts, no login, no cookies, no tracking.**

### Color/Style Direction

- Clean, modern, minimal
- Consider a subtle Warhammer-adjacent aesthetic (dark backgrounds, gold/amber accents) without being garish
- Typography: system font stack or Inter/Source Sans
- The tool should feel premium despite being free

---

## Data Sources

### Old World Builder Faction Data

**Source:** GitHub repo `nthiebes/old-world-builder`
**Path:** `public/games/the-old-world/[faction-slug].json`
**Also:** `public/games/the-old-world/magic-items.json` (shared magic items)

These JSON files contain every unit ID, equipment option, mount, magic item, points cost, and army composition rule for all factions. They are the lookup tables the parser uses to match BCP text names to OWB internal IDs.

**Faction slugs (known from the repo):**
- `wood-elf-realms`
- `skaven`
- `the-empire-of-man`
- `kingdom-of-bretonnia`
- `dwarfen-mountain-holds`
- `high-elf-realms`
- `tomb-kings-of-khemri`
- `vampire-counts`
- `warriors-of-chaos`
- `orc-and-goblin-tribes`
- `beastmen-brayherds`
- `daemons-of-chaos`
- `dark-elves`
- `lizardmen`
- `ogre-kingdoms`
- `chaos-dwarfs`
- `grand-cathay`

**How to obtain:** Clone the repo or fetch the JSON files directly from old-world-builder.com (they're served as static assets since it's a React PWA on GitHub Pages).

**IMPORTANT:** These files update when the OWB developer pushes changes (e.g., after GW FAQ/errata). The converter should either bundle the data files (and be updated periodically) or fetch them dynamically from the OWB site.

### New Recruit / BattleScribe Catalogue Data

**Source:** GitHub repo `vflam/Warhammer-The-Old-World`
**Files:** `.cat` (catalogue) XML files per faction, `.gst` (game system) file
**Examples:**
- `Wood Elf Realms.cat`
- `Wood Elf Realms - Host of Talsyn.cat`
- `Skaven.cat`
- `Warhammer_Old_World.gst`

These XML files contain the entry IDs, profile definitions, selection structures, and constraints that the NR JSON export references. The UUIDs in the NR JSON (like `5b66-a34b-558b-d903`) come from these files.

**Also relevant:**
- `giloushaker/nr-editor` — the open-source New Recruit data editor
- `giloushaker/nr-templates` — export template documentation

---

## BCP Text Format Specification

Based on real tournament lists, BCP text follows this structure:

```
[Faction Name]

[Number] drops

Secret Objectives
[objective 1]
[objective 2]
...

[points] - [Unit Name], [Option1], [Option2], [Magic Item1], [Magic Item2]
• [count]x [Model Name], [equipment], [command options]
• [count]x [Sub-unit Name]
• [count]x [Sub-unit Crew], [weapon]

[points] - [count] [Unit Name]
• [count]x [Model Name], [equipment], [command], [musician], [standard bearer]
• [count]x [Sub-unit]
• [count]x [Sub-unit Crew], [weapon]

[points] - [count] [Unit Name], [Champion], [Standard Bearer], [Magic Banner]

[points] - [Unit Name]
```

### Parsing Rules

1. **First non-empty line** = Faction name
2. **Line matching `N drops`** = deployment drops (metadata, not needed for JSON)
3. **"Secret Objectives" block** = skip until next points line
4. **Lines matching `^(\d+) - (.+)$`** = unit entry (points dash name+options)
5. **Lines starting with `•`** = sub-items belonging to the previous unit entry
6. **Character entries** have no model count before the name (e.g., `465 - Grey Seer, General, ...`)
7. **Unit entries** have a count before the name (e.g., `232 - 31 Clanrats`)
8. **Comma-separated tokens** after the unit name include: command options (General, Champion names like "Clawleader"), equipment (Shield, Plague censer), mounts (Screaming Bell, Plague Furnace, Forest Dragon), magic items (Talisman of Protection, Ruby Ring of Ruin), wizard level and lore (Wizard Level 4, Elementalism), special upgrades (Ambushers), and magic banners (Banner Of Verminous Scurrying)
9. **Sub-item lines (•)** describe model composition within the unit — model counts, weapon teams, crew, etc.

### Example: Skaven BCP List

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

---

## OWB JSON Output Specification

Based on the actual exported OWB JSON (see reference file: `tree-army_owb.json`).

### Top-Level Structure

```json
{
  "name": "List Name",
  "description": "",
  "game": "the-old-world",
  "points": 2200,
  "army": "wood-elf-realms",
  "characters": [ ... ],
  "core": [ ... ],
  "special": [ ... ],
  "rare": [ ... ],
  "mercenaries": [],
  "allies": [],
  "id": "[random-alphanumeric]",
  "armyComposition": "host-of-talsyn",
  "compositionRule": "grand-melee-combined-arms"
}
```

**Key fields:**
- `army`: faction slug (e.g., `"wood-elf-realms"`, `"skaven"`)
- `armyComposition`: Army of Infamy slug if applicable (e.g., `"host-of-talsyn"`, `"orions-wild-hunt"`) or the base faction slug
- `characters`, `core`, `special`, `rare`: arrays of unit objects sorted by army composition category
- `id`: random alphanumeric string (e.g., `"eewlqvue"`)

### Unit Object Structure

```json
{
  "name_en": "Treeman Ancient",
  "id": "treeman-ancient.gpdkrpb",
  "points": 265,
  "strength": 1,
  "command": [
    {
      "name_en": "General",
      "points": 0,
      "id": 0,
      "active": true
    }
  ],
  "equipment": [
    {
      "name_en": "Oaken fists, Strangleroots",
      "points": 0,
      "active": true,
      "id": 0
    }
  ],
  "armor": [
    {
      "name_en": "Full plate armour (Arboreal armour)",
      "points": 0,
      "active": true,
      "activeDefault": true,
      "id": 0
    }
  ],
  "options": [
    {
      "name_en": "Wizard",
      "points": 0,
      "active": true,
      "alwaysActive": true,
      "options": [
        {
          "name_en": "Level 3 Wizard",
          "points": 30,
          "exclusive": true,
          "active": true
        }
      ],
      "id": 0
    },
    {
      "name_en": "Ambushers",
      "points": 10,
      "id": 1,
      "active": true
    }
  ],
  "mounts": [
    {
      "name_en": "On foot",
      "points": 0,
      "active": false,
      "id": 0
    },
    {
      "name_en": "Forest Dragon",
      "points": 275,
      "id": 4,
      "active": true
    }
  ],
  "items": [
    {
      "name_en": "Magic Items",
      "types": ["weapon", "armor", "talisman", "enchanted-item"],
      "selected": [
        {
          "name_en": "Armour of Meteoric Iron",
          "points": 20,
          "type": "armor",
          "onePerArmy": true,
          "name": "armour of meteoric iron",
          "id": 24
        }
      ],
      "maxPoints": 100
    },
    {
      "name_en": "Forest Spites",
      "types": ["forest-spite"],
      "selected": [
        {
          "name_en": "An Annoyance of Netlings",
          "points": 15,
          "type": "forest-spite",
          "onePerArmy": true,
          "name": "an annoyance of netlings",
          "id": 5
        }
      ],
      "maxPoints": 50
    }
  ],
  "mounts": []
}
```

### Critical OWB Mapping Rules

1. **Unit ID format:** `[unit-slug].[random-suffix]` — the slug comes from the faction data file, the suffix is generated (e.g., `"treeman-ancient.gpdkrpb"`)
2. **`active: true`** flags which equipment/option/mount is selected. The full list of ALL options must be present (from faction data), with `active` toggled appropriately.
3. **`strength`** = number of models in the unit (1 for characters, N for ranked units)
4. **Magic items** go in `items[].selected[]` array. The `name` field (lowercase) and `id` (numeric) must match the magic items data file.
5. **Command options** (General, Champion, Standard Bearer, Musician) go in `command[]`
6. **Mounts** go in `mounts[]` — all mount options listed, correct one set to `active: true`
7. **Per-model options** (like equipment upgrades) use `perModel: true` and the points are per-model
8. **Army composition** determines which category a unit belongs to (characters/core/special/rare) — this can differ between base army and Armies of Infamy
9. **Multilingual fields** (`name_en`, `name_de`, `name_fr`, etc.) — the converter only needs to set `name_en`; the full translations come from the faction data

### Converter Strategy for OWB

1. **Load faction data** from OWB's JSON (bundled or fetched)
2. **Parse BCP text** into structured unit entries
3. **For each unit:** fuzzy-match the unit name against faction data `name_en` fields
4. **For each option/equipment token:** match against the unit's available options, equipment, mounts, and magic items
5. **Clone the full unit template** from faction data (preserving all fields and multilingual names)
6. **Set `active: true`** on matched options, equipment, mounts
7. **Add matched magic items** to the `items[].selected[]` array
8. **Set `strength`** from the model count
9. **Place unit** in correct category array (characters/core/special/rare)
10. **Generate random ID suffix** for each unit

---

## NR / BattleScribe JSON Output Specification (Phase 2)

The New Recruit format is a BattleScribe roster JSON. Based on the reference file (`In_The_Pines_-_Logan_s_Lair_-__To_Test_.json`).

### Top-Level Structure

```json
{
  "roster": {
    "costs": [{"name": "pts", "typeId": "points", "value": 2200}],
    "costLimits": [{"name": "pts", "typeId": "points", "value": 2200}],
    "forces": [{
      "rules": [ ... ],
      "selections": [ ... ],
      "categories": [ ... ],
      "id": "[random]",
      "name": "Main Force",
      "entryId": "8214-cf48-b1cd-5f5e",
      "catalogueId": "[faction-catalogue-id]",
      "catalogueRevision": 1,
      "catalogueName": "Wood Elf Realms - Host of Talsyn"
    }],
    "id": "[random]",
    "name": "List Name",
    "battleScribeVersion": 2.03,
    "generatedBy": "https://newrecruit.eu",
    "gameSystemId": "sys-31d1-bf57-53ea-ad55",
    "gameSystemName": "Warhammer The Old World",
    "gameSystemRevision": 160,
    "xmlns": "http://www.battlescribe.net/schema/rosterSchema"
  }
}
```

### Key Differences from OWB

- **UUID-based IDs** everywhere (e.g., `"5b66-a34b-558b-d903"`) — these come from the `.cat` files
- **Deeply nested selections** — each unit is a selection containing sub-selections for models, equipment, armour, etc.
- **Full profiles embedded** — stat lines, weapon profiles, spell text, special rule descriptions all inline
- **Category system** — units tagged with category entry IDs for Characters, Core, Special, Rare, plus faction tags
- **Entry IDs** use `::` concatenation for nested references (e.g., `"6c17-5977-04d7-1dff::9009-5501-34cd-168f"`)

### Converter Strategy for NR

1. **Parse the `.cat` XML files** from `vflam/Warhammer-The-Old-World` repo
2. **Build a lookup index** mapping unit names → entry IDs, profiles, selections
3. **Parse BCP text** (reuse Phase 1 parser)
4. **For each unit:** find the matching catalogue entry
5. **Assemble the selection tree** with correct entry IDs, profiles, and nested selections
6. **Embed required profiles** (stat lines, weapon profiles, special rules) from the catalogue
7. **Wrap in the roster structure** with correct force, categories, and costs

This is significantly more complex than OWB due to the nested ID references and embedded profiles. The `.cat` files are the essential data source — they contain everything needed.

---

## Parsing Architecture

### Step 1: BCP Text Parser (shared between OWB and NR)

```
Input: Raw BCP text string
Output: Structured intermediate format:

{
  faction: "Skaven",
  totalPoints: 2197,
  drops: 8,
  secretObjectives: [...],
  units: [
    {
      rawPoints: 465,
      rawName: "Grey Seer",
      modelCount: null,  // null = character (single model)
      tokens: ["General", "Screaming Bell", "Wizard Level 4", "Elementalism", "Storm Daemon", "Ruby Ring of Ruin"],
      subItems: []
    },
    {
      rawPoints: 232,
      rawName: "Clanrats",
      modelCount: 31,
      tokens: [],
      subItems: [
        { count: 30, name: "Clanrat", tokens: ["Shield", "Clawleader", "Standard Bearer", "Musician"] },
        { count: 1, name: "Weapon Team", tokens: [] },
        { count: 1, name: "Weapon Team Crew", tokens: ["Ratling Gun"] }
      ]
    },
    ...
  ]
}
```

### Step 2: Faction Matcher

Takes the parsed intermediate format and matches against faction data:

1. **Faction detection:** Map display name ("Skaven") to faction slug ("skaven")
2. **Unit matching:** Fuzzy match `rawName` against all unit `name_en` values in the faction data. Handle common variations (plural/singular, abbreviations).
3. **Token classification:** For each token, determine if it's:
   - A command option (General, Champion name, Standard Bearer, Musician)
   - An equipment choice (Shield, Great weapon, Plague censer)
   - A mount (Screaming Bell, Forest Dragon, Plague Furnace)
   - A magic item (from the shared magic-items.json or faction-specific items)
   - A wizard level (Wizard Level 1/2/3/4)
   - A magic lore (Elementalism, Lore of the Wilds, etc.)
   - A special option (Ambushers, Poisoned Attacks, etc.)
   - A magic banner (Banner of Verminous Scurrying, etc.)
4. **Ambiguity handling:** Some tokens could match multiple categories. Priority: named champion > magic item > equipment > mount > option

### Step 3: Output Generator (OWB or NR)

Takes matched data and generates the target JSON format.

---

## Error Handling & User Feedback

The converter should be **generous in what it accepts** and **clear about what it couldn't resolve.**

### Parse Status Messages

- ✅ `Parsed: [Faction] — [N] pts, [N] units`
- ⚠️ `Warning: "[token]" not found in [unit]'s options — included as raw text`
- ⚠️ `Warning: "[unit name]" not found in faction data — unit skipped`
- ⚠️ `Warning: Points mismatch — BCP says [N], calculated [M]`
- ❌ `Error: Could not detect faction from input`
- ❌ `Error: No unit entries found — check your paste format`

### Graceful Degradation

- If a token can't be matched, include it as a comment/note rather than silently dropping it
- If a unit can't be matched, still include it with as much info as possible and flag it
- If points don't add up, warn but don't block the conversion
- Accept messy input — extra whitespace, inconsistent capitalization, missing bullet characters

---

## Buy Me a Coffee Integration

**Service:** https://www.buymeacoffee.com (Brent to create account)

**Integration approach:**
- Use the official BMC button/widget
- Place in the top-right corner of the header
- Small, tasteful, uses their standard button style
- Opens in a new tab — no popups or modals
- Consider a secondary subtle mention in the footer: "If this tool saves you time, consider buying me a coffee ☕"
- Do NOT gate any functionality behind payment
- Do NOT show popups, donation modals, or interstitials

**Implementation:**
```html
<!-- In header -->
<a href="https://www.buymeacoffee.com/[USERNAME]" target="_blank" rel="noopener">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
       alt="Buy Me A Coffee"
       style="height: 36px; width: auto;">
</a>
```

Or use their JavaScript widget for a floating button (less intrusive than it sounds — it's a small icon in the corner).

---

## Build Plan for Claude Code

### Phase 1: OWB Converter

#### Step 1: Set Up Project & Get Data
```bash
# Initialize project
mkdir bcp-converter && cd bcp-converter
npm init -y

# Clone OWB repo to extract faction data
git clone https://github.com/nthiebes/old-world-builder.git _owb-data
cp -r _owb-data/public/games/the-old-world/ src/data/owb/
rm -rf _owb-data

# Key files now in src/data/owb/:
# - wood-elf-realms.json
# - skaven.json
# - magic-items.json
# - [all other factions].json
```

#### Step 2: Build BCP Parser
- Implement the text parser described above
- Test against the Skaven example list
- Test against Wood Elf lists

#### Step 3: Build Faction Matcher
- Load OWB faction data
- Implement unit name matching
- Implement token classification
- Build magic item lookup from magic-items.json

#### Step 4: Build OWB JSON Generator
- Clone unit templates from faction data
- Set active flags based on matched tokens
- Populate magic items
- Assemble top-level list structure
- Validate output by importing into old-world-builder.com

#### Step 5: Build UI
- Single HTML page with Tailwind
- Textarea, format toggle, convert button, feedback panel
- File download (JSON with `.owb.json` extension)
- Buy Me a Coffee button
- Test on desktop and mobile

#### Step 6: Test & Validate
- Create test lists in OWB, export as text, re-import via converter
- Test with multiple factions
- Test edge cases (named characters, unusual equipment, Armies of Infamy)

### Phase 2: NR Converter (immediately after Phase 1)

#### Step 7: Get NR Catalogue Data
```bash
# Clone BSData repo for catalogue files
git clone https://github.com/vflam/Warhammer-The-Old-World.git _nr-data
cp _nr-data/*.cat src/data/nr/
cp _nr-data/*.gst src/data/nr/
rm -rf _nr-data
```

#### Step 8: Build Catalogue Parser
- Parse `.cat` XML files into a searchable index
- Map unit names → entry IDs, profiles, selections
- Handle shared entries from `.gst` and cross-catalogue references

#### Step 9: Build NR JSON Generator
- Reuse BCP parser and faction matcher from Phase 1
- Assemble the nested BattleScribe selection tree
- Embed profiles, costs, and categories
- Generate correct entry ID chains

#### Step 10: Integrate into UI
- Add NR option to the format toggle
- Output as `.json` file compatible with NR import
- Test by importing into newrecruit.eu

---

## Reference Files

The following files should be kept alongside this brief for Claude Code reference:

1. **`tree-army_owb.json`** — Real OWB export of a Wood Elf Host of Talsyn list (2200 pts)
2. **`In_The_Pines_-_Logan_s_Lair_-__To_Test_.json`** — Real NR export of the SAME list
3. **This brief** — `bcp-converter-brief.md`

These two JSON files represent the same army built in both tools, making them a perfect Rosetta Stone for validating the converter output.

---

## Testing Checklist

- [ ] Parse Skaven BCP list → valid OWB JSON → imports into old-world-builder.com
- [ ] Parse Wood Elf BCP list → valid OWB JSON → imports into old-world-builder.com
- [ ] Parse Empire BCP list → valid OWB JSON
- [ ] Parse a list with Armies of Infamy → correct army composition
- [ ] Parse a list with named characters
- [ ] Parse a list with multiple wizards with different lores
- [ ] Parse a list with magic banners on units
- [ ] Handle malformed input gracefully (missing bullets, extra spaces, etc.)
- [ ] UI works on mobile
- [ ] Buy Me a Coffee button renders correctly and links work
- [ ] NR JSON output → imports into newrecruit.eu (Phase 2)

---

## Notes

- The OWB developer has an open issue (#242) about importing NewRecruit lists — there's appetite for interoperability in the community
- New Recruit states it's compatible with BattleScribe `.ros`/`.rosz` files for import
- The `.cat` files in the vflam repo are community-maintained and actively updated
- GW releases FAQ/errata that may change points or rules — the converter's data files need periodic updates (or dynamic fetching from OWB/vflam repos)
- BCP text format is not formally specified — it varies slightly by how players format their lists. The parser should be forgiving.
