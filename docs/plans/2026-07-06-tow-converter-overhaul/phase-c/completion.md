# Phase C completion

All three tasks complete. `npm test`: 40 tests, 40 pass. Commits: 398f754 (C1), 996c182 (C2+C3 combined — C2 alone would have broken index.html and generate.test.js, which consume the detection API; combining kept every commit green).

## Source of truth located

OWB's armies/compositions live in `src/assets/the-old-world.json` (not `public/games/`); composition display names in `src/pages/magic/name-map.js`. scripts/build-data.mjs fetches both and emits unit-name-index.json (1115 name variants, 18 factions) and army-compositions.json (compositions + per-faction magic item sections).

## Import-correctness findings

- Skaven has NO clan-pestilens/skryre/moulder/eshin compositions in OWB — only `skaven` and `sk-renegade`. The old UI offered and exported all four invalid slugs; a confirmed "does not load cleanly" cause. Same class of fix: `errantry-crusades` (old config lacked the s), `orions-wild-hunt` (apostrophe bug).
- army-compositions.json also carries each faction's legal magic-items sections from OWB's own data. NOT yet consumed by items.js (still uses the hand-mapped FACTION_EXTRA_CATEGORIES, which wrongly gives dwarfs 'general' items — OWB says dwarfs take only their runic section). Follow-up task spawned for Phase D or later.

## Detection behavior

- Faction: header names/abbreviations win; else unit-index scoring with a margin rule (2x runner-up or 3+ matches, dead ties return null). Manual faction picker appears in the UI when detection returns null.
- AoI: composition display name in header (1.0), composition-exclusive options/items/units in text (0.9, auto-select), validated against official slugs only.
- Bug found live and fixed: units carrying armyComposition keys for BOTH the grand army and a composition (e.g. Hell Pit Abomination) were read as composition-exclusive, auto-selecting sk-renegade for plain Skaven lists. Exclusivity now requires the faction slug to be absent AND no same-named grand-army template.

## Verification

Browser-verified: Skaven fixture auto-detects with Grand Army selected; "Host of Talsyn" header auto-selects host-of-talsyn with hint; gibberish shows the manual faction picker (19 entries incl. placeholder). The user-facing OWB import check of a converted list with a non-default composition remains open alongside the Phase B manual gate.
