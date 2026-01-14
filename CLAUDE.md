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
- **Standalone pages**: Separate HTML files for specific tools (shopping-research.html, location-map.html, etc.)
- **Global styles**: `style.css` with CSS custom properties and mobile-first responsive design
- **Global scripts**: `script.js` handles component loading, navigation, and interactive features

### Component System
The site uses a custom component loading system in `script.js`:

```javascript
// Components are loaded dynamically
loadComponent('nav-container', 'components/nav.html');
loadComponent('home-container', 'components/home.html');
// etc.
```

**Key components:**
- `nav.html` - Navigation with mobile hamburger menu
- `home.html` - Hero section with featured tools
- `projects.html` - Project showcase
- `about.html` - About section
- `contact.html` - Contact information

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

### Standalone Tools
Tools in the `/tools/` directory are **standalone pages** with different navigation patterns:
- **Some tools** (location-map.html, public-art-submission.html) set `window.SKIP_MAIN_SCRIPT = true` to prevent main component loading
- **Other tools** (shopping-research.html, monte-carlo-sim-optimized.html, running-game.html) use standalone navigation without the skip flag
- All reference parent directory for shared CSS (`../style.css`)
- May have different navigation structures

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

**Running Game** (`tools/running-game.html`):
- Fully-featured browser game testing reflexes and patience
- Complete game mechanics with player movement, obstacles, and scoring system
- Settings drawer with customizable game options
- High score tracking with localStorage
- Mobile-optimized touch controls
- Featured project in projects.json
- 1,452 lines of self-contained HTML/CSS/JS

### Mobile Optimizations
- Touch-friendly 44px minimum touch targets
- iOS Safari specific viewport and input handling
- Camera integration with `capture="environment"`
- Image compression for mobile uploads

## File Organization

```
/
├── index.html              # Main SPA entry point
├── style.css              # Global styles and design system (1,401 lines)
├── script.js              # Main application logic (449 lines)
├── cursor_site.html        # Alternative/legacy standalone site version
├── CNAME                  # GitHub Pages domain configuration
├── README.md              # Repository readme
├── assets/                # Static assets
│   ├── favicon.svg        # Site favicon
│   └── images/            # Project card images
│       └── dodgers-image.jpg  # Dodgers project image (4.83 MB)
├── resources/             # Media resources
│   └── simone_pic.png     # Hero section image (5.77 MB)
├── components/            # SPA components
│   ├── nav.html           # Navigation with mobile hamburger menu
│   ├── home.html          # Hero section with featured tools
│   ├── projects.html      # Project showcase grid
│   ├── about.html         # About section
│   └── contact.html       # Contact information
├── data/                  # Configuration and data files
│   ├── projects.json      # Project configuration (main data source)
│   │                      # Contains 7 projects with 3 featured
│   ├── projects-commented.json  # Commented reference version
│   └── README.md         # Project management guide
├── tools/                 # Standalone tool pages
│   ├── shopping-research.html        # Product research comparison tool
│   ├── monte-carlo-sim-optimized.html  # Monte Carlo simulation
│   ├── running-game.html            # Browser-based running game (1,452 lines)
│   ├── location-map.html            # Interactive location mapping tool
│   ├── location-map.js              # Location map logic
│   └── public-art-submission.html   # Public art submission form
└── docs/                  # Documentation files
    ├── PUBLIC_ART_SUBMISSION_README.md  # Setup guide for art submission
    ├── LOCATION_MAP_SETUP.md            # Complete location map setup
    └── location-map-example-data.csv    # Sample data for location map
```

## Code Conventions

### CSS
- Use CSS custom properties from `:root` for consistent theming
- Follow BEM-like naming for components
- Mobile-first responsive design with min-width media queries
- Prefer CSS Grid and Flexbox for layouts

### JavaScript
- ES6+ features are used throughout
- Event delegation for dynamic content
- Component lifecycle managed through custom events
- Async/await for API calls in Google integrations

### HTML
- Semantic HTML5 elements
- ARIA attributes for accessibility
- Mobile-optimized viewport settings
- Preload critical resources

## External Dependencies

- **Google Fonts** - Inter font family
- **Google Maps API** - For location map feature
- **Google Sheets/Drive APIs** - For location data storage
- **Unsplash** - Some project card images (mix of Unsplash and self-hosted images)
- **Self-hosted images** - Hero image (resources/simone_pic.png) and some project images (assets/images/)

## Projects Configuration

The site features are managed through `data/projects.json`:
- **7 total projects** defined in the projects array
- **3 featured projects** highlighted on the home page:
  - public-art-submission
  - dodgers-notifications
  - running-game
- Projects include tools, games, and applications
- Each project has metadata: title, description, tech stack, links, and images

## GitHub Pages Configuration

- **Custom domain**: Configured via CNAME file (simonelongo.com)
- **Branch**: Deploys from `master` branch
- **HTTPS**: Enabled for security (required for geolocation API)
- **Build process**: None - static files served directly