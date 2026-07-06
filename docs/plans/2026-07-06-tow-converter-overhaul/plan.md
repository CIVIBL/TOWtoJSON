# TOW Converter Overhaul

> Generated from plan.json. Do not edit — edit plan.json and task files.

**Status:** Not Yet Started | **Workflow:** plan-only | **Execution:** subagents

**Goal:** Consolidate the converter to one tested ES-module implementation, make matching and detection data-driven and token-based, surface conversion warnings, then add New Recruit export.

**Architecture:** index.html becomes a thin UI shell importing ES modules from src/js/ (parse, match, items, detect, generate, report). All game knowledge comes from shipped data files in src/data/ (OWB faction JSONs today; generated army-compositions, unit-name-index, and NR catalogue indexes added by build scripts in scripts/). Node assertion tests in test/ import the same modules the page runs.

## Phase A — Consolidate to one implementation with real tests

Every later fix must land in exactly one place. Extract the live inline implementation, delete both dead layers, replace print-only test scripts with assertions.

| Task | Name | Depends | Verification |
|------|------|---------|--------------|
| A1 | Extract inline implementation into src/js/ ES modules | — | node imports all 5 modules |
| A2 | Rewire index.html to import modules, delete inline copies | A1 | browser convert of Skaven fixture; no inline function bodies |
| A3 | Assertion tests; delete dead src modules and demo scripts | A1 | npm test (10 anchors, 2197 pts, faction=skaven) |

## Phase B — Token-based matching (depends: A)

Replace substring-scan-of-whole-block with per-token classification; scope magic items to faction.

| Task | Name | Depends | Verification |
|------|------|---------|--------------|
| B1 | Rewrite extractOptions as per-token classification | — | node --test test/match.test.js |
| B2 | Scope magic item index to detected faction | — | node --test test/items.test.js |
| B3 | Fix item placement (character/champion/banner) | B1 | node --test test/generate.test.js + OWB import |

## Phase C — Data-driven detection (depends: A)

Generated indexes from shipped data + official OWB composition slugs; detection rewritten on top.

| Task | Name | Depends | Verification |
|------|------|---------|--------------|
| C1 | Build script: unit-name-index.json + army-compositions.json | — | node scripts/build-data.mjs + spot checks |
| C2 | Rewrite detect.js on generated indexes | C1 | node --test test/detect.test.js |
| C3 | Wire UI: official slugs, manual faction fallback | C2 | browser checks + OWB import with AoI |

## Phase D — Honest feedback panel (depends: B, C)

Structured report of matched/dropped/unknown/point-mismatch, rendered before download.

| Task | Name | Depends | Verification |
|------|------|---------|--------------|
| D1 | src/js/report.js conversion report | — | node --test test/report.test.js |
| D2 | Render report in feedback panel | D1 | browser check with misspelled unit |

## Phase E — New Recruit export (depends: B)

Build-time extraction of BattleScribe catalogue ids; roster generator from the same matched IR; UI toggle.

| Task | Name | Depends | Verification |
|------|------|---------|--------------|
| E1 | scripts/build-nr-data.mjs + src/data/nr/*.json | — | build script + id cross-check vs reference roster |
| E2 | src/js/generate-nr.js roster generator | E1 | node --test + manual newrecruit.eu import |
| E3 | Enable NR toggle with graceful per-faction fallback | E2 | browser checks |

## Key facts for executors

- Live implementation = inline script in index.html; `src/parser|matcher|generator` are dead (old pipeline, matched 5/10 test units).
- Skaven fixture ground truth: 10 entries, 2197 points.
- Official AoI slugs exist in OWB's own data (`orions-wild-hunt`, not `orion's-wild-hunt`); never string-generate slugs.
- magic-items.json has 40 sections; only general + faction + mapped special categories are legal per faction (mapping table in b2.md).
- NR format = BattleScribe roster JSON; all ids must come from the vflam .cat/.gst files; reference roster is the Rosetta Stone.
