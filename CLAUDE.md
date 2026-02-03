# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a static GitHub Pages site with no build process. Simply push to the `master` branch to deploy.

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

## Architecture Overview

### Current Design
- **Scroll-snap single page** with animated backgrounds
- **Fixed canvas layers**: starfield + 3D morphing blob (js/animations.js)
- **Dynamic content**: Projects loaded from data/projects.json
- **Control panel**: Blob parameter tweaking (collapsible UI)
- **Modular CSS**: Split into tokens, base, components, and responsive files

### Key Files
| File | Purpose |
|------|---------|
| `index.html` | Main page with all sections inline |
| `css/tokens.css` | CSS custom properties (design system tokens) |
| `css/base.css` | Reset, typography, containers, buttons, cards |
| `css/components.css` | Nav, hero, sections, scroll-snap, control panel |
| `css/responsive.css` | Media queries, reduced motion, print styles |
| `css/style.css` | Import wrapper for all CSS (used by tools) |
| `js/main.js` | Navigation, project loading, progress indicator |
| `js/animations.js` | Starfield and 3D blob rendering |
| `components/nav.html` | Navigation bar (only component loaded dynamically) |
| `data/projects.json` | Single source of truth for projects |

### Section Structure
1. **Hero** - Name + title
2. **Featured 1-4** - Featured projects (populated from JSON)
3. **About** - Bio section
4. **Contact** - Contact information
5. **Projects Grid** - All projects displayed in grid

### Data-Driven Configuration

**Single Source of Truth**: `data/projects.json`
- Controls featured tools on home page
- Powers projects grid with metadata
- **When adding projects**: Update projects.json, not CLAUDE.md (see `data/README.md`)

## Important Implementation Notes

### CSS Architecture

The CSS is split into modular files for easier maintenance:

- **tokens.css**: Design tokens (colors, typography, spacing, shadows, transitions)
- **base.css**: Reset, typography, containers, buttons, cards, utility classes
- **components.css**: Navigation, hero, sections, animations, scroll-snap, control panel
- **responsive.css**: Media queries, reduced motion, print styles

**For index.html**: Links all four CSS files directly for optimal loading.

**For tools**: Use `../css/style.css` which imports all modular files via `@import`.

### Standalone Tool Patterns

Tools in `/tools/` use three distinct navigation approaches:

**Pattern 1: SKIP_MAIN_SCRIPT + Standalone Nav** (3 tools)
- `la-collisions-dashboard.html`, `location-map.html`, `public-art-submission.html`
- Sets `window.SKIP_MAIN_SCRIPT = true` to prevent SPA component loading
- Fully standalone with own navigation structure

**Pattern 2: Inline Nav, No SKIP** (5 tools)
- `shopping-research.html`, `monte-carlo-sim-optimized.html`, `running-game.html`, `claude-consulting-draft.html`, `consulting-coming-soon.html`
- Creates navigation inline, references `../css/style.css`

**Pattern 3: External Module** (1 file)
- `location-map.js` (supporting JavaScript for location-map.html)

**Why different patterns?**: Performance optimization (avoid loading unused SPA components) and standalone functionality requirements.

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
Two tools integrate with Google services:

**Public Art Submission** (`tools/public-art-submission.html`):
- Integrates with Google Forms for submissions
- Uses Google Forms field IDs that must be configured
- Includes mobile camera/location features
- See `docs/PUBLIC_ART_SUBMISSION_README.md` for setup

**Location Map** (`tools/location-map.html`):
- Integrates with Google Maps, Sheets, and Drive APIs
- Requires API keys and OAuth configuration
- See `docs/LOCATION_MAP_SETUP.md` for complete setup guide

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
│   ├── main.js             # Navigation, project loading, progress indicator
│   └── animations.js       # Starfield and 3D blob rendering
├── components/
│   └── nav.html            # Navigation bar (only component)
├── tools/                  # 8 standalone HTML tools (see Tool Patterns above)
├── data/
│   ├── projects.json       # Source of truth for projects
│   └── la_traffic_collisions.json  # 303MB collision data
├── assets/
│   ├── favicon.svg
│   ├── images/             # All images (simone_pic.png, og-image.png, etc.)
│   └── collisions/tiles/   # 421 JSON tile files
├── scripts/
│   └── preprocess-collisions.js    # Data preprocessing
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
- Maps (location-map.html)
- Sheets/Drive (location-map.html data storage)
- Forms (public-art-submission.html)

**Assets**:
- Google Fonts (Inter, Silkscreen, IBM Plex Mono)
- Unsplash + self-hosted images (mix)

## Projects Configuration

The site features are managed through `data/projects.json`:
- **10 total projects** (mix of tools, games, and applications)
- **4 featured projects** highlighted on home page
- Each project has metadata: title, description, tech stack, links, and images
- **Source of truth**: projects.json (not CLAUDE.md - see `data/README.md`)

## GitHub Pages Configuration

- **Custom domain**: Configured via CNAME file (simonelongo.com)
- **Branch**: Deploys from `master` branch
- **HTTPS**: Enabled for security (required for geolocation API)
- **Build process**: None - static files served directly
