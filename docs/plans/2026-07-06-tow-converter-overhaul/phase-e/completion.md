# Phase E completion

All three tasks complete. `npm test`: 61 tests, 61 pass. Commits: "feat: NR catalogue index build script" (E1), bd973de (E2), "feat: New Recruit export enabled in UI" (E3).

## Key structural discoveries

- NR ships SEPARATE catalogues per army composition ("Wood Elf Realms - Host of Talsyn.cat"), so NR data files are keyed by composition slug, not faction slug. CATALOGUE_MAP in scripts/build-nr-data.mjs maps our slugs to .cat files; shipped: skaven, wood-elf-realms, host-of-talsyn.
- Roster entryId anatomy: '::'-joined ids of every entryLink traversed from the unit root plus the terminal selectionEntry id; intermediate plain entries and groups contribute no segment (groups only set the `group` display field). Validated: all 70 entryIds in the reference roster are reproduced by the generated trees.
- Rank categories (primary=true) sit on the root entryLink, faction tags on the shared target entry — merged in the build script.
- entryLink-level <costs> override the target's costs (Clanrats Shield).
- Naming quirk handled by alias: OWB "Level 4 Wizard" vs NR "Wizard Level 4".

## Verification

- Skaven fixture -> NR roster totals 2197 pts with zero warnings (identical to OWB total).
- Browser: NR toggle converts and downloads; Empire (no NR data shipped) gets a graceful "not yet available" message; OWB path unchanged.
- Profiles/rules are NOT emitted (NR re-resolves them from the catalogue by id). MANUAL GATE OPEN: import ./skaven_2197pts.nr.json (untracked, repo root) at newrecruit.eu to confirm; if NR rejects rosters without profiles, that is the first thing to revisit.

## Follow-ups

- Only 3 NR catalogues shipped; run `npm run build:nr -- --faction <slug>` after extending CATALOGUE_MAP to cover more factions/compositions (~1-2 MB each, lazily fetched).
- NR data files are large due to magic-item subtree duplication per character; a shared-subtree encoding would cut them ~70% if size becomes a problem.
