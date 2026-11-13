# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Before adding, editing, previewing, or publishing a blog post, read
`docs/blog-publishing.md` for the paste-to-agent workflow and content schema.
The blog uses Eleventy at build time; run `npm ci` on a fresh checkout.
`npm run dev` previews drafts, `npm run preview` previews production content,
and `npm run build` produces the reviewed `_site/` artifact.

This static GitHub Pages site publishes the reviewed `_site/` artifact through
`.github/workflows/pages.yml` on pushes to `master`. Build that artifact before
previewing or publishing; its manifest excludes internal and retired files.

### Python Usage
- Always use `python` (not `python3`) and run through a virtual environment (venv).

### Local Development
```bash
# Build the exact public artifact first
node scripts/build-site.mjs

# Serve using Python from a virtual environment
python -m http.server 8000 --directory _site

# Or using Node.js (if you have http-server installed)
npx http-server _site -p 8000

# Or using PHP
php -S localhost:8000 -t _site
```

### Git Workflow
```bash
# Validate locally before committing; push when the user requests publication
node --test scripts/test-site-build.mjs
node --test worker/tests/*.test.js
node scripts/verify-blob-shapes.js
node scripts/verify-blob-motion.js
node scripts/build-site.mjs
```

### Cache Busting
JavaScript files use version query strings for cache busting.
When modifying `js/animations.js`, `js/main.js`, `js/blob-shapes.js`, or `js/blob-motion.js`:
1. Make your code changes
2. Increment the version number in index.html (e.g., `?v=4` → `?v=5`)
3. Update all references: `main.js` has 2 (preload hint + script tag); the other modules each have 1 script tag
4. Commit and push together

When modifying `js/analytics.js`:
1. Make your code changes
2. Increment the version number across all 14 HTML pages that reference it (e.g., `?v=1` → `?v=2`)
3. Pages: `index.html`, 7 files in `tools/`, `fakejira/index.html`, `fakejira/guide.html`, `traffic-therapy/index.html`, 2 files in `grocery-project-files/seasonal-produce/web/`
4. Do NOT modify `curlbro/index.html` — it has its own GA4 setup

This ensures users get fresh JavaScript immediately after deployment.

## Architecture Overview

### Current Design
- **Scroll-snap single page** with animated backgrounds
- **Fixed canvas layers**: starfield + 3D blob share one visibility-aware loop in `js/animations.js`, with capped HiDPI scaling and quadratic curve wireframes
- **Dynamic content**: All non-hero sections driven by `homepage` registry in `data/projects.json`
- **Shape presets**: continuous surfaces in `js/blob-shapes.js` share one sphere grid
- **Scroll morphs**: `js/blob-motion.js` samples section anchors so shape and color follow scroll position in either direction
- **Grouped nav**: Nav links generated from `homepage.groupOrder` with hover-to-expand subnav (desktop) / accordion subnav (mobile)
- **Motion preferences**: reduced motion renders on interaction or layout changes; hidden tabs pause the shared loop
- **Bottom controls**: shape/style/star controls retain saved appearance preferences and the rainbow cloud easter egg
- **Modular CSS**: Split into tokens, base, components, and responsive files

### Key Files
| File | Purpose |
|------|---------|
| `index.html` | Main page with hero section inline, all other sections rendered dynamically |
| `css/tokens.css` | CSS custom properties (design system tokens) |
| `css/base.css` | Reset, typography, containers, buttons, cards |
| `css/components.css` | Nav, hero, sections, scroll-snap, bottom controls, subnav dropdown |
| `css/responsive.css` | Media queries, reduced motion, print styles, mobile subnav accordion |
| `css/style.css` | Import wrapper for all CSS (used by tools) |
| `js/analytics.js` | Shared GA4 module: Consent Mode v2, content grouping, `sa()` event helper (loaded on 14 pages, NOT CurlBro) |
| `js/blob-shapes.js` | Shape preset registry (`window.BLOB_SHAPES`) of shared-grid surfaces |
| `js/blob-motion.js` | Pure section-anchor sampling for reversible scroll morphs |
| `js/main.js` | Config reader, section renderers, `LINK_SETS`, grouped nav builder, progress indicator |
| `js/animations.js` | Shared starfield/blob loop, surface buffers, scroll morphs and drag rotation |
| `components/nav.html` | Navigation shell (logo + hamburger + empty container; links built by JS) |
| `data/projects.json` | Single source of truth for projects and homepage layout (`homepage` registry) |

### Section Structure
All non-hero sections are defined in `data/projects.json` under `homepage.sectionOrder`:
1. **Hero** - Name + title (static HTML)
2. **Featured projects** - Sections of type `projectFeature`, rendered from JSON
3. **Blog** - Latest generated posts (type: `postList`); navigation opens `/blog/`
4. **About** - Bio section (type: `text`, rendered from JSON)
5. **Contact** - Contact info (type: `linkList`, rendered from JSON)
6. **Projects Grid** - Workbench (hardcoded terminal section)

### Typography

| Usage | Font Family | Fallbacks |
|-------|------------|-----------|
| Titles / Headings | Silkscreen | 'Courier New', monospace |
| Body copy / Section text | IBM Plex Mono | monospace |
| UI / System text | Inter | -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif |
| Blob system labels | Audiowide | -- |

### Data-Driven Configuration

**Single Source of Truth**: `data/projects.json`
- `homepage` registry controls all non-hero homepage sections, nav groups, and blob shape assignments
- `projects` array powers the workbench grid and is referenced by featured section configs
- **When adding projects/sections**: Update projects.json, not CLAUDE.md (see `data/README.md`)
- Contact link markup lives in `LINK_SETS` in `js/main.js` (code-owned, not in JSON)
- Shape presets live in `js/blob-shapes.js` as geometry functions (not in JSON)

### Homepage Stability Contract

Treat the homepage scroll system as an interaction contract, not cosmetic CSS.

- **The snap container is `.scroll-container`**. Do not move scrolling back to `body`/`html` without updating observers, nav clicks, progress dots, and mobile viewport logic together.
- **Snap sections are explicit**. `#hero`, dynamic featured sections, `#about`, and `#contact` use `.snap-section`. `#projects-grid` is the oversized final snap area and allows free scrolling through the workbench.
- **Viewport math is centralized**. `js/main.js` sets `--vh`; `css/tokens.css` owns `--nav-height`, `--bottom-chrome-height`, and `--snap-bottom-offset`. Do not re-hardcode those values elsewhere.
- **Section identity matters**. `js/main.js` now builds a shared section registry from `homepage.sectionsById` that drives section rendering, grouped nav, scroll highlighting, progress dots, blob color/shape transitions together. Keep those concerns unified.
- **Nav is config-driven**. `components/nav.html` is a shell. `js/main.js` populates nav links from `homepage.groupOrder` + `homepage.groupsById`. Sections with `showInSubnav: true` become subnav items. Do not hardcode nav links in `components/nav.html`.
- **Page links use `href`**. A nav group with `href` opens that page without the in-page scroll handler. Homepage history restoration runs after dynamic sections are available; preserve direct links such as `/#blog` and browser Back restoration.
- **Keep one scroll owner**. Avoid mixing CSS smooth scrolling, `scrollIntoView()`, touch handlers, and custom scroll math unless there is a clear reason.

### Section Layout Contract

Homepage section layout currently works in layers:

- Base snap sizing lives in `css/components.css` under `.snap-section`
- Mobile snap padding and title offsets live in `css/responsive.css`
- Hero is an explicit exception to the shared snap padding and uses an inner `.hero-content` wrapper for visible-area centering
- `#about` and `#contact` are explicit exceptions that vertically center their content group
- Featured sections are rendered by `js/main.js` with an inner `.featured-project-content` wrapper
- On mobile, `.featured-project-content` is the element that should be centered within the visible area between the fixed nav and bottom chrome
- `#projects-grid` is intentionally not a full-height centered snap section

If featured sections look off-center on mobile, adjust the featured wrapper sizing/centering first instead of adding more heading-specific margin overrides.

### Homepage Change Checklist

When changing homepage layout, navigation, or project ordering, verify all of the following before shipping:

1. Desktop wheel and trackpad snapping still land on intended section boundaries.
2. Mobile swipe scrolling still snaps cleanly with browser chrome expanded and collapsed.
3. Nav logo, nav links, and progress dots all scroll to the same targets.
4. Active nav state still matches the visible section during manual and programmatic scroll.
5. Shape and color follow the same scroll anchors, hold when scrolling stops, and reverse without jumps.
6. `#projects-grid` allows free scrolling and returns to the default blob, with position-driven rotation through the grid.
7. The "Top" button returns to hero and restores its shape and color.
8. Reduced motion keeps the scene visible while stopping ambient animation; hidden tabs pause rendering.
9. Run `docs/blob-regression.md` when changing the renderer, presets, or scroll sampler.
10. Verify control sliders, saved settings, reset, and rainbow activation/cancellation after renderer changes.

### Projects Data Contract

`data/projects.json` is the homepage content registry. Preserve this shape:

- Top-level keys: `homepage`, `featured` (deprecated), `featuredConfig` (deprecated), `projects`
- `homepage` contains `groupOrder`, `groupsById`, `sectionOrder`, `sectionsById` (see `data/README.md` for full schema)
- `projects` is the canonical array of project objects
- Each project should have `id`, `title`, `shortDescription`, and `actions`
- `hidden: true` removes a project from the workbench grid but does not prevent it from being featured
- Relative action URLs must resolve from the repository root, because `js/main.js` renders them directly into `index.html`
- `featured` and `featuredConfig` top-level keys remain in the file but are not read at runtime

Registry details:

- Derive project counts and featured order from `data/projects.json`
- Several metadata fields (`image`, `category`, `tags`, `description`) are only partially used by the current homepage renderer. Do not assume they are dead.
- Featured sections can define `blobColor` in `sectionsById` or inherit from the project's `blobColor`; if both are absent, `js/main.js` assigns a color from the featured palette
- Each section can specify a `shapeId` referencing a preset in `window.BLOB_SHAPES`

## Important Implementation Notes

### No Emojis Policy

- Do not use emojis anywhere on this website
- This includes code comments, UI elements, and generated content
- Use text or icons instead for visual indicators

### Shape Presets and Scroll Motion

Before changing a preset or its sampling, read **Continuous Shape Surfaces** in
`data/README.md`. It defines the topology, size, and scheduling contracts.
The live registry is `window.BLOB_SHAPES` in `js/blob-shapes.js`; section configs
select presets with `shapeId` in `data/projects.json`.

`js/main.js` emits `blobSectionsReady` after rendering the sections.
`js/animations.js` builds anchors from those elements and rebuilds them after
resize and font loading. `js/blob-motion.js` samples neighboring anchors
without direction history or timers. Shape and color use the same eased mix.
The workbench is the final anchor; scrolling through its grid keeps rotating
the default blob. Across the page, signed scroll impulses add spin with a smooth
coast/decay. Dragging on non-interactive content adds mouse rotation. Keep these
rotation inputs independent of the position-driven shape/color blend.

The renderer caches custom surfaces in shared vertex buffers. Its starfield and
blob share one loop, capped at 60 fps and 2x device pixel ratio. Reduced motion
uses still frames on scroll, drag, layout, or preference changes. The scene
pauses while the document is hidden. Section configuration provides the automatic
appearance; the bottom panel can override it. `blobSettings` stores appearance
preferences with compatibility for the original panel. Manual shape selection
and rainbow mode remain session-only; reset resumes the current section's shape
and color. The color slider's 1.6-second hold at maximum activates the rainbow
cloud. Preserve early-release cancellation, keyboard access, and reduced motion.

The standalone shape carousel has been retired.
`scripts/obj-to-preset.py` remains a legacy standalone wireframe exporter;
its `arbitraryMesh` output is incompatible with the current renderer, and its
`--inject` option refuses to modify the site. Author new `getPosition` surfaces
directly and run both blob verification scripts before previewing.

### LINK_SETS (Code-Owned Markup)

Contact and about link markup is defined in `LINK_SETS` in `js/main.js`, not in JSON. This keeps SVG icons and link attributes code-owned. Section configs reference link sets via `linkSetId` (e.g., `"aboutLinks"`, `"contactLinks"`).

### CSS Architecture

The CSS is split into modular files for easier maintenance:

- **tokens.css**: Design tokens (colors, typography, spacing, shadows, transitions)
- **base.css**: Reset, typography, containers, buttons, cards, utility classes
- **components.css**: Navigation, hero, sections, animations, scroll-snap, bottom controls
- **responsive.css**: Media queries, reduced motion, print styles

**For index.html**: Links all four CSS files directly for optimal loading.

**For tools**: Use `../css/style.css` which imports all modular files via `@import`.

### Standalone Tool Patterns

Tools in `/tools/` currently use two live navigation approaches:

**Pattern 1: SKIP_MAIN_SCRIPT + Standalone Nav** (2 tools)
- `la-collisions-dashboard.html`, `public-art-submission.html`
- Sets `window.SKIP_MAIN_SCRIPT = true` to prevent SPA component loading
- Fully standalone with their own navigation structure

**Pattern 2: Local nav/styles, No SKIP** (5 tools/pages)
- `guide.html`, `shopping-research.html`, `monte-carlo-sim-optimized.html`, `running-game.html`, `consulting-coming-soon.html`
- Some reuse `../css/style.css`; some define more page-specific structure inline

**Why different patterns?**: Performance optimization and standalone functionality requirements.

### LA Collisions Dashboard

**Purpose**: Interactive visualization of 620K+ LAPD collision records (2010-2021) with progressive loading and no backend.

**Architecture** (`tools/la-collisions-dashboard.html`, ~3,200 lines):
- **Map rendering**: MapLibre GL 3.6.2
- **Temporal analysis**: Chart.js 4.4.0
- **Spatial indexing**: RBush 3.0.1 (fast collision detection)
- **Data**: 303MB `data/la_traffic_collisions.json` -> 421 spatial tiles in `assets/collisions/tiles/*.json`
- **Pattern**: Uses `window.SKIP_MAIN_SCRIPT = true`, tile-based progressive loading

**When modifying**: Tiles are git-tracked. Regenerate with `scripts/preprocess-collisions.js` if source data changes.

### Google API Integration
One live tool in this repo integrates with Google services:

**Public Art Submission** (`tools/public-art-submission.html`):
- Integrates with Google Forms for submissions
- Uses Google Forms field IDs that must be configured
- Includes mobile camera/location features
- See `docs/PUBLIC_ART_SUBMISSION_README.md` for setup

### Interactive Tools

**Running Game** (`tools/running-game.html`): Browser-based game with localStorage high scores. See projects.json for details.

### Mobile Optimizations
- Touch-friendly 44px minimum touch targets
- iOS Safari specific viewport and input handling
- Camera integration with `capture="environment"`
- Image compression for mobile uploads

## File Organization

```
/
├── index.html              # Main page with all sections
├── css/
│   ├── tokens.css          # CSS custom properties (design tokens)
│   ├── base.css            # Reset, typography, containers, buttons, cards
│   ├── components.css      # Nav, hero, sections, scroll-snap, bottom controls
│   ├── responsive.css      # Media queries, reduced motion, print styles
│   └── style.css           # Import wrapper (for tools compatibility)
├── js/
│   ├── analytics.js        # Shared GA4 module (consent, config, event helper)
│   ├── blob-shapes.js      # Shape preset registry (window.BLOB_SHAPES)
│   ├── blob-motion.js      # Pure scroll-anchor sampler
│   ├── main.js             # Config reader, section renderers, grouped nav, progress
│   └── animations.js       # Starfield, 3D blob rendering, shape transitions
├── components/
│   └── nav.html            # Navigation bar (only component)
├── tools/                  # Standalone HTML tools and guide page
├── data/
│   ├── projects.json       # Source of truth for projects
│   └── la_traffic_collisions.json  # 303MB collision data
├── assets/
│   ├── favicon.svg
│   ├── images/             # All images (simone_pic.png, og-image.png, etc.)
│   └── collisions/tiles/   # 421 JSON tile files
├── scripts/
│   ├── obj-to-preset.py            # Legacy standalone wireframe exporter
│   ├── verify-blob-shapes.js       # Validate all shape presets load correctly
│   └── preprocess-collisions.js    # Collision tile data preprocessing
├── docs/                   # Setup guides for Google API tools
├── CNAME                   # GitHub Pages domain configuration
└── README.md               # Repository readme
```

## External Dependencies

**Map/Visualization Libraries**:
- MapLibre GL 3.6.2 - Collision dashboard map rendering
- Chart.js 4.4.0 - Temporal analysis charts
- RBush 3.0.1 - Spatial indexing for collision tiles

**Google APIs**:
- Forms (public-art-submission.html)

**Assets**:
- Google Fonts (Inter, Silkscreen, IBM Plex Mono)
- Unsplash + self-hosted images (mix)

## Projects Configuration

The site features are managed through `data/projects.json`:
- `projects` contains tools, games, applications, and archive links
- `homepage.sectionOrder` selects and orders the featured projects
- Each project has metadata: title, description, tech stack, links, and images
- **Source of truth**: projects.json (not CLAUDE.md - see `data/README.md`)

## GitHub Pages Configuration

- **Custom domain**: Configured via CNAME file (simonelongo.com)
- **Branch**: The GitHub Actions Pages workflow runs on pushes to `master`
- **HTTPS**: Enabled for security (required for geolocation API)
- **Build process**: `node scripts/build-site.mjs` produces `_site/` from the public manifest; only `_site/` is uploaded
