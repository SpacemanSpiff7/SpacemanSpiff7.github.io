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

### Site Structure
This is a **single-page application (SPA)** with a component-based architecture:

- **Main page**: `index.html` - Loads all components dynamically via JavaScript
- **Components**: HTML files in `/components/` directory loaded via `loadComponent()` function
- **Standalone pages**: 9 HTML tools in `/tools/` directory with varying navigation patterns
- **Global styles**: `style.css` with CSS custom properties and mobile-first responsive design
- **Global scripts**: `script.js` handles component loading, navigation, and interactive features

### Data-Driven Configuration

**Single Source of Truth**: `data/projects.json`
- Controls featured tools on home page
- Powers projects grid with metadata
- **When adding projects**: Update projects.json, not CLAUDE.md (see `data/README.md`)

**Current featured** (4 projects): la-collisions-dashboard, public-art-submission, dodgers-notifications, ebay-craigslist-chrome-extension

### Component System
The site uses a custom component loading system in `script.js`:

```javascript
// Components are loaded dynamically
loadComponent('nav-container', 'components/nav.html');
loadComponent('home-container', 'components/home.html');
// etc.
```

### Navigation System
- Single-page navigation using `data-section` attributes
- Mobile-responsive hamburger menu
- Section visibility controlled by `.active` class
- Smooth scrolling between sections

### Styling Architecture
- **CSS Custom Properties** for consistent theming
- **Apple-inspired design system** with refined spacing and typography
- **Dark theme** with forced dark mode styling
- **Mobile-first responsive design** with specific iOS Safari optimizations
- **Modular CSS** organized by components and utilities

## Important Implementation Notes

### Standalone Tool Patterns

Tools in `/tools/` use three distinct navigation approaches:

**Pattern 1: SKIP_MAIN_SCRIPT + Standalone Nav** (3 tools)
- `la-collisions-dashboard.html`, `location-map.html`, `public-art-submission.html`
- Sets `window.SKIP_MAIN_SCRIPT = true` to prevent SPA component loading
- Fully standalone with own navigation structure

**Pattern 2: Inline Nav, No SKIP** (5 tools)
- `shopping-research.html`, `monte-carlo-sim-optimized.html`, `running-game.html`, `claude-consulting-draft.html`, `consulting-coming-soon.html`
- Creates navigation inline, references `../style.css`

**Pattern 3: External Module** (1 file)
- `location-map.js` (supporting JavaScript for location-map.html)

**Why different patterns?**: Performance optimization (avoid loading unused SPA components) and standalone functionality requirements.

### LA Collisions Dashboard

**Purpose**: Interactive visualization of 620K+ LAPD collision records (2010-2021) with progressive loading and no backend.

**Architecture** (`tools/la-collisions-dashboard.html`, ~3,200 lines):
- **Map rendering**: MapLibre GL 3.6.2
- **Temporal analysis**: Chart.js 4.4.0
- **Spatial indexing**: RBush 3.0.1 (fast collision detection)
- **Data**: 303MB `data/la_traffic_collisions.json` → 421 spatial tiles in `assets/collisions/tiles/*.json`
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
├── index.html, style.css (~1,266 lines), script.js (~453 lines)
├── cursor_site.html        # Alternative/legacy standalone site version
├── CNAME                   # GitHub Pages domain configuration
├── README.md              # Repository readme
├── components/            # 5 SPA components (nav, home, projects, about, contact)
├── tools/                 # 9 standalone HTML tools (see Tool Patterns above)
├── data/                  # projects.json (source of truth), la_traffic_collisions.json (303MB)
├── assets/                # favicon.svg, images/, collisions/tiles/ (421 JSON files)
├── scripts/               # preprocess-collisions.js (data preprocessing)
├── resources/             # simone_pic.png, og-image.png
└── docs/                  # Setup guides for Google API tools
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
- Google Fonts (Inter)
- Unsplash + self-hosted images (mix)

## Projects Configuration

The site features are managed through `data/projects.json`:
- **10 total projects** (mix of tools, games, and applications)
- **4 featured projects** highlighted on home page:
  - la-collisions-dashboard
  - public-art-submission
  - dodgers-notifications
  - ebay-craigslist-chrome-extension
- Each project has metadata: title, description, tech stack, links, and images
- **Source of truth**: projects.json (not CLAUDE.md - see `data/README.md`)

## GitHub Pages Configuration

- **Custom domain**: Configured via CNAME file (simonelongo.com)
- **Branch**: Deploys from `master` branch
- **HTTPS**: Enabled for security (required for geolocation API)
- **Build process**: None - static files served directly
