# Phase B completion

All three tasks complete. `npm test`: 31 tests, 31 pass. Commits: 0d73941 (B1), 2de7089 (B2), 8f41c9d-range (B3: "fix: magic item placement by origin and type; selected ids use source-section index").

## Beyond spec

- B3 discovered that OWB resolves `selected[].id` as the item's index within its magic-items.json source section (verified against all 5 selected items in reference-files/tree-army_owb.json). The old generator wrote `id: selected.length` (always 0) — a likely cause of broken imports. items.js now records `sourceIndex`; generate.js emits it as the selected id.
- B1 ladder also strips `(...)` annotations ("Clawleader (champion)") and matches comma-parts of compound names ("Hand weapon, Thrusting spear").
- Fixture now matches 10/10 units; Grey Seer's Screaming Bell mount matches (was silently unmatched before, "{renegade}" annotation).

## Known gaps for later phases

- D2: unit display names show raw data names incl. annotations ("Hell Pit Abomination {renegade}") — strip for display.
- Manual gate NOT yet done: import ./skaven_2197pts.owb.json (untracked, repo root) into old-world-builder.com to confirm end-to-end. Grey Seer must show Storm Daemon + Ruby Ring of Ruin, Plague Monks the Banner of Verminous Scurrying, both Hell Pit Abominations present.
- Weapon Team sub-lines are ignored (not detachments in skaven.json data; no options leak) — points for those models ride inside the Clanrats anchor cost, which OWB will not reproduce; the D1 points check will flag such units.
