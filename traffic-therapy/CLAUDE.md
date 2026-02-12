# Traffic Therapy — Project Context

## What We're Building
A Rush Hour-style sliding block puzzle game. Static files only — no build step,
no bundler, no framework. Pure HTML + CSS + vanilla JS. Deploys as a subfolder
on a static website.

See SPEC.md for the full detailed specification.

## File Structure
```
traffic-therapy/
├── index.html          # Shell: loads fonts, CSS, JS modules in order
├── css/
│   └── style.css       # All styles (theme, grid, blocks, screens, animations, responsive)
├── js/
│   ├── levels.js       # LEVELS array — hand-crafted level data objects
│   ├── engine.js       # Game engine: grid render, block render, drag/pointer, collision, move logic, win detection
│   ├── solver.js       # BFS solver: verifies solvability, returns optimal move count
│   ├── screens.js      # Screen manager: title, level select, gameplay HUD, win overlay, transitions
│   ├── storage.js      # Cookie-based persistence: save/load progress, star ratings
│   ├── confetti.js     # Win celebration: star-shaped particle system
│   ├── editor.js       # Admin mode: level editor UI, block toolbar, export, reorder
│   └── tests.js        # Test suite: runTests() callable from browser console
└── README.md
```

## Script Load Order (in index.html)
Scripts must load in this order due to dependencies:
1. storage.js    (no dependencies)
2. solver.js     (no dependencies)
3. levels.js     (no dependencies)
4. confetti.js   (no dependencies)
5. engine.js     (depends on: storage, solver, levels)
6. screens.js    (depends on: engine, storage, levels, confetti)
7. editor.js     (depends on: engine, solver, storage)
8. tests.js      (depends on: everything above)

Use a shared namespace object `window.TrafficTherapy = {}` (or `const TT = {}`)
to expose module APIs. Each file attaches its public functions to this namespace.
Do NOT use ES modules (import/export) — just script tags for maximum static
hosting compatibility.

## Design Principles
- **Static only**: No build tools, no npm, no bundlers. Works with any static host.
- **Progressive enhancement**: Game renders and works without any server.
- **Separation of concerns**: CSS handles presentation, JS handles logic. No inline styles in JS except for dynamic positioning (block transforms).
- **Namespace isolation**: All game code lives under a single global namespace to avoid polluting window.
- **Mobile-first responsive**: CSS written portrait-first, scales up for desktop.

## Tech Stack
- HTML5
- CSS3 (custom properties for theming, grid layout, transitions, animations)
- Vanilla JavaScript (ES6+, but no modules — just concatenated script tags)
- Google Fonts: Silkscreen (titles) + Space Mono (body/UI)
- Zero external JS dependencies

## Build Phases
Build this project in phases. Each phase should be completed and tested
before moving to the next. After each phase, verify it works in a browser,
then commit.

### Phase 1: Foundation & Theme
Files: index.html, css/style.css, js/levels.js (stub with 1 test level)
- index.html shell with meta viewport, font links, CSS link, script tags
- Complete CSS theme:
  - Dark spacey background (#0a0a1a)
  - CSS custom properties for all colors (--color-bg, --color-board, --color-target, etc.)
  - Board container with border/wall, subtle grid lines, rounded corners
  - Block styles: cool-toned colors, sharp edges with slight border-radius, subtle texture
  - Target block style: warm amber/coral, visually distinct
  - Exit gap indicator styling (arrow or highlighted opening)
  - Responsive layout: portrait-first, board scales to viewport
  - Typography: Silkscreen for headings, Space Mono for body
  - Button styles matching theme
- js/levels.js: Define LEVELS array format, include 1 simple test level
- Render the grid and blocks statically on screen to verify visuals

### Phase 2: Core Gameplay
Files: js/engine.js, js/storage.js (stub)
- Game engine with board initialization from level data
- Pointer event drag system (pointerdown/move/up) — unified mouse+touch
- Axis-locked movement: horizontal blocks left/right, vertical up/down
- 1×1 target block: moves any direction
- Real-time grid snapping during drag (snap-to-grid feel)
- Collision detection: blocks stop at other blocks and walls
- Non-target blocks cannot exit through the exit gap
- Move counter: increments only on valid position change, multi-cell = 1 move
- Win detection: target block reaches exit cell
- Target exit animation: slides off board through gap
- Reset button: restores initial positions, resets move counter
- touch-action: none on game board, prevent double-tap zoom

### Phase 3: Levels, Solver & Progression
Files: js/solver.js, js/storage.js (full), js/levels.js (all 5 levels)
- BFS solver:
  - Takes level config, explores all board states
  - Returns optimal move count or null if unsolvable
  - States hashed by block positions for efficiency
- 5 hand-crafted levels (all 5×5):
  - Level 1: 2-3 obstacles, ~3-5 optimal moves
  - Level 2: 3-4 obstacles, ~5-7 optimal moves
  - Level 3: 4-5 obstacles, ~7-10 optimal moves
  - Level 4: 5-6 obstacles, ~10-14 optimal moves
  - Level 5: 6-7 obstacles, ~12-18 optimal moves
- Run solver against ALL levels — verify every one is solvable
- Set par per level: par >= optimal, generous but not trivial
- Star rating: 4★ = under par, 3★ = par, 2★ = 1-3 over, 1★ = 4+ over
- Cookie persistence:
  - Store: highest unlocked level, best star rating per level
  - Cookie format: JSON, path=/, 365 day expiry
  - Never downgrade star ratings on replay
  - Helper functions: saveProgress(), loadProgress()

### Phase 4: Screens & UI Flow
Files: js/screens.js, js/confetti.js
- Title screen:
  - "Traffic Therapy" in Silkscreen font, centered
  - "Start" button
  - Subtle easter egg clickable element (for admin mode)
- Level select screen:
  - Only unlocked levels visible (locked = hidden)
  - Each shows: level number + best star rating (gold stars)
  - Scrollable if many levels
  - "Back" button to title
- Gameplay screen:
  - Board centered
  - HUD: level number, move counter
  - Buttons: Reset + Menu (side by side)
  - Exit gap has clear visual arrow/indicator
- Win screen overlay:
  - Confetti: star/sparkle shaped particles, gold + cool accent colors
  - "Level Complete!" banner
  - Shows: level number, move count, star rating (1-4 stars)
  - "Next Level" button (hidden if last level)
  - "Menu" button
  - Confetti animates ~2-3 sec then fades
- All screen transitions should feel smooth

### Phase 5: Admin Mode & Level Editor
Files: js/editor.js
- Easter egg activation:
  - Subtle clickable element on title screen (tiny dot, star, etc.)
  - Clicking opens prompt: "are you god?"
  - Typing "ya" (case-insensitive) activates admin mode
  - Subtle visual indicator (small "ADMIN" badge or similar)
  - Admin mode does NOT persist (resets on page refresh)
- Admin: all levels unlocked on level select
- Admin: "Level Editor" button appears
- Level Editor UI:
  - Grid size controls (width/height, range 4-8)
  - Live grid preview
  - Click edge to place/move exit
  - Click grid to place target block (only one allowed)
  - Block toolbar: 1×2, 1×3, 2×1, 3×1, 2×2
  - Click toolbar block then click grid to place
  - Drag placed blocks to reposition
  - Delete blocks (click to select + delete button)
  - Overlap prevention with visual warning
  - Auto-assigned block colors from palette
  - Par value number input
  - "Test" button: runs BFS solver → shows SOLVABLE/UNSOLVABLE + optimal
  - "Play Test" button: play the level in-editor
  - Level list sidebar with drag-and-drop reorder
  - "Export All Levels as JSON" button → copyable formatted JSON
  - "Export Current Level as JSON" button

### Phase 6: Testing & Polish
Files: js/tests.js, all files (polish)
- Implement runTests() covering ALL tests in SPEC.md Section 9:
  - Core puzzle logic (axis lock, collision, target freedom, win condition)
  - Move counter (valid moves, zero-distance, multi-cell, reset)
  - Star rating (all 4 thresholds)
  - Level integrity (all solvable, par >= optimal, no overlaps, valid exits)
  - Progression/storage (unlock, persist, star upgrade, no downgrade, admin)
  - Editor (valid JSON output, overlap prevention, requires target/exit, solver accuracy)
- Run all tests, fix any failures
- Responsive polish:
  - Test 375×667 (iPhone SE), 390×844 (iPhone 14), 768×1024 (iPad)
  - Board + UI fits without scroll
  - All touch targets >= 44px
  - No double-tap zoom on game area
- Performance check: drag feels smooth at 60fps
- Final walkthrough: play all 5 levels start to finish

## Agent Teams Workflow (Recommended)

This project is designed to be built using Claude Code Agent Teams.
Each phase can be executed by a team where teammates own specific files
and a QA teammate reviews their work.

### How to Launch a Phase with Agent Teams

Tell the lead to create a team. Example prompt for Phase 2:

```
Read CLAUDE.md and SPEC.md. Build Phase 2: Core Gameplay.

Create an agent team:
- Teammate "engine" should build js/engine.js with the full game engine:
  grid rendering, block rendering, pointer event drag system, axis-locked
  movement, collision detection, move counter, and win detection.
  It must use the window.TT namespace and follow SPEC.md Sections 2-3.
- Teammate "storage" should build js/storage.js with cookie-based
  persistence: saveProgress(), loadProgress(), helper functions.
  Follow SPEC.md Section 4.3.
- Teammate "qa" should wait for engine and storage to finish, then use
  the tester agent to review all files against SPEC.md.

Coordinate through the shared task list. Do not implement anything yourself,
only delegate and synthesize.
```

### File Ownership Rules for Agent Teams
To avoid edit collisions, each teammate should own specific files:
- No two teammates should edit the same file
- The lead coordinates and synthesizes but does NOT write code
- Use Shift+Tab (delegate mode) to keep the lead in coordinator role

### Suggested Team Structures Per Phase

Phase 1 (Foundation):
- "markup": index.html
- "styles": css/style.css
- "levels": js/levels.js (stub with 1 test level)

Phase 2 (Core Gameplay):
- "engine": js/engine.js
- "storage": js/storage.js (stub)
- "qa": review after others finish

Phase 3 (Levels & Solver):
- "solver": js/solver.js
- "levels": js/levels.js (full 5 levels)
- "storage": js/storage.js (full implementation)
- "qa": run solver on all levels, verify solvability

Phase 4 (Screens & UI):
- "screens": js/screens.js
- "confetti": js/confetti.js
- "qa": play through title → level select → gameplay → win flow

Phase 5 (Admin & Editor):
- "editor": js/editor.js (this is the biggest file, one teammate focused)
- "qa": test editor creates valid JSON, solver integration works

Phase 6 (Testing & Polish):
- "tests": js/tests.js
- "polish": CSS responsive fixes, touch target sizing
- "qa": run full test suite, report failures

## Code Style
- Use const/let, never var
- Use arrow functions for callbacks
- Descriptive function and variable names
- Comment sections and non-obvious logic
- CSS: use custom properties, mobile-first media queries
- Keep functions short and focused (< 40 lines ideally)