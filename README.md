# TOW List Converter

Convert Warhammer: The Old World army lists to importable JSON for army builder apps.

**[Use it live](https://towlistconverter.xyz/)**

## What it does

Paste any text army list and get a JSON file you can import directly into Old World Builder or New Recruit. No account needed, runs entirely in your browser.

- Auto-detects the faction and Army of Infamy (with a manual picker as fallback)
- Understands colloquial unit names ("Halberdiers" means State Troops with halberds)
- Reports everything before download: unmatched units, unrecognized options, and the exact points total the builder will show
- Handles weapon teams, detachments, champions with magic items, wizard levels, and lores

## Supported input formats

- BCP (Best Coast Pairings) text export
- Old World Builder text export
- Any plain text with unit names and points

The parser uses the faction data itself as a dictionary — it doesn't require a specific structure.

## Supported output formats

- **Old World Builder** — all factions
- **New Recruit** — all factions and Armies of Infamy (BattleScribe roster format)

## Supported factions

All 18 factions including Renegade Crowns, plus every Army of Infamy composition (Host of Talsyn, Errantry Crusade, Nomadic Waaagh!, Knightly Orders, ...).

## How to use

1. Paste your army list text
2. Check the detected faction and army composition
3. Select output format and click "Convert & Download"
4. Review the conversion report, then import the file into your army builder

## Development

Static site, no build step: `index.html` + ES modules in `src/js/` (parse, match, items, detect, generate, generate-nr, report).

```
npm run serve       # dev server (no-cache) on :8080
npm test            # node --test suite
npm run build:data  # regenerate detection indexes from OWB repo data
npm run build:nr    # regenerate New Recruit catalogue indexes from .cat files
npm run update:data # refresh ALL game data from upstream (run after GW/OWB balance updates), then test
```

Unit points and stats are snapshots of the upstream repos — they do not update themselves. After a GW points update lands upstream, run `npm run update:data` and commit the result; the test suite flags renames and points drift.

Game data lives in `src/data/` — OWB faction JSONs plus generated indexes (`unit-name-index.json`, `army-compositions.json`, `src/data/nr/*`). Never hand-edit generated files; extend `src/data/owb/unit-aliases.json` for new colloquial unit names.

## Credits

Game data sourced from:
- [Old World Builder](https://github.com/nthiebes/old-world-builder) by nthiebes
- [Warhammer-The-Old-World](https://github.com/vflam/Warhammer-The-Old-World) by vflam

This is an unofficial fan project. Not affiliated with or endorsed by Games Workshop.

## License

MIT
