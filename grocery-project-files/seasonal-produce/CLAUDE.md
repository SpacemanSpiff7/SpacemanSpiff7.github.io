# Seasonal Produce California

## Permissions

When you need access to files outside the current working directory, ask the user for read and/or write access to the specific directory path rather than asking for approval to `cd`.

## What This Is

A static web app showing what produce is in season in California. No backend, no build step, no npm. Open `web/index.html` directly or serve the `web/` directory.

## Commands

```bash
# Validate data
python scripts/validate_data.py

# Compile CSVs -> web/data.json
python scripts/compile_data.py

# Report items missing season data
python scripts/find_gaps.py                        # full report
python scripts/find_gaps.py --category Fruit Herb  # filter categories
python scripts/find_gaps.py --json                 # machine-readable JSON

# Add season data from a batch JSON file
python scripts/add_seasons.py batch.json             # validate + append
python scripts/add_seasons.py batch.json --dry-run   # validate only

# Full pipeline: validate + compile + gap report (optionally with batch)
bash scripts/pipeline.sh                  # validate + compile + gaps
bash scripts/pipeline.sh batch.json       # add + validate + compile + gaps

# Serve locally
python -m http.server 8000 --directory web
```

Always use `python` (not `python3`) via virtual environment.

## Architecture

```
seasonal-produce/
├── data/
│   ├── produce_items.csv      # 335 items (ontology)
│   ├── regions.csv            # 33 regions (geography)
│   ├── produce_seasons.csv    # 284 entries for 208 items (seasonality)
│   └── compiled.json          # Output of compile_data.py
├── input/                     # Original seed files (read-only reference)
├── reference/                 # Design/archive docs
├── scripts/
│   ├── compile_data.py        # CSV -> JSON compiler
│   ├── validate_data.py       # Validation + coverage report
│   ├── find_gaps.py           # Coverage gap reporter
│   ├── add_seasons.py         # Batch append from JSON
│   ├── pipeline.sh            # One-command orchestrator
│   └── batches/               # Saved batch files for auditability
├── docs/
│   ├── DATA_SOURCES.md        # Source/methodology summary
│   └── LESSONS.md             # Development lessons learned
└── web/
    ├── index.html             # Main app
    ├── stone-fruit-guide.html # Companion guide page
    ├── style.css              # All styles (warm light editorial)
    ├── app.js                 # All application logic (single IIFE)
    └── data.json              # Copy of compiled.json
```

## Key Files

| File | What it does |
|------|-------------|
| `web/app.js` | Single IIFE containing: state management, data loading, ring navigator (3 concentric rings), timeline renderer, filter dropdown, detail panel, search, load animation. ~1200 lines. |
| `web/style.css` | Design tokens, ring styles, timeline bars, filter dropdown, detail panel, background composition (stoumann shapes), responsive breakpoints. ~1000 lines. |
| `web/data.json` | Compiled JSON with `produce`, `regions`, `seasons` arrays + `meta` object. ~117KB (compacted keys). |

## Performance Architecture

### Compacted Season Keys

`compile_data.py` emits shortened keys in `data.json` season entries. `app.js` expands them on load.

| CSV / full key | JSON key |
|----------------|----------|
| `produce_slug` | `p` |
| `region_slug` | `r` |
| `season_months` | `s` |
| `peak_months` | `pk` |
| `source_type` | `t` |
| `notes` | `n` |
| `storage_tip` | `st` |

### Caching

Two cache tiers in `app.js`:

- **Data caches** (computed once after data load, never invalidated): `sourceTypes`, `seasonLength`, `yearRound`, `originGroups`, `hasLocalSeason`, `earliestPeakMonth` per produce slug.
- **Per-month caches** (invalidated on month change): status classification, `comingSoon`, and `leavingPeak` sets keyed by month index.

These eliminate redundant computation across `filterProduce`, `sortItems`, `computeStats`, and `renderPeakStrip`.

### DOM Recycling

Timeline rows are reused across renders via slug-keyed maps (`_tlActiveDataRows`, `_tlActiveNoDataRows`). The header row, now-line, and no-data divider are persistent DOM elements created once. Only genuinely new slugs allocate new DOM nodes.

### Split Render Paths

- **`render()`** -- full rebuild: rings, filters, timeline, peak strip, stats, detail panel.
- **`renderSelectionOnly()`** -- lightweight path for item selection changes: toggles `.selected` class via `data-slug` attributes on existing rows, updates the detail panel. Does not rebuild timeline, rings, or filters.

### Asset Loading

- Google Fonts loaded via `<link rel="preload">` + `onload` swap pattern (non-render-blocking).
- `data.json` preloaded with `<link rel="preload" as="fetch" crossorigin="anonymous">`.

### CSS/Scroll Optimizations

- `will-change: transform` on `.bg-decor` elements.
- `contain: content` on `.timeline-body`.
- `content-visibility: auto` on `.timeline-row` (browser skips offscreen row layout/paint).
- Scroll handler for sticky labels is rAF-throttled.

## Data Model

Three CSV layers compiled into one JSON:

- **Produce** (`data/produce_items.csv`): `slug`, `name`, `category`, `culinary_group`. 335 items.
- **Regions** (`data/regions.csv`): `region_slug`, `region_name`, `origin_group`, `country`, `lat`, `lng`. 33 regions (12 CA, 21 other).
- **Seasons** (`data/produce_seasons.csv`): `produce_slug`, `region_slug`, `season_months` (JSON array), `peak_months` (JSON array), `source_type` (local/import), `notes`, `storage_tip`. 284 entries covering 208 items.

**Important:** Items can have BOTH local AND import season entries. This is correct -- e.g., California avocados peak Apr-Jul while Mexican avocados fill the rest of the year. See `docs/LESSONS.md` for details.

## UI Components

### Ring Navigator
Three concentric SVG rings, all rotating:
- **Outer** (months): 12 segments, 30deg each. Rotates to center selected month at 12 o'clock (uses -15deg offset).
- **Middle** (category + source): 9 segments. Click to toggle filter. Rotates last-clicked to top.
- **Inner** (status): 4 segments (Peak, Coming, Leaving, All). Multi-select toggle.

Tick mark on outer edge shows proportional day position within selected month.

### Ring Center Display
Shows today's date (e.g., "Mar 16") when viewing the current month, or the month name otherwise. Below that: peak count and in-season count as bold numbers with labels.

### Timeline
Horizontal bars per item. Fixed left column (item names with category color border on solid `--bg-panel` background), scrolling bar area. All bars use the same solid fill regardless of source -- the only distinction between local and import is the label text:
- **Bright bar** = peak season
- **Muted bar** = shoulder season (available but not peak)

Dual-source items show two stacked bars with origin labels (e.g., "CA" on top, "Mexico" below).

### Peak Strip
Horizontal scrolling row of peak items between controls and timeline. Only visible when status filter is "All" or "Peak". Quick answer to "what should I buy?"

### Filter Dropdown
Accessible via the "Filters" button in the controls bar. Contains chip-based toggles for Category (7), Source (2), and Status (4) -- mirrors the ring navigator's middle and inner rings. Chips sync bidirectionally with ring segments. When filters are active, the toggle shrinks and a reset button appears beside it.

### Detail Panel
Bottom sheet with full season info per region (with single-letter month labels above each minibar cell), notes, storage tips. Month range text handles year-wrapping correctly (e.g., "Oct -- Jan" not "Jan -- Dec").

## Visual Design

**Theme:** Warm off-white (`#F7F3ED`) with dark brown text (`#3A2E22`) and burnt orange accent (`#D4702C`). Muted earth-tone produce category colors. Inspired by stoumann's geometric harvest composition (warm color blocks via CSS clip-path) and mattjuggins' circular calendar (concentric ring mechanics).

**Background composition:** 4 fixed-position divs with clip-path shapes in warm colors (burnt orange, rust, deep red, gold-green) at 3-4% opacity behind all content. Creates warm layered atmosphere vs. flat monotone.

**Typography:** Fraunces (headings) + DM Sans (body) from Google Fonts.

**Key design rules:**
- No emojis
- Minimal rounded corners (3-4px, not bubbly)
- Restrained animation (staggered load reveal, smooth ring rotation, row cascade)
- Paper grain texture overlay at 3.5% opacity (SVG noise via body::after)

## Category Colors

Defined as CSS custom properties in style.css. Muted earth tones, not rainbow:
- Citrus: `#C9943A` (warm gold)
- Berry: `#8B3A4A` (wine)
- Stone Fruit: `#C47A6C` (peach)
- Leafy Green: `#6B8F5E` (sage)
- Root/Tuber: `#9A6E42` (sienna)
- See `style.css` `:root` block for full list.

## Data Sources

See `../data-sources.md` for sourcing methodology and known data quality issues.

## Gotchas

Read `docs/LESSONS.md` before making changes. Key pitfalls:
- Ring rotation needs the -15deg center offset to center segments at 12 o'clock
- Dual-source items (local + import) are correct, not bugs
- Local and import bars are visually identical -- only the label differs
- `monthRangeText()` handles year-wrapping via largest-gap detection
- Tooltip hover targets the individual `.season-bar`, not the `.timeline-row`
- Timeline name column uses `--bg-panel` (opaque) to prevent bars bleeding through on scroll
- `body::after` grain texture is z-index 9999 intentionally
- `file://` protocol support uses XMLHttpRequest fallback
- Project is integrated into parent site via `data/projects.json` (featured + workbench)

## No Emojis

Do not use emojis anywhere in the app -- UI elements, code comments, generated content. Use text or icons instead.
