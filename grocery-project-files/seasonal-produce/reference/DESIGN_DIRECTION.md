# Design Direction — Paste Into CLAUDE.md Phase 2

Replace everything between "## Phase 2: Frontend — The Beautiful Part" and "## Phase 3: Polish and Verify" with the content below.

---

## Phase 2: Frontend — The Beautiful Part

### Design References & Philosophy

The visual design blends two references:

**Reference A — Color & Mood (Stoumann geometric harvest composition):**
An earthy, organic color palette against a dark teal background. The key colors are:
- Background: dark teal `#224443`
- Rust: `#CB5207`
- Deep rust: `#AE3E09`
- Dark gold: `#D98106`
- Bright gold: `#F29A0D`
- Sun gold: `#F8A611`
- Cream: `#F0C67C`
- Bright orange: `#CF6600`
- Red-brown: `#9F350D`
- Deep red: `#8D2A0D`
- Gold-orange: `#F0980F`
- Dark green: `#1D3C35`
- Leaf green: `#2A5130`
- Deep forest: `#14311F`
- Near-black panel: `#202020`

The feel is warm, autumnal, botanical — like a vintage seed catalog printed on dark paper. Organic shapes (CSS clip-paths, border-radius variations) are preferred over sharp rectangles.

**Reference B — Interaction & Structure (Mattjuggins circular calendar):**
A circular calendar built with concentric rotating rings on a dark background. Key mechanics:
- Concentric rings where each ring represents a data dimension (month, day, category)
- Rings rotate to highlight the current selection, with curved text around the circumference
- Staggered fade-in reveal animation — outer ring animates first, then middle, then inner, each with a 500ms delay
- Highlighted segments glow in an accent color while unselected segments stay muted
- Side widgets show supplementary data (counts, stats)
- Everything sits on a dark surface with subtle box-shadows creating depth

### The Concept: Ring Navigator + Produce Stream

The app has two zones:

**ZONE 1 — The Ring (top, hero element):**
A circular month-selector ring, visually inspired by the Mattjuggins calendar. This is NOT a full concentric multi-ring clock — it's simplified to a single prominent ring divided into 12 month segments. Think of it as a circular month scrubber.

- The ring sits centered at the top of the page
- 12 segments, each labeled with a month abbreviation (J, F, M, A, M, J, J, A, S, O, N, D)
- The current/selected month segment is highlighted in sun gold (`#F8A611`) with a subtle glow
- Adjacent months fade to warm gold, then to muted dark gold, creating a warmth gradient radiating from "now"
- Out-of-view months are dark (`#1D3C35`)
- A subtle outer ring border in cream (`#F0C67C`) at low opacity provides structure
- Inside the ring center: a large count number (e.g., "47") with small text below ("in season") and a secondary line ("18 at peak") — rendered in cream on the dark teal center
- Tapping/clicking a month segment rotates the highlight and updates everything below
- The ring should animate on load: segments stagger in from transparent to their final color, clockwise from January, ~40ms per segment

**Ring implementation approach:**
Build the ring with 12 absolutely-positioned elements arranged in a circle using `transform: rotate(Ndeg) translateY(-Rpx)` for each segment, or use a single SVG circle with 12 arc segments. SVG arcs are probably cleaner. Each segment is a `<path>` with a click handler. The selected state applies the gold fill and a CSS filter glow.

Ring size: ~280px diameter on mobile, ~350px on desktop. It should feel substantial but not dominate the full viewport.

**ZONE 2 — The Stream (below the ring):**
A scrollable list/timeline of produce items, filtered and sorted based on the selected month. This is where the data lives.

Two sub-views, togglable:

**View A — Season Bars (default):**
Each produce item is a row with:
- Left column (fixed, ~140px): emoji + name, rendered in cream text
- Right area (scrollable): a 12-month horizontal bar chart
  - Thin horizontal track (2-3px, dark) spanning all 12 months
  - Colored bar segments where the item is in season
  - Peak months are full opacity; available-but-not-peak months are ~40% opacity
  - The selected month has a subtle vertical highlight line across all rows (the "now" line) in sun gold at ~20% opacity
  - Bar colors use the Stoumann palette mapped to produce categories:
    - Citrus → sun gold `#F8A611`
    - Berry → deep red `#8D2A0D`
    - Stone fruit → rust `#CB5207`
    - Pome fruit → gold-orange `#F0980F`
    - Tropical → bright orange `#CF6600`
    - Leafy green → leaf green `#2A5130`
    - Brassica → dark green `#1D3C35`
    - Root/tuber → deep rust `#AE3E09`
    - Allium → red-brown `#9F350D`
    - Legume → dark gold `#D98106`
    - Cucurbit → bright gold `#F29A0D`
    - Stem/stalk → muted teal `#2A5130` at 60% opacity
    - Chile pepper → deep red `#8D2A0D`
    - Herb → `#376c3f` (the green from Stoumann's gradient)
    - Mushroom → `#5C4033` (warm brown, derive from palette)
    - Nut → cream `#F0C67C` at 70% opacity
  - Local produce bars are solid fills
  - Import produce bars use a diagonal stripe pattern (repeating-linear-gradient at 45deg, alternating the color with transparent at 3px intervals)
- Row height: ~36-40px
- Rows are sorted: peak items first → in-season items → coming next month → out of season (dimmed or hidden)
- Items with both local and import seasons show both bars, the import bar slightly below the local bar within the same row, with a small "import" label in 10px text

**View B — Grid Cards:**
A card grid showing only items currently in season for the selected month.
- Cards are ~160px wide, arranged in a responsive CSS grid
- Each card: dark panel background (`#202020`), subtle box-shadow (like the Mattjuggins side-rings), rounded corners (8px)
- Card content: emoji large (24px), name in cream below, a tiny 12-month sparkline bar at the bottom of the card showing the full season, category color as a thin left border accent
- Cards that are at peak get a subtle gold border or glow
- Cards animate in with a staggered fade (like the Mattjuggins ring reveal sequence)

### Item Detail Panel

Tapping a produce item (in either view) opens a detail panel. On mobile, this slides up from the bottom as a sheet over the dark background. On desktop, it expands inline or appears as a side panel.

Style the panel like the Mattjuggins side-ring widgets:
- Dark background (`#202020`)
- Rounded corners, subtle box-shadow (`0px 2px 2px #000`)
- Content in cream/gold text
- A mini circular badge (like the small side-rings) showing the category color

Panel contents:
- Name + emoji (large)
- Category label in small caps, colored with category color
- A 12-month season bar (larger version, ~16px tall) showing all season entries for this item
- For each season entry: region name, source type (local/import), month range in text
- Notes paragraph (if available) in cream text at ~14px
- Storage tip in slightly muted text
- Close button (X) in the top right

### Typography

Load from Google Fonts. Dark backgrounds need strong typographic contrast.

**Heading font:** Something with character that works on dark backgrounds. Consider:
- **Anybody** (variable, wide range of weights — can go from elegant to bold)
- **Syne** (geometric, distinctive, good for dark themes)
- **Space Mono** (monospace with personality, echoes the Mattjuggins Roboto Mono)
- **Familjen Grotesk** (warm, slightly quirky)

Pick ONE. Use it for the ring labels, the count number in the ring center, section headers, and produce item names.

**Body font:** A clean, readable sans for metadata, descriptions, and small labels:
- **DM Sans**, **Karla**, or **Outfit**

Pick ONE that pairs well with your heading choice.

Text colors:
- Primary text: cream `#F0C67C`
- Secondary text: `#F0C67C` at 60% opacity
- Accent text (counts, highlights): sun gold `#F8A611`
- Muted text (out-of-season items): `#F0C67C` at 30% opacity

### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            Seasonal Produce                      │
│             California                           │  ← Heading in cream,
│                                                  │     centered, minimal
│         ┌─────────────────┐                      │
│        /  J   F   M   A   \                      │
│       │ D    ┌──────┐  M   │                     │
│       │      │  47  │      │                     │  ← The Ring
│       │ N    │  in  │  J   │                     │
│       │      │season│      │                     │
│        \ O   └──────┘  J  /                      │
│         \   S   A       /                        │
│          └─────────────┘                         │
│                                                  │
│   [Search ___________________________]           │  ← Search bar, dark
│                                                  │     input on darker bg
│   ┌──────┐ ┌──────┐ ┌──────┐                     │
│   │Fruit │ │ Veg  │ │ All  │  [Local] [Import]   │  ← Filter chips
│   └──────┘ └──────┘ └──────┘                     │     dark panels with
│                                                  │     gold text/border
│   ┌─ Bars ─┐ ┌─ Grid ─┐                         │  ← View toggle
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│   J F M A M J J A S O N D                       │  ← Month labels
│            ┃                                     │     (sticky, muted)
│   🍓 Strawberry ████████░░░                      │
│   🍋 Meyer Lemon ░░████░░░                       │  ← Season bars
│   🥑 Avocado (CA) ██████░░░                      │     on dark rows
│   🥑 Avocado (MX) ╌╌╌╌╌╌╌╌╌╌                    │     import = striped
│   🩸 Blood Orange ████░░                         │
│   ...                                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Color System (CSS Custom Properties)

```css
:root {
  /* Backgrounds */
  --bg-body: #224443;
  --bg-panel: #202020;
  --bg-panel-hover: #2a2a2a;
  --bg-input: #1a1a1a;

  /* Text */
  --text-primary: #F0C67C;
  --text-secondary: rgba(240, 198, 124, 0.6);
  --text-muted: rgba(240, 198, 124, 0.3);
  --text-accent: #F8A611;

  /* Ring & highlight */
  --ring-active: #F8A611;
  --ring-adjacent: #D98106;
  --ring-inactive: #1D3C35;
  --ring-border: rgba(240, 198, 124, 0.15);
  --now-line: rgba(248, 166, 17, 0.2);

  /* Category colors */
  --color-citrus: #F8A611;
  --color-berry: #8D2A0D;
  --color-stone-fruit: #CB5207;
  --color-pome: #F0980F;
  --color-tropical: #CF6600;
  --color-leafy-green: #2A5130;
  --color-brassica: #1D3C35;
  --color-root: #AE3E09;
  --color-allium: #9F350D;
  --color-legume: #D98106;
  --color-cucurbit: #F29A0D;
  --color-stem: rgba(42, 81, 48, 0.6);
  --color-chile: #8D2A0D;
  --color-herb: #376c3f;
  --color-mushroom: #5C4033;
  --color-nut: rgba(240, 198, 124, 0.7);

  /* Shadows & effects */
  --shadow-ring: 0px 2px 4px rgba(0, 0, 0, 0.5);
  --shadow-panel: 0px 2px 2px #000;
  --glow-active: 0 0 12px rgba(248, 166, 17, 0.3);
}
```

### Animations

Follow the Mattjuggins staggered reveal pattern:

**Page load sequence (orchestrated, not simultaneous):**
1. **0ms:** Title fades in from opacity 0 → 1 (300ms ease)
2. **200ms:** Ring segments stagger in clockwise, 12 segments × 40ms = 480ms total. Each segment fades from `--ring-inactive` to its target color
3. **700ms:** Ring center count number fades in, scales from 0.8 → 1.0
4. **900ms:** Search bar and filter chips slide up with fade (200ms)
5. **1100ms:** Produce rows/cards cascade in, 20ms stagger per item, max ~40 items visible

This creates a satisfying "the data is assembling itself" feeling, like the Mattjuggins clock coming to life.

**Interactions:**
- Month selection: ring highlight slides smoothly (CSS transition, 300ms ease-out on fill/opacity). The count number in the center crossfades to the new value.
- Filter toggle: items that exit fade out (150ms), remaining items slide into new positions (200ms), new items fade in (150ms). Use CSS transitions on `transform` and `opacity`.
- View toggle (bars ↔ grid): crossfade between views (200ms).
- Detail panel: slides up from bottom on mobile (300ms cubic-bezier), fades in on desktop (200ms).

### Mobile Specifics (<768px)

- Ring: 280px diameter, centered, with comfortable touch targets on each month segment (~45px arc length)
- Below the ring: search and filters are full-width
- Season bars view: the month label row is sticky. The produce name column is ~120px. The bar area scrolls horizontally.
- Grid view: 2 columns of cards
- Detail panel: bottom sheet style, covering ~70% of viewport height, with a drag handle at top

### Desktop Specifics (>1024px)

- Ring: 350px diameter
- Layout can be wider: ring centered in a header area, produce stream below in a max-width container (~1200px)
- Season bars view: more generous name column (~180px), bars are wider
- Grid view: 4-5 columns of cards
- Hover states: ring segments brighten slightly on hover. Produce rows get a subtle `--bg-panel-hover` background. Bar segments show a tooltip with item name + month range.
- Detail panel: inline expansion or right-side panel

### Search & Filters

**Search input:** Dark background (`--bg-input`), no visible border, cream placeholder text at 40% opacity. Cream text when typing. A subtle bottom border in `--ring-border` color. No magnifying glass icon — keep it clean.

**Filter chips:** Small dark panels (`--bg-panel`), cream text, 1px border in `--ring-border`. Active state: gold text (`--text-accent`) with gold border. These should feel like small versions of the Mattjuggins side-ring panels.

Categories to show as filter chips:
- `Fruit` `Vegetable` `Chile` `Herb` `Mushroom` `Nut` (top-level categories)
- `Local` `Import` (source filter)

### What Good Looks Like

The app should feel like a **dark, warm, living almanac** — something between an astronomical instrument and a botanical illustration. The dark teal background should make the gold and rust produce data feel like it's glowing from within. The ring should feel mechanical and satisfying, like turning a brass dial. The overall impression should be: "someone designed this with intention."

### What Bad Looks Like

- Light/white backgrounds (WRONG — this is a dark-theme design)
- iOS-bright blues and pinks from the Mattjuggins palette (WRONG — use only the Stoumann earth tones)
- A literal copy of either CodePen (WRONG — blend the mood of one with the mechanics of the other)
- Rainbow category colors that fight each other (WRONG — the palette is intentionally warm/earth-toned, greens are muted)
- Flat 2D elements with no depth (WRONG — use box-shadows, subtle glows, and the panel-on-dark layering from Mattjuggins)
- Generic sans-serif typography on a plain background (WRONG — this should have character)
- Excessive animation on every element (WRONG — animate the load sequence and month transitions, then let the data be still and readable)

### Performance Notes

- The ring is 12 SVG paths or 12 positioned divs. Lightweight.
- Season bars are simple div elements with background colors. No canvas needed.
- The compiled.json is <100KB. Loaded once.
- All filtering, sorting, and search is client-side in memory.
- Debounce search at 150ms.
- Use `will-change: transform` only on elements that actively animate (ring segments during month change, items during filter transitions).
- No external JS libraries. No jQuery. Vanilla JS only.
- Fonts: 2 weights of each Google Font, loaded with `display=swap`.
