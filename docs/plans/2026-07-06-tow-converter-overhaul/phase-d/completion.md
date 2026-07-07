# Phase D completion

Both tasks complete. `npm test`: 48 tests, 48 pass. Commits: aa4bc3a (D1), + "feat: honest feedback panel" (D2).

## Notes

- computeUnitPoints is a port of OWB's src/utils/points.js getUnitPoints (fetched from the repo during D1), so the "OWB will show N pts" line matches the site's math: perModel pricing, command magic, requiredMagicItem gating, detachments, character vs unit item pricing.
- parseWithFactionData now also returns headerPoints (used for the points check when a list header carries "[2000 pts]").
- Browser-verified both scenarios: clean fixture (10/10, points details collapsed) and broken fixture (crimson 9/10 header, dropped "Clanrets (232 pts)", gold unknown-token line, correct exported list with annotation-free names).

## Real signal the report already surfaces on the test fixture

- Clanrats anchors (232/227) vs OWB (282/277): the BCP model count (31) includes Weapon Team crew, so strength is overstated and the Weapon Team itself is not exported.
- Giant Rats (47) vs OWB (42): the Packmaster sub-model is not exported.

Both are model-group handling gaps in the parser (sub-line counts should drive strength; packmaster/weapon-team rows need their own handling), not report bugs. Candidate refinement before or during Phase E.
