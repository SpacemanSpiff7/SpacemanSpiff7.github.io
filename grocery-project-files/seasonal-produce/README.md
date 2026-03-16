# Seasonal Produce California

A static web app showing what produce is in season in California, where it's coming from, and when peak flavor hits. No backend, no build step -- just open `web/index.html`.

## How to Read the App

### The Ring Navigator

The circular dial at the top is a **month selector** with three concentric rings:

| Ring | What it controls |
|------|-----------------|
| **Outer ring** (months) | Select a month. The ring rotates to center your selection at 12 o'clock. |
| **Middle ring** (categories + source) | Filter by produce type (Fruit, Veg, Chile, Herb, Mushroom, Nut) or by source (Local, Import). Click to toggle; click again to deselect. Multiple selections combine. |
| **Inner ring** (status) | Filter by season status: Peak, Coming Soon, Leaving Peak, or All. |

The **gold tick mark** on the outer edge shows today's position within the selected month.

The **center display** shows today's date (when viewing the current month), plus two stats: how many items are at peak and how many are in season.

### The Timeline View

Each row is one produce item. The horizontal bars show when that item is available:

| Visual | Meaning |
|--------|---------|
| **Bright bar** | Produce at peak season |
| **Muted bar** | Available but not at peak (shoulder season) |
| **Colored left border** on the item name | Indicates produce category (citrus = gold, berry = deep red, leafy green = sage, etc.) |

All bars use the same solid color fill regardless of source. The only distinction between local and imported produce is the **text label**.

**Dual-source items** (like Avocado or Bell Pepper) show two bars stacked vertically:
- Top bar labeled "CA" = local California source
- Bottom bar labeled with the origin region (e.g., "Mexico", "South America") = imported source
- Hover over a bar to see the full region name (e.g., "Sinaloa")
- These items genuinely come from both sources. For example, California avocados peak Apr--Jul while Mexican avocados fill the rest of the year.

The **gold vertical line** marks the current date position within the selected month.

**Sort order** (top to bottom):
1. Currently at peak
2. Currently in season (not peak)
3. Coming into season next month
4. Out of season

Within each group, local items sort before imports, then alphabetically.

### The Grid View

Cards showing items in season for the selected month, grouped by category. Each card shows:
- Produce name
- Culinary group
- A mini 12-month bar (same color coding as the timeline)
- Growing region
- Source badge (Local or Import)

### The Peak Strip

The horizontal row of cards between the controls and the timeline shows items currently at peak for the selected month. Quick answer to "what should I buy today?" Only visible when the status filter is set to "All" or "Peak".

### Item Detail

Click any item (in timeline or grid) to open a detail panel showing:
- Full name, category, and culinary group
- All season entries with region, source type, and month ranges
- Mini 12-month bar per region entry with single-letter month labels (J F M A M J J A S O N D)
- Growing notes and storage tips (when available)

Month ranges handle year-wrapping correctly -- a Dec--Jan peak shows as "Dec -- Jan", not "Jan -- Dec".

### Filters

All filters combine. Selecting "Fruit" + "Local" shows only locally-grown fruit. The "Clear filters" button appears when any filter is active.

### Color Legend (produce categories)

| Category | Color |
|----------|-------|
| Citrus | Warm amber/golden |
| Berry | Deep wine red |
| Stone Fruit | Rust/coral |
| Pome Fruit | Warm gold |
| Tropical | Rich orange |
| Leafy Green | Sage/muted green |
| Brassica | Forest green |
| Root/Tuber | Earthy sienna |
| Allium | Red-brown |
| Legume | Dark gold |
| Cucurbit | Bright gold |
| Chile Pepper | Deep red |
| Herb | Bright green |
| Mushroom | Warm brown |
| Nut | Toasted almond |

## Data

The app reads a single `web/data.json` file compiled from three CSV layers:

- **`data/produce_items.csv`** -- 332 canonical produce items (ontology)
- **`data/regions.csv`** -- 32 growing regions: 12 California, 4 other US, 5 Mexico, 5 South America, 2 Central America, 4 other
- **`data/produce_seasons.csv`** -- ~163 season entries covering 97 items

See `data-sources.md` (in the parent directory) for sourcing methodology.

### Running the Scripts

```bash
# Validate data integrity
python scripts/validate_data.py

# Compile CSVs into web/data.json
python scripts/compile_data.py
```

Use `python` via virtual environment (not `python3`).

## Local Development

No build step. Serve the `web/` directory:

```bash
python -m http.server 8000 --directory web
# or
npx http-server web -p 8000
```

Or just open `web/index.html` directly -- the app handles `file://` protocol via XMLHttpRequest fallback.

## Architecture

```
seasonal-produce/
├── data/                    # CSV data layers
│   ├── produce_items.csv    # What exists (ontology)
│   ├── regions.csv          # Where it grows (geography)
│   ├── produce_seasons.csv  # When it's harvested (seasonality)
│   └── compiled.json        # Compiled output
├── input/                   # Original input files
├── reference/               # Design direction docs
├── scripts/
│   ├── compile_data.py      # CSV -> JSON compiler
│   └── validate_data.py     # Data validation + coverage
└── web/
    ├── index.html           # Main app
    ├── compact.html         # Compact/legacy view
    ├── style.css            # All styles
    ├── app.js               # All application logic
    └── data.json            # Compiled data (copy of compiled.json)
```
