# Phase A completion

All three tasks complete. `npm test`: 12 tests, 11 pass, 1 todo, 0 fail. Commits: 4e5014e (A1), ce9738a (A2), f645f88 (A3).

## Deviations from task specs

- A2: the excision markers missed second copies of `detectFactionFromText` / `detectArmyOfInfamyFromText` defined inside the UI Logic section; they collided with the imports (duplicate declaration) and were deleted as part of A2.
- A3: `"node --test test/"` fails on Node v22.18.0/Windows (directory loaded as CJS module); used `"test": "node --test \"test/*.test.js\""` instead.

## Findings for later phases

- Phase B (b1.md case 6): skaven.json names the rare `Hell Pit Abomination {renegade}`; the `{...}` annotation defeats all matching tiers. Fixture matches 8/10; pinned by a hard test + a todo test for 10/10.
- Phase B: Plague Monks match the `plague-monks-core` template; with no `++ section ++` headers the export lands 3 characters / 5 core / 0 special / 0 rare. Asserted as current behavior in generate.test.js.
- Phase D: the UI reports "10 units found" while the export contains 8 — confirmed live in the browser during A2 verification.
