# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a static GitHub Pages site with no build process. Simply push to the `master` branch to deploy.

### Python Usage
- Always use `python` (not `python3`) and run through a virtual environment (venv).

### Local Development
```bash
# Serve locally using Python (Python 3)
python -m http.server 8000

# Or using Node.js (if you have http-server installed)
npx http-server -p 8000

# Or using PHP
php -S localhost:8000
```

### Git Workflow
```bash
# Standard workflow - site deploys automatically on push to master
git add .
git commit -m "Your commit message"
git push origin master
```

### Cache Busting
JavaScript files use version query strings for cache busting.
When modifying `js/animations.js`, `js/main.js`, or `js/blob-shapes.js`:
1. Make your code changes
2. Increment the version number in index.html (e.g., `?v=4` → `?v=5`)
3. Update all references: `main.js` has 2 (preload hint + script tag), `animations.js` has 1 (script tag only), `blob-shapes.js` has 1 (script tag only)
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
- **Fixed canvas layers**: starfield + 3D morphing blob (js/animations.js) with HiDPI scaling and quadratic curve wireframe
- **Dynamic content**: All non-hero sections driven by `homepage` registry in `data/projects.json`
- **Shape presets**: Per-section wireframe shapes via `js/blob-shapes.js` (10 shapes: defaultBlob, curlbroDumbbell, and 8 OBJ-sourced arbitrary meshes)
- **3D shape carousel**: `#blob-showcase` is a tall virtual-scroll section that cycles through all shape presets with scroll-driven rotation and horizontal slide transitions
- **Grouped nav**: Nav links generated from `homepage.groupOrder` with hover-to-expand subnav (desktop) / accordion subnav (mobile)
- **Control panel**: 13-slider control panel with 3 collapsible sections (Shape, Style, Stars), hue override, rainbow easter egg, and per-shape control gating
- **Modular CSS**: Split into tokens, base, components, and responsive files

### Key Files
| File | Purpose |
|------|---------|
| `index.html` | Main page with hero section inline, all other sections rendered dynamically |
| `css/tokens.css` | CSS custom properties (design system tokens) |
| `css/base.css` | Reset, typography, containers, buttons, cards |
| `css/components.css` | Nav, hero, sections, scroll-snap, control panel, subnav dropdown |
| `css/responsive.css` | Media queries, reduced motion, print styles, mobile subnav accordion |
| `css/style.css` | Import wrapper for all CSS (used by tools) |
| `js/analytics.js` | Shared GA4 module: Consent Mode v2, content grouping, `sa()` event helper (loaded on 14 pages, NOT CurlBro) |
| `js/blob-shapes.js` | Shape preset registry (`window.BLOB_SHAPES`) with 10 presets (defaultBlob, curlbroDumbbell, + 8 OBJ-sourced meshes) |
| `js/main.js` | Config reader, section renderers, `LINK_SETS`, grouped nav builder, progress indicator, carousel layout trigger |
| `js/animations.js` | Starfield, 3D blob rendering, shape transitions, carousel system, control panel + gating |
| `components/nav.html` | Navigation shell (logo + hamburger + empty container; links built by JS) |
| `data/projects.json` | Single source of truth for projects and homepage layout (`homepage` registry) |

### Section Structure
All non-hero sections are defined in `data/projects.json` under `homepage.sectionOrder`:
1. **Hero** - Name + title (static HTML)
2. **Featured 1-4** - Featured projects (type: `projectFeature`, rendered from JSON)
3. **About** - Bio section (type: `text`, rendered from JSON)
4. **Contact** - Contact info (type: `linkList`, rendered from JSON)
5. **Projects Grid** - Workbench (hardcoded terminal section)
6. **Blob Showcase** - 3D shape carousel (hardcoded terminal section, tall virtual-scroll zone)

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
- **Snap sections are explicit**. `#hero`, dynamic featured sections, `#about`, and `#contact` use `.snap-section`. `#projects-grid` is the free-scroll workbench section. `#blob-showcase` has `scroll-snap-align: start` but NOT `.snap-section` — its height is set dynamically by the carousel system in `js/animations.js`.
- **Viewport math is centralized**. `js/main.js` sets `--vh`; `css/tokens.css` owns `--nav-height`, `--bottom-chrome-height`, and `--snap-bottom-offset`. Do not re-hardcode those values elsewhere.
- **Section identity matters**. `js/main.js` now builds a shared section registry from `homepage.sectionsById` that drives section rendering, grouped nav, scroll highlighting, progress dots, blob color/shape transitions together. Keep those concerns unified.
- **Nav is config-driven**. `components/nav.html` is a shell. `js/main.js` populates nav links from `homepage.groupOrder` + `homepage.groupsById`. Sections with `showInSubnav: true` become subnav items. Do not hardcode nav links in `components/nav.html`.
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
5. Blob color transitions still change at the intended sections.
6. `#projects-grid` still allows free scrolling and does not trap the user in a snap loop.
7. The `glowy-blob-ball` CTA still reaches `#blob-showcase`.
8. Shape presets morph correctly when scrolling between sections (e.g. sphere to dumbbell on CurlBro).
9. Control panel sliders gate correctly per shape (noise/morph disabled on custom shapes).
10. Run the blob-specific checks in `docs/blob-regression.md` when changing `js/animations.js` or `js/blob-shapes.js`.
11. Carousel: scroll into blob-showcase and verify shapes cycle with rotation + horizontal slide transitions.
12. Carousel: scroll back up from carousel and verify the blob restores to the correct shape/color for the visible section.
13. Carousel: click "Top" button and verify it scrolls to top and blob restores to default.
14. Carousel: on mobile, verify shapes are proportionally sized (not oversized at desktop radius).

### Projects Data Contract

`data/projects.json` is the homepage content registry. Preserve this shape:

- Top-level keys: `homepage`, `featured` (deprecated), `featuredConfig` (deprecated), `projects`
- `homepage` contains `groupOrder`, `groupsById`, `sectionOrder`, `sectionsById` (see `data/README.md` for full schema)
- `projects` is the canonical array of project objects
- Each project should have `id`, `title`, `shortDescription`, and `actions`
- `hidden: true` removes a project from the workbench grid but does not prevent it from being featured
- Relative action URLs must resolve from the repository root, because `js/main.js` renders them directly into `index.html`
- `featured` and `featuredConfig` top-level keys remain in the file but are not read at runtime

Current reality:

- There are **11** projects in `data/projects.json`
- There are **4** featured projects (defined in `homepage.sectionOrder` as `projectFeature` sections)
- Several metadata fields (`image`, `category`, `tags`, `description`) are only partially used by the current homepage renderer. Do not assume they are dead.
- Featured sections can define `blobColor` in `sectionsById` or inherit from the project's `blobColor`; if both are absent, `js/main.js` assigns a color from the featured palette
- Each section can specify a `shapeId` referencing a preset in `window.BLOB_SHAPES`

## Important Implementation Notes

### No Emojis Policy

- Do not use emojis anywhere on this website
- This includes code comments, UI elements, and generated content
- Use text or icons instead for visual indicators

### Rainbow Easter Egg

The blob control panel hue slider has a rainbow easter egg: hold the slider at max (360) for ~2 seconds to activate rainbow mode. This is intentional — the blob cycles through hues rapidly with a pulsing glow, and the panel caret glows rainbow. It is session-only (not persisted to localStorage). Do not remove it.

### Shape Preset System

`js/blob-shapes.js` defines `window.BLOB_SHAPES` — a registry of 10 wireframe shape presets. Each section in the homepage config can specify a `shapeId` that controls the blob's geometry.

**Shape types**:
- **`defaultBlob`** (`mode: 'defaultBlob'`): Standard noise-based morphing sphere. All 13 controls enabled.
- **`curlbroDumbbell`** (`mode: 'customSurface'`): Dumbbell shape via piecewise-linear radial profile. Deterministic, no noise/morph controls.
- **8 arbitrary mesh shapes** (`mode: 'arbitraryMesh'`): `goofDog`, `elephant`, `gallopingHorse`, `racecar`, `palmTree`, `gummyBear`, `hotAirBalloon`, `airplane`. Sourced from OBJ models via the conversion pipeline. Each has inline vertex/edge arrays and `buildMesh()` with `_cachedMesh` for lazy caching.

Shape morphing blends radius outputs from two presets per frame at ~0.05 lerp/frame, matching the color transition speed. Mode changes (sphereGrid <-> arbitraryMesh) use a shrink/swap/expand transition. Custom shapes use scroll-velocity rotation only (no noise).

When adding new shapes, either add a manual preset or use the OBJ pipeline (see below). Reference the preset ID in a section's `shapeId` field in `projects.json` and add it to `CAROUSEL_CONFIG.sequence` in `js/animations.js`.

### 3D Shape Carousel

`#blob-showcase` is a scroll-driven 3D shape carousel at the bottom of the page. It showcases all wireframe presets in sequence.

**Architecture** (implemented in `js/animations.js` as `CAROUSEL_CONFIG`):
- The section height is set dynamically: `(numShapes * scrollPerShape + unlimitedExtraScroll) * vh`
- Scroll position within the section maps deterministically to: which shape is displayed, its rotation angle, and slide transition offset
- Each shape gets `scrollPerShape` (3) viewport-heights of scroll for a full 360-degree rotation
- The last 12% and first 12% of each shape's scroll budget are transition zones where the shape slides horizontally off/on screen
- The last shape (`defaultBlob`) spins indefinitely in the unlimited zone
- `CAROUSEL_CONFIG.active` suppresses the normal `sectionChanged` shape/color system
- On carousel exit, `triggerMeshTransition(defaultBlob)` restores the default shape and a `carouselExited` event resets main.js's section cache

**Configuring the carousel**:
- Edit `CAROUSEL_CONFIG.sequence` array in `js/animations.js` to change shape order
- `scrollPerShape`: viewport-heights per 360-degree rotation (default: 3)
- `transitionZone`: fraction of scroll budget for slide animation (default: 0.12)
- `unlimitedExtraScroll`: extra vh for the final shape's infinite spin zone (default: 20)

**Key constraints**:
- `recalcCarouselLayout()` sets `showcase.style.height` which triggers resize events. A re-entrancy guard (`_recalcingCarousel`) prevents infinite recursion. Do not remove it.
- Layout must be recalculated after main.js renders dynamic sections (carousel `offsetTop` depends on content above it). main.js calls `window.recalcCarouselLayout()` after section rendering.
- The carousel section uses `scroll-snap-align: start` but NOT `.snap-section` class — it needs its own dynamic height.
- Mesh shapes define `defaultBaseRadius: 420` (desktop). The carousel scales this proportionally for mobile: `shapeRadius * (mobileDefault / desktopDefault)`.

### OBJ-to-Preset Pipeline

New 3D shapes are added from Wavefront OBJ files via `scripts/obj-to-preset.py`.

**Usage**:
```bash
# Print JS preset to stdout
python scripts/obj-to-preset.py ~/Downloads/Dog.obj houndDog "Hound Dog"

# Auto-inject into blob-shapes.js and bump cache version
python scripts/obj-to-preset.py ~/Downloads/F1.obj racecar "Racecar" --inject

# With options
python scripts/obj-to-preset.py model.obj myShape "My Shape" --target 1200 --rotate 90 --inject --preview preview.png
```

**Pipeline steps**:
1. Load OBJ via trimesh (handles quads, Z-up, multi-mesh, materials)
2. Merge all meshes into a single mesh
3. Simplify via quadric edge collapse to ~target edges (default: 1200)
4. Extract wireframe edges from simplified faces
5. Normalize to -0.5..0.5, negate Y for canvas, optional rotation
6. Generate JS preset with inline vertex/edge arrays

**Options**: `--target N` (edge count), `--rotate N` (Z-axis degrees), `--inject` (auto-insert), `--preview P` (wireframe PNG), `--exclude A,B` (exclude mesh components), `--crop-x N` (crop faces), `--merge` (force merge)

**Setup**: `pip install trimesh matplotlib` (use the project venv)

**Verification**: `node scripts/verify-blob-shapes.js` validates all presets load correctly and reports vertex/edge counts.

**After adding a new shape**:
1. Add to `CAROUSEL_CONFIG.sequence` in `js/animations.js` (or it won't appear in the carousel)
2. Optionally reference via `shapeId` in a section config in `data/projects.json`
3. Bump `blob-shapes.js` cache version in `index.html`

### LINK_SETS (Code-Owned Markup)

Contact and about link markup is defined in `LINK_SETS` in `js/main.js`, not in JSON. This keeps SVG icons and link attributes code-owned. Section configs reference link sets via `linkSetId` (e.g., `"aboutLinks"`, `"contactLinks"`).

### CSS Architecture

The CSS is split into modular files for easier maintenance:

- **tokens.css**: Design tokens (colors, typography, spacing, shadows, transitions)
- **base.css**: Reset, typography, containers, buttons, cards, utility classes
- **components.css**: Navigation, hero, sections, animations, scroll-snap, control panel
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
│   ├── components.css      # Nav, hero, sections, scroll-snap, control panel
│   ├── responsive.css      # Media queries, reduced motion, print styles
│   └── style.css           # Import wrapper (for tools compatibility)
├── js/
│   ├── analytics.js        # Shared GA4 module (consent, config, event helper)
│   ├── blob-shapes.js      # Shape preset registry (window.BLOB_SHAPES)
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
│   ├── obj-to-preset.py            # OBJ model to blob shape preset converter
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
- **11 total projects** (mix of tools, games, applications, and archive links)
- **4 featured projects** highlighted on home page
- Each project has metadata: title, description, tech stack, links, and images
- **Source of truth**: projects.json (not CLAUDE.md - see `data/README.md`)

## GitHub Pages Configuration

- **Custom domain**: Configured via CNAME file (simonelongo.com)
- **Branch**: Deploys from `master` branch
- **HTTPS**: Enabled for security (required for geolocation API)
- **Build process**: None - static files served directly
