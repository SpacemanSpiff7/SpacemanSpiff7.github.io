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

As of initial build: 97 of 332 produce items have season data (~29% coverage). The remaining ~235 items exist in `produce_items.csv` but have no entries in `produce_seasons.csv`. The app excludes items with no season data from all views.

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

The flat dark teal background becomes warm and layered by adding 4-5 absolutely-positioned divs with CSS `clip-path`, warm colors (#CB5207, #F0C67C, #8D2A0D), and very low opacity (3-6%). Key: use `filter: blur()` on most shapes so they feel like colored light rather than sharp geometric blocks. `position: fixed; z-index: -1; pointer-events: none`.

### Leaf Embellishments Need Visible Opacity

The SVG leaf/botanical decorations behind the ring were initially at 2-6% opacity -- essentially invisible. They need 8-12% to register as design elements rather than rendering artifacts.

### Ring Section Radial Gradient

A subtle radial gradient on `.ring-section` with warm tones (e.g., `rgba(203, 82, 7, 0.06)`) creates a spotlight effect that makes the ring feel elevated and precious, breaking the flat monotone.

---

## Performance

### Timeline Re-renders Everything

`renderTimeline()` rebuilds the entire DOM on every call (search keystroke, filter change, month change). This is acceptable for ~100 visible items but would need virtualization at 500+. Current approach: no virtual scrolling, no DOM diffing, full rebuild.

### Now-Line Position Is Proportional

`getNowPosition()` computes a fractional position within the month: `(day - 1) / daysInMonth`. This means the now-line moves daily, not monthly. It accounts for months with different day counts (28 vs. 31).

---

## CSS

### Paper Grain Texture

The body::after pseudo-element renders an SVG noise pattern at 2% opacity. It's `position: fixed` with `z-index: 9999` and `pointer-events: none`. The high z-index is intentional -- it sits above everything as a texture overlay. Don't reduce the z-index or it disappears behind content.

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

## Integration with Parent Site

The seasonal produce app is integrated into the parent site (`SpacemanSpiff7.github.io`) via `data/projects.json`:
- Featured section: `featured-seasonal-produce` with `defaultBlob` shape and `#4A9068` blob color, positioned after CurlBro
- Workbench: project entry with action URL `grocery-project-files/seasonal-produce/web/index.html`

The app's `web/` directory is self-contained and works standalone.
