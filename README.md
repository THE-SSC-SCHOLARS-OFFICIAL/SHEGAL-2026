# SSC CGL 2026 - Mock Hub

Open `index.html` (works by double-click too, no server needed) or upload the whole folder to GitHub Pages.

## Formats
| | Full mock | Sectional (Maths / English / Reasoning / GK) |
|---|---|---|
| Questions | 100 (4 x 25) | 25 |
| Marks | 200 (+2) | 50 (+2) |
| Negative | -0.5 | -0.5 |
| Time | 4 sections x 15 min (from JSON) | 15 min (from JSON) |
| Sections | Locked: next section opens only after Submit Section / timer end | single section |

All 53 sets give 53 full mocks + 53 x 4 = 212 sectionals. Timing / marking / section order are read from the JSON.

## Same as MAINS-2026 zip
Test engine (Save & Next, Mark for Review, palette, pause/resume, practice mode, bilingual, analysis, solutions, attempts history),
Saved questions page, Backup & Restore. Dashboard + Hunter/EXP removed, admin gate removed.

## Maths signs fix
LaTeX (`\(\frac{a}{b}\)`) is rendered with KaTeX, bundled locally in `assets/vendor/katex` (works offline too).

## Adding / changing sets
    python tools/build_data.py path/to/your_big.json
then bump `dataVersion` in `assets/config.js` (1 -> 2) so browsers drop the cache.

## Files
index.html (hub) | test.html (exam) | saved.html | assets/ (engine, common, config, css, katex) | data/ (index.js + tests/<set>.js) | tools/build_data.py
