# Lessons Learned

Development notes to avoid repeating mistakes. Updated as issues surface.

---

## Ring Navigator

### Ring Centering (the -15deg offset)

**Problem:** The ring rotation formula `-(month-1)*30` puts the month segment's START edge at 12 o'clock, not the segment's center. Each segment spans 30 degrees, so the center is 15deg clockwise from the start.

**Fix:** Use `-(month-1)*30 - 15` for all ring rotation calculations (initial angle in `buildRing()` and target angle in `updateRing()`).

**Tick mark:** With the segment centered, the tick mark formula becomes `(dayFraction - 0.5) * 30` degrees from 12 o'clock. Day 1 sits near the left edge of the segment, last day near the right edge, and mid-month is dead center.

### Ring Rotation — Shortest Path

All three rings use shortest-path rotation to avoid full 360-degree spins when wrapping (Dec -> Jan). The formula:
```js
var diff = targetBase - currentAngle;
diff = ((diff % 360) + 540) % 360 - 180;
currentAngle = currentAngle + diff;
```
This accumulates absolute rotation (can exceed 360) rather than clamping, which ensures CSS transitions always take the short way around.

### Concentric Ring Dimensions

Outer, middle, and inner rings have specific radii tuned so labels are readable and touch targets are adequate:
- Outer (months): r=140/108, 30deg segments, 2.5deg gap
- Middle (category+source): r=98/80, 38deg segments, 2deg gap, 9 items
- Inner (status): r=72/58, 85deg segments, 5deg gap, 4 items

These are fragile -- changing one ring's radii can cause label overlap or collision with adjacent rings.

---

## Data Model

### Dual-Source Items Are Not Bugs

Items like Avocado, Bell Pepper, and Cactus Pad legitimately have BOTH local California AND import season entries. This is accurate: California avocados peak Apr-Jul while Mexican avocados fill the rest of the year. The timeline correctly shows two stacked bars (local on top, import below).

If a user reports "this item says it's both local and imported" -- that's the data working correctly, not a bug.

### Season Month Wrapping

Season data that crosses the year boundary (e.g., Nov-Mar) is stored as a flat array `[11, 12, 1, 2, 3]`. The `buildSegments()` function in app.js splits these into contiguous chunks for rendering, so Nov-Mar renders as two separate bar segments (Nov-Dec and Jan-Mar).

### Coverage

Current dataset coverage is 208 of 335 produce items (~62.1% coverage). The remaining items exist in `produce_items.csv` but have no entries in `produce_seasons.csv`. The app excludes items with no season data from all views.

---

## Visual Design

### Local and Import Bars Are Visually Identical

Early versions used diagonal stripes + dashed borders + reduced opacity to distinguish imports from local. This was removed -- all bars now use the same solid fill treatment. The only distinction is the text label on dual-source rows: "CA" for local, origin region name (e.g., "Mexico", "South America") for imports. The hover tooltip shows the full region name (e.g., "Sinaloa").

### Peak vs. Shoulder Is the Only Visual Signal on Bars

Timeline bars encode one dimension:
- **Bright** = peak season (full opacity + brightness boost)
- **Muted** = shoulder season / available but not peak (35% opacity)

### Month Range Display Wrapping

`monthRangeText()` detects year-wrapping ranges by finding the largest gap between consecutive sorted months. If the internal gap exceeds the wrap-around gap (Dec->Jan), the range wraps. Example: peak months `[1, 10, 11, 12]` sorts to `[1, 10, 11, 12]` with a gap of 9 between 1 and 10, but only 1 for the wrap (12->1). So the display is "Oct -- Jan", not "Jan -- Dec".

### Tooltip Hover Targets

Tooltips on timeline bars must target `.season-bar:hover > .bar-tooltip`, NOT `.timeline-row:hover .bar-tooltip`. The row-level hover shows ALL tooltips for both bars simultaneously in dual-source rows, which looks broken.

### Timeline Name Column Must Be Opaque

The `.timeline-name` column is `position: sticky; left: 0` and scrolls horizontally with bars behind it. It MUST use an opaque background (`--bg-panel`) rather than `--bg-body`. Using the body color causes bars to bleed through because the background composition shapes (stoumann decor) shift the effective color.

### Category Color Left Borders

Adding a 3px left border in the produce category color to `.timeline-name` elements dramatically improves scanability. Without it, the only color information is in the bars (which may be off-screen). The border creates a color-coded index tab effect.

### Background Composition (Stoumann Shapes)

The warm off-white background becomes layered by adding 4 fixed-position divs with CSS `clip-path`, warm colors (#D4702C, #CB5207, #8D2A0D, gold-green), and very low opacity (3-4%). Use `filter: blur()` on most shapes so they feel like colored light rather than sharp geometric blocks. `position: fixed; z-index: -1; pointer-events: none`.

### Ring Bezel Circles

The SVG helper attached to `#ring-leaf-decor` currently renders thin bezel circles between rings, not botanical leaf shapes. If decorative foliage returns later, document it separately from these structural dividers.

### Ring Section Radial Gradient

A subtle radial gradient on `.ring-section` with warm tones (e.g., `rgba(203, 82, 7, 0.06)`) creates a spotlight effect that makes the ring feel elevated and precious, breaking the flat monotone.

---

## Performance

### DOM Recycling vs. Virtualization

The original `renderTimeline()` rebuilt the entire DOM on every call. At ~335 items this caused visible jank on filter/month changes. Full virtualization (intersection observers, scroll-position-aware row pool) was considered but rejected -- the dataset is small enough that keeping all rows in the DOM is fine. Instead, timeline rows are recycled via slug-keyed maps (`_tlActiveDataRows`, `_tlActiveNoDataRows`). Rows are created once per slug, then shown/hidden/reordered. The header, now-line, and no-data divider are persistent singletons. This eliminated the DOM allocation cost without the complexity of a virtual scroll system.

### Cache Invalidation Strategy

Caches split into two tiers based on what invalidates them:
- **Data caches** (never change after load): sourceTypes, seasonLength, yearRound, originGroups, hasLocalSeason, earliestPeakMonth. These derive from the static season dataset and are computed once.
- **Per-month caches** (keyed by month index): status classification (peak/available/none), comingSoon, leavingPeak. Invalidated automatically when the selected month changes. Subsequent calls within the same month (e.g., filtering, sorting) hit the cache.

This avoids recomputing status for every item on every filter change while keeping month transitions correct.

### Preload Credential Mode Matching

`<link rel="preload" as="fetch">` for `data.json` requires `crossorigin="anonymous"` to match the fetch request's credential mode. Without it, the browser treats the preloaded resource as a different request and fetches it again, defeating the preload entirely. No console error -- it silently double-fetches.

### content-visibility for Offscreen Rows

`content-visibility: auto` on `.timeline-row` tells the browser to skip layout and paint for offscreen rows. This is essentially free performance -- no JS needed, no intersection observers, just a CSS property. The browser still reserves vertical space via `contain-intrinsic-size` so scroll height stays correct. One caveat: if row heights vary dynamically (e.g., expanding detail within a row), you need accurate `contain-intrinsic-size` or scrollbar jitter occurs.

### Now-Line Position Is Proportional

`getNowPosition()` computes a fractional position within the month: `(day - 1) / daysInMonth`. This means the now-line moves daily, not monthly. It accounts for months with different day counts (28 vs. 31).

---

## CSS

### Paper Grain Texture

The body::after pseudo-element renders an SVG noise pattern at 3.5% opacity. It's `position: fixed` with `z-index: 9999` and `pointer-events: none`. The high z-index is intentional -- it sits above everything as a texture overlay. Don't reduce the z-index or it disappears behind content.

### prefers-reduced-motion

The reduced-motion media query forces all animated elements to `opacity: 1` and disables all transitions/animations. This covers: site title, ring segments (all three rings), ring center, controls bar, and timeline rows.

---

## File Protocol Support

The app works when opened as `file://` (no server). `loadData()` detects `window.location.protocol === 'file:'` and uses XMLHttpRequest instead of fetch, because fetch doesn't work with file:// in most browsers.

---

## Ring Center Display

The center text shows: month label (small caps), today's date or month name (medium), peak count + "in peak" (bold number), in-season count + "in season" (bold number). When viewing a non-current month, the date line shows just the month name instead of a specific date.

The center `width: 105px` is tightly constrained to fit inside the inner ring (r=58). Don't add long text or increase font sizes without checking overflow.

---

## Year-Round Item Filtering

Items where ALL season entries span all 12 months AND have no peak differentiation (no peak months at all) are hidden from the default browse view. They appear when searched. This keeps always-available items such as bananas, plantains, coconuts, and similar year-round imports from cluttering the seasonal view.

Items with peak month subsets (e.g., pineapple with peak [3-7], rosemary with season=[1-12] but peak=[1-12]) remain visible because they still have seasonal quality variation worth highlighting.

The check is in `isYearRound()` in `app.js`. It returns true only when every season entry for an item has `seasonMonths.length === 12` AND zero peak months. Items with any peak data (even peak covering all months, like cultivated mushrooms) remain visible.

---

## Integration with Parent Site

The seasonal produce app is integrated into the parent site (`SpacemanSpiff7.github.io`) via `data/projects.json`:
- Featured section: `featured-seasonal-produce` with `defaultBlob` shape and `#4A9068` blob color, positioned after CurlBro
- Workbench: project entry with action URL `grocery-project-files/seasonal-produce/web/index.html`

The app's `web/` directory is self-contained and works standalone.
