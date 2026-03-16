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

# Serve locally
python -m http.server 8000 --directory web
```

Always use `python` (not `python3`) via virtual environment.

## Architecture

```
seasonal-produce/
├── data/
│   ├── produce_items.csv      # 332 items (ontology)
│   ├── regions.csv            # 32 regions (geography)
│   ├── produce_seasons.csv    # ~163 entries for 97 items (seasonality)
│   └── compiled.json          # Output of compile_data.py
├── input/                     # Original seed files (read-only reference)
├── reference/                 # Design direction docs
├── scripts/
│   ├── compile_data.py        # CSV -> JSON compiler
│   └── validate_data.py       # Validation + coverage report
├── docs/
│   └── LESSONS.md             # Development lessons learned
└── web/
    ├── index.html             # Main app
    ├── compact.html           # Compact/legacy light theme view
    ├── style.css              # All styles (dark teal + gold editorial)
    ├── app.js                 # All application logic (single IIFE)
    └── data.json              # Copy of compiled.json
```

## Key Files

| File | What it does |
|------|-------------|
| `web/app.js` | Single IIFE containing: state management, data loading, ring navigator (3 concentric rings), timeline renderer, grid renderer, detail panel, search, filters, load animation. ~1200 lines. |
| `web/style.css` | Design tokens, ring styles, timeline bars, grid cards, detail panel, background composition (stoumann shapes), responsive breakpoints. ~1100 lines. |
| `web/data.json` | Compiled JSON with `produce`, `regions`, `seasons` arrays + `meta` object. <100KB. |

## Data Model

Three CSV layers compiled into one JSON:

- **Produce** (`data/produce_items.csv`): `slug`, `name`, `category`, `culinary_group`. 332 items.
- **Regions** (`data/regions.csv`): `region_slug`, `region_name`, `origin_group`, `country`, `lat`, `lng`. 32 regions (12 CA, 20 other).
- **Seasons** (`data/produce_seasons.csv`): `produce_slug`, `region_slug`, `season_months` (JSON array), `peak_months` (JSON array), `source_type` (local/import), `notes`, `storage_tip`. ~163 entries.

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

### Grid View
Cards grouped by category, showing mini 12-month bars.

### Detail Panel
Bottom sheet with full season info per region (with single-letter month labels above each minibar cell), notes, storage tips. Month range text handles year-wrapping correctly (e.g., "Oct -- Jan" not "Jan -- Dec").

## Visual Design

**Theme:** Dark teal (`#224443`) with warm gold/cream text and earth-tone produce category colors. Inspired by stoumann's geometric harvest composition (warm color blocks via CSS clip-path) and mattjuggins' circular calendar (concentric ring mechanics).

**Background composition:** 4 fixed-position divs with clip-path shapes in warm colors (cream, rust, deep red, gold-green) at 3-6% opacity behind all content. Creates warm layered atmosphere vs. flat monotone.

**Typography:** Syne (headings) + DM Sans (body) from Google Fonts.

**Key design rules:**
- No emojis
- Minimal rounded corners (3-4px, not bubbly)
- Restrained animation (staggered load reveal, smooth ring rotation, row cascade)
- Paper grain texture overlay at 2% opacity (SVG noise via body::after)

## Category Colors

Defined as CSS custom properties in style.css. Muted earth tones, not rainbow:
- Citrus: `#F8A611` (amber)
- Berry: `#A83820` (wine)
- Stone Fruit: `#CB5207` (rust)
- Leafy Green: `#4A9068` (sage)
- Root/Tuber: `#AE3E09` (sienna)
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
- Leaf embellishments need 8-12% opacity to be visible
- `body::after` grain texture is z-index 9999 intentionally
- `file://` protocol support uses XMLHttpRequest fallback
- Project is integrated into parent site via `data/projects.json` (featured + workbench)

## No Emojis

Do not use emojis anywhere in the app -- UI elements, code comments, generated content. Use text or icons instead.
