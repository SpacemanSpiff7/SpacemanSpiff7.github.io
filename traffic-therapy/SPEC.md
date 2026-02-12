# Traffic Therapy — Full Development Specification

## Build this as a single HTML file with all CSS and JS inline. No external dependencies except the Silkscreen font from Google Fonts.

---

## 1. Game Overview

**Traffic Therapy** is a Rush Hour-style sliding block puzzle game. The player must slide obstacle blocks out of the way to free a 1×1 target block and guide it to an exit gap on the edge of the board. Built as a single self-contained HTML file for embedding on a personal website.

---

## 2. Core Mechanics

### 2.1 Grid & Board
- The board is a square grid. Starting grid size is **5×5**. Grid size is defined per level and can vary (5×5, 6×6, 7×7, or rectangular like 5×6, etc.).
- The board has a visible **border/wall** around it with a clear **gap** on one edge representing the exit.
- Grid lines should be **subtly visible** (thin, low-opacity lines) — not dominant, just enough to help the player orient.
- The board and border should have **slightly rounded corners** for a polished feel.

### 2.2 Blocks
- **Obstacle blocks** come in various sizes: 1×2, 1×3, 2×1, 3×1. Potentially 2×2 in later levels.
- Each obstacle block is **color-coded** using muted, cool-toned colors (slate blues, purples, muted teals) that fit a spacey aesthetic.
- Blocks have **sharp edges with very slightly rounded corners** and a **subtle texture** (e.g., a faint noise grain, inner shadow, or very subtle gradient — nothing heavy, just enough to give them tactile presence).
- **Horizontal blocks** (1×2, 1×3) can ONLY slide **left and right** along their row.
- **Vertical blocks** (2×1, 3×1) can ONLY slide **up and down** along their column.
- **2×2 blocks** can move in **any direction** (up/down/left/right).
- Blocks **cannot pass through** other blocks or the grid walls.
- Blocks **cannot exit** the board through the exit gap (only the target block can).

### 2.3 Target Block
- The target block is **1×1** in size.
- Since it is 1×1, it has **no fixed orientation** — it can move in **any direction** (up, down, left, right). This is a key design element that makes puzzles more interesting than standard Rush Hour.
- The target block is visually distinct: a **warm standout color** (amber/coral/warm red) against the cool-toned obstacles. No glow effect — just a solid, high-contrast color that clearly pops.
- Only the target block can exit through the exit gap to win the level.

### 2.4 Exit
- The exit is a **gap in the board's border wall**, positioned on any edge of the grid.
- The exit position varies per level.
- There must be a **visual indicator** at the exit: an arrow pointing outward, a highlighted gap, or similar clear visual cue showing where the target needs to go.
- The exit is exactly 1 cell wide (matching the 1×1 target block).

### 2.5 Win Condition
- The level is won when the target block is moved through the exit gap and off the board.
- Non-target blocks reaching the exit cell do NOT trigger a win.
- When the target exits, it should **animate sliding off the board** through the gap before the win screen appears.

---

## 3. Controls & Interaction

### 3.1 Desktop (Mouse)
- **Click and drag** blocks to slide them along their allowed axis.
- The block should follow the cursor smoothly during the drag but **snap to the grid** on release.
- During drag, the block should also **snap to grid positions in real-time** (grid-snapping feel while dragging, not just on release) — it should feel tactile and precise.
- If the player tries to drag a block in a direction it can't move, nothing happens.

### 3.2 Mobile (Touch)
- **Touch and drag** works identically to click and drag.
- Disable double-tap zoom on the game area.
- Disable pull-to-refresh if possible.
- Touch targets should be large enough to interact with comfortably on small screens.

### 3.3 Animation
- Block movement should be **smooth with a subtle ease-out** — snappy but not jarring.
- Grid snapping should feel satisfying, not robotic.

### 3.4 Move Counting
- A move is counted each time a block is **dragged and released in a new valid position** (different from where it started).
- If a block is picked up and released in the same position, it does NOT count as a move.
- If a block is dragged multiple grid cells in a single drag, it counts as **1 move**.
- The move counter is visible during gameplay.

---

## 4. Level System

### 4.1 Level Data Format
- Levels are defined as an **array of JavaScript objects** in the code. Each level object contains:

```javascript
{
  id: 1,                          // Unique level number
  name: "First Steps",            // Optional display name
  gridWidth: 5,                   // Grid columns
  gridHeight: 5,                  // Grid rows
  par: 8,                         // Par move count (do NOT display to player)
  exit: { side: "right", position: 2 },  // Exit location: side (top/bottom/left/right) + cell index along that side (0-indexed)
  target: { x: 1, y: 2 },        // Starting position of the 1×1 target block
  blocks: [
    { x: 3, y: 2, width: 1, height: 2, color: "#5B7B9F" },  // A 1×2 vertical block
    { x: 2, y: 0, width: 2, height: 1, color: "#7B6B8F" },  // A 2×1 horizontal block
    // ... more blocks
  ]
}
```

- Levels array is defined at the top of the JavaScript section for easy editing.
- **Include 5 hand-crafted starter levels** that demonstrate a gentle difficulty curve:
  - Level 1: 5×5, 2-3 obstacle blocks, solvable in ~3-5 moves. Tutorial-easy.
  - Level 2: 5×5, 3-4 obstacle blocks, solvable in ~5-7 moves.
  - Level 3: 5×5, 4-5 obstacle blocks, solvable in ~7-10 moves.
  - Level 4: 5×5, 5-6 obstacle blocks, solvable in ~10-14 moves. Requires thinking ahead.
  - Level 5: 5×5, 6-7 obstacle blocks, solvable in ~12-18 moves. Satisfying challenge.
- **Every level MUST be solvable.** Include a BFS solver function in the code that can verify solvability. This solver is also used to compute the optimal solution length, which should be ≤ par.
- Par should be set generously above optimal so 3 stars is achievable but not trivial.

### 4.2 Star Rating System
- ⭐⭐⭐⭐ (4 stars) = completed in **fewer moves than par** (beat par)
- ⭐⭐⭐ (3 stars) = completed in **exactly par moves**
- ⭐⭐ (2 stars) = completed in **1–3 moves over par**
- ⭐ (1 star) = completed in **4+ moves over par**
- Par value is **never displayed** to the player. They only see their move count and resulting stars.

### 4.3 Progression & Persistence
- Levels are **unlocked sequentially**. Beating level N unlocks level N+1.
- Progress is saved using **cookies** (not localStorage). Store:
  - Highest unlocked level number
  - Best star rating per level (1-4)
- If a player replays a level and gets a **better** star rating, the stored rating updates. It should **never downgrade**.
- Cookies should persist reasonably (set expiry to 1 year).

---

## 5. Screens & UI Flow

### 5.1 Title Screen
- **Game title: "Traffic Therapy"** displayed prominently using the **Silkscreen** font (loaded from Google Fonts).
- No tagline.
- A **"Start"** button below the title.
- Clean, spacey aesthetic matching the user's website.
- Clicking "Start" navigates to the Level Select screen.

### 5.2 Level Select Screen
- Shows a scrollable/paginated list or grid of **unlocked levels only**. Locked levels are **completely hidden**, not grayed out.
- Each unlocked level shows:
  - Level number
  - Best star rating (shown as star icons, empty stars if not yet completed)
- Clicking a level starts that level.
- There should be a **"Back" button** to return to the title screen.
- On first visit (no cookies), only Level 1 is available.

### 5.3 Gameplay Screen
- The puzzle board is centered on screen.
- **HUD elements visible during gameplay:**
  - Level number (top area)
  - Move counter (e.g., "Moves: 12")
  - **"Reset" button** — resets the current level to its starting position and resets the move counter to 0
  - **"Menu" button** — returns to the Level Select screen (placed next to the Reset button)
- The exit gap on the board should have a clear visual indicator (arrow, highlight, or opening in the wall).
- Layout is **portrait-oriented** on mobile — board centered with HUD above and buttons below.

### 5.4 Win Screen
- Triggered after the target block animates off the board through the exit.
- **Confetti animation** themed to the spacey aesthetic — small stars/sparkles rather than paper confetti. Should feel celebratory but tasteful.
- **"Level Complete!" banner** showing:
  - Level number
  - Move count
  - Star rating (1-4 stars, visually displayed)
- **"Next Level" button** to advance to the next level (hidden if it was the last level)
- **"Menu" button** to return to Level Select
- Confetti should animate for ~2-3 seconds then fade or settle.

---

## 6. Admin Mode (Easter Egg)

### 6.1 Activation
- There is a **small, subtle clickable element** on the title screen — something that doesn't look interactive at first glance (e.g., a tiny dot, the period after the title, a star in the background, etc. — use good judgment but make it discoverable if you're looking for it).
- Clicking it opens a **prompt dialog** that says: **"are you god?"**
- If the user types exactly **"ya"** (case-insensitive), admin mode is activated.
- Some subtle visual indicator that admin mode is active (e.g., a small icon, a subtle border glow, or "ADMIN" text in a corner).
- Admin mode persists until the page is refreshed. It is NOT saved to cookies.

### 6.2 Admin Mode: Level Unlocking
- All levels are **immediately unlocked** on the Level Select screen.
- The player can jump to any level.

### 6.3 Admin Mode: Level Editor
- When admin mode is active, a **"Level Editor" button** appears on the Level Select screen or title screen.
- The Level Editor is a full-screen UI with:

**Grid Setup:**
- Input fields or controls to set **grid width and height** (e.g., dropdowns or number inputs, range 4-8).
- The grid renders live as dimensions change.

**Exit Placement:**
- Click on any **edge cell** of the grid to place the exit. The exit is visually indicated on the grid.
- Only one exit at a time; clicking a new edge cell moves it.

**Target Block Placement:**
- A button or tool to **place the target block**. Click a grid cell to place it. Only one target block allowed.

**Obstacle Block Placement:**
- A **toolbar/panel** with block types: 1×2 horizontal, 1×3 horizontal, 2×1 vertical, 3×1 vertical, 2×2 square.
- Click a block type in the toolbar, then click on the grid to place it at that position.
- Placed blocks should be **draggable** on the grid to reposition them.
- Clicking an existing block should allow **deleting** it (via a delete button or right-click or a remove mode).
- Blocks snap to the grid.
- Blocks cannot overlap. If a placement would overlap, prevent it and show a visual warning.

**Color Assignment:**
- Blocks are automatically assigned colors from the palette. No manual color picking needed.

**Par Setting:**
- A number input to **set the par value** for the level.

**Level Testing:**
- A **"Test" button** that:
  - Runs the BFS solver to verify the level is solvable.
  - Displays the optimal solution move count.
  - Shows a clear "SOLVABLE ✓" or "UNSOLVABLE ✗" indicator.
- A **"Play Test" button** that lets the admin play through the level in-editor to manually test it.

**Level Management:**
- A **list of all current levels** (from the levels array) displayed in a sidebar or panel.
- **Drag-and-drop reordering** of levels in this list.
- An **"Add Level"** button that takes the current editor state and adds it as a new level.

**Export:**
- A **"Export All Levels as JSON"** button that outputs the entire levels array as formatted JSON.
- The JSON should be **copy-paste ready** — the admin copies it and replaces the levels array in the source code.
- Also a **"Export Current Level as JSON"** button for individual level export.

---

## 7. Visual Design & Aesthetic

### 7.1 Overall Aesthetic
- **Spacey, dark theme** — deep dark background (near-black with subtle blue/purple undertones).
- The game should feel like it lives on a space-themed personal website.
- Clean, minimal UI chrome. Let the puzzle board be the focus.

### 7.2 Typography
- **Title and headings:** Silkscreen font (Google Fonts: `https://fonts.googleapis.com/css2?family=Silkscreen&display=swap`)
- **Body text, counters, buttons:** A clean sans-serif that complements Silkscreen. Use something available via Google Fonts that feels slightly techy/modern (e.g., Space Mono, JetBrains Mono, or IBM Plex Mono for a subtle spacey-tech feel).

### 7.3 Color Palette
- **Background:** Deep dark (#0a0a1a or similar very dark blue-black)
- **Board/grid background:** Slightly lighter than page background (#12122a or similar)
- **Grid lines:** Very subtle, low-opacity (#ffffff10 or similar)
- **Board border/walls:** Visible but not harsh — a muted medium tone (#2a2a4a or similar)
- **Obstacle blocks:** Cool-toned muted palette. Use 6-8 colors that are distinct but harmonious:
  - Slate blue (#5B7B9F)
  - Muted purple (#7B6B8F)
  - Dark teal (#4F7B7B)
  - Dusty rose (#8F6B7B)
  - Muted navy (#5B6B8F)
  - Sage (#6B8F7B)
  - Warm gray (#7B7B6B)
  - Soft indigo (#6B6B9F)
- **Target block:** Warm amber/coral (#E07B4F or similar warm tone) — solid, no glow, clearly stands out against cool blocks.
- **Exit indicator:** Bright but not garish — could match the target color or be a contrasting bright white/yellow arrow.
- **Text:** Light (#e0e0e0 or off-white)
- **Buttons:** Subtle, matching the theme. Slight hover effects.
- **Stars:** Gold/yellow (#FFD700 or similar) for earned stars, dark/empty for unearned.

### 7.4 Block Styling
- Sharp edges with **very slightly rounded corners** (2-3px border-radius).
- **Subtle texture:** A very faint CSS noise/grain effect, inner shadow, or barely perceptible gradient to give blocks a tactile, physical feel without looking busy.
- Blocks should feel like physical tiles you're sliding around.

### 7.5 Confetti/Win Effects
- Star-shaped or sparkle-shaped particles, not traditional paper confetti.
- Colors from the palette — golds, whites, maybe some cool tones mixed in.
- Particles should fall/drift with slight rotation, fading out after 2-3 seconds.
- Implemented in pure CSS/JS (canvas-based particle system or DOM elements with CSS animations).

### 7.6 Responsive Design
- **Portrait-first** layout for mobile.
- The board should **scale to fit the viewport** — calculate board size based on the smaller viewport dimension minus padding.
- On desktop, the board should be a comfortable size centered on screen (not stretching to fill a widescreen monitor).
- All touch targets (buttons, blocks) should be minimum **44px** on mobile.
- No scrolling should be required to play the game.

---

## 8. Technical Implementation Notes

### 8.1 Single File
- Everything in **one HTML file**: structure, styles, and scripts.
- Load Silkscreen font from Google Fonts CDN (the only external resource).
- Load the secondary font from Google Fonts as well.

### 8.2 Rendering
- Use **HTML elements (divs) for blocks**, not canvas. This makes drag interaction simpler and more reliable across devices.
- Use CSS transforms for positioning and animation (transform: translate, transition).
- The grid can be a CSS Grid or absolutely positioned container.

### 8.3 Drag Implementation
- Use pointer events (pointerdown, pointermove, pointerup) for unified mouse/touch handling.
- On pointerdown on a block: determine which axis it can move on, calculate min/max positions based on collisions with other blocks and walls.
- On pointermove: update block position along the allowed axis, snapping to grid increments in real-time.
- On pointerup: finalize position, check if it changed, increment move counter if it did, check win condition.
- Set `touch-action: none` on the game board to prevent browser touch gestures.

### 8.4 BFS Solver
- Include a **breadth-first search solver** function that:
  - Takes a level configuration as input.
  - Explores all possible board states by trying all valid moves for all blocks.
  - Returns the minimum number of moves to solve the level, or null if unsolvable.
  - States are hashed by block positions for efficient visited-state tracking.
- This is used:
  - In the level editor "Test" button to verify solvability and show optimal moves.
  - Can be called from the console for debugging.
- The solver does NOT need to run during normal gameplay — only in admin/editor mode.

### 8.5 Cookie Management
- Use `document.cookie` for storage.
- Cookie format — store as a single JSON-encoded cookie:
```javascript
{
  unlockedLevel: 5,
  stars: { "1": 4, "2": 3, "3": 2 }  // level id -> best star rating
}
```
- Set cookie path to `/` and expiry to 365 days.
- Helper functions: `saveProgress()`, `loadProgress()`.
- On load, read cookie and restore state.
- On level complete, update cookie if new unlock or better star rating.

---

## 9. Test Suite

Include a **comprehensive test suite** as a function that can be called from the browser console (e.g., `runTests()`). Tests should log results clearly with pass/fail indicators. **Tests should NOT run automatically on page load** — only when explicitly called.

### 9.1 Core Puzzle Logic Tests

```
TEST: Horizontal block cannot move vertically
  - Set up a 1×2 horizontal block
  - Attempt to move it up/down
  - Assert: block position unchanged

TEST: Vertical block cannot move horizontally
  - Set up a 2×1 vertical block
  - Attempt to move it left/right
  - Assert: block position unchanged

TEST: 1×1 target block can move in any direction
  - Place target on grid with space in all 4 directions
  - Move up, down, left, right
  - Assert: all 4 moves succeed

TEST: Block cannot move through another block
  - Place two horizontal blocks in the same row adjacent
  - Attempt to slide one into the other
  - Assert: block stops at collision boundary

TEST: Block cannot move off the grid
  - Place a block at the edge of the grid
  - Attempt to slide it off the edge
  - Assert: block stays within grid bounds

TEST: Only the target block can exit through the exit gap
  - Place a non-target block adjacent to the exit
  - Attempt to slide it through the exit
  - Assert: block does not exit, stays on grid

TEST: Target block CAN exit through the exit gap
  - Place target block adjacent to exit with clear path
  - Slide target through exit
  - Assert: win condition triggers

TEST: Win condition does NOT trigger prematurely
  - Move target block near exit but not through it
  - Assert: win condition has NOT triggered
```

### 9.2 Move Counter Tests

```
TEST: Move counter starts at 0
  - Load a level
  - Assert: move counter displays 0

TEST: Valid move increments counter by 1
  - Drag a block to a new valid position
  - Assert: move counter is 1

TEST: Multi-cell drag counts as 1 move
  - Drag a block across 3 cells in one drag
  - Assert: move counter is 1, not 3

TEST: Zero-distance drag does NOT increment counter
  - Pick up a block and release in same position
  - Assert: move counter is still 0

TEST: Reset button resets move counter to 0
  - Make several moves
  - Click reset
  - Assert: move counter is 0 and all blocks are in starting positions
```

### 9.3 Star Rating Tests

```
TEST: Completing under par awards 4 stars
  - Set par to 10, complete in 8 moves
  - Assert: 4 stars awarded

TEST: Completing at par awards 3 stars
  - Set par to 10, complete in 10 moves
  - Assert: 3 stars awarded

TEST: Completing 1-3 over par awards 2 stars
  - Set par to 10, complete in 11 moves → 2 stars
  - Set par to 10, complete in 13 moves → 2 stars
  - Assert: both award 2 stars

TEST: Completing 4+ over par awards 1 star
  - Set par to 10, complete in 14 moves
  - Assert: 1 star awarded
```

### 9.4 Level Integrity Tests

```
TEST: All levels are solvable
  - Run BFS solver on every level in the levels array
  - Assert: every level returns a valid solution

TEST: Par is achievable (par >= optimal solution)
  - For each level, compare par to BFS optimal solution
  - Assert: par >= optimal for all levels

TEST: No blocks overlap in any level's initial state
  - For each level, check all block positions
  - Assert: no two blocks occupy the same cell

TEST: Exit is on the edge of the grid in all levels
  - For each level, verify exit position is valid
  - Assert: exit is on a border cell

TEST: Exactly one target block per level
  - For each level, count target blocks
  - Assert: count is exactly 1

TEST: Target block is within grid bounds in all levels
  - For each level, verify target starting position
  - Assert: target is inside the grid
```

### 9.5 Progression & Storage Tests

```
TEST: Completing level N unlocks level N+1
  - Complete level 1
  - Assert: level 2 is now accessible

TEST: Progress persists after simulated reload
  - Save progress, clear state, load progress
  - Assert: unlocked level and star ratings restored correctly

TEST: Star rating updates when improved
  - Complete level 1 with 2 stars, save
  - Complete level 1 with 4 stars, save
  - Assert: stored rating is now 4

TEST: Star rating does NOT downgrade
  - Complete level 1 with 4 stars, save
  - Complete level 1 with 1 star, save
  - Assert: stored rating is still 4

TEST: Admin mode unlocks all levels
  - Activate admin mode
  - Assert: all levels accessible on level select

TEST: Admin mode requires correct passphrase
  - Enter "no" at prompt → assert admin mode NOT active
  - Enter "ya" at prompt → assert admin mode IS active
  - Enter "YA" at prompt → assert admin mode IS active (case-insensitive)
```

### 9.6 Level Editor Tests (Admin Mode)

```
TEST: Editor creates valid level JSON
  - Use editor to create a level (place target, blocks, exit, set par)
  - Export JSON
  - Assert: JSON parses correctly and contains all required fields

TEST: Editor prevents overlapping block placement
  - Place a block, attempt to place another overlapping it
  - Assert: second placement is rejected

TEST: Editor requires target block before export
  - Try to export/test without placing a target
  - Assert: error/warning shown

TEST: Editor requires exit before export
  - Try to export/test without placing an exit
  - Assert: error/warning shown

TEST: Exported JSON integrates with existing levels
  - Export a level from editor, add to levels array
  - Run level integrity tests on the full array including new level
  - Assert: all tests pass

TEST: Editor solver correctly identifies solvable levels
  - Create a solvable level, click test
  - Assert: "SOLVABLE" shown with optimal move count

TEST: Editor solver correctly identifies unsolvable levels
  - Create an unsolvable level (wall off the target), click test
  - Assert: "UNSOLVABLE" shown

TEST: Level reorder updates level order
  - Reorder levels in editor
  - Assert: exported JSON reflects new order
```

### 9.7 Mobile/Responsive Tests
(These are manual but document expected behaviors)

```
MANUAL TEST: Board fits viewport without scrolling
  - Open on mobile viewport (375×667)
  - Assert: entire board and UI visible without scroll

MANUAL TEST: Touch drag works
  - Touch and drag a block on mobile
  - Assert: block follows finger and snaps to grid

MANUAL TEST: No double-tap zoom on game area
  - Double-tap on the game board
  - Assert: page does NOT zoom in

MANUAL TEST: Portrait layout correct
  - Open on mobile in portrait
  - Assert: HUD above board, buttons below, no horizontal overflow
```

---

## 10. File Structure

**Static files only — no build step, no bundler, no framework.**

```
traffic-therapy/
├── index.html              # Shell: meta, fonts, CSS link, script tags
├── css/
│   └── style.css           # All styles: theme, grid, blocks, screens, animations, responsive
├── js/
│   ├── levels.js           # LEVELS array of hand-crafted level data objects
│   ├── engine.js           # Game engine: grid, blocks, drag, collision, move logic, win
│   ├── solver.js           # BFS solver: solvability check, optimal move count
│   ├── screens.js          # Screen manager: title, level select, gameplay HUD, win overlay
│   ├── storage.js          # Cookie-based persistence: save/load progress, star ratings
│   ├── confetti.js         # Win celebration: star-shaped particle system
│   ├── editor.js           # Admin mode: level editor UI, toolbar, export, reorder
│   └── tests.js            # Test suite: runTests() callable from browser console
└── README.md
```

### index.html structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Traffic Therapy</title>
  <link href="[Google Fonts URL for Silkscreen + Space Mono]" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Minimal HTML structure — screens built via JS -->
  <div id="game-root"></div>

  <!-- Scripts loaded in dependency order -->
  <script src="js/storage.js"></script>
  <script src="js/solver.js"></script>
  <script src="js/levels.js"></script>
  <script src="js/confetti.js"></script>
  <script src="js/engine.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/editor.js"></script>
  <script src="js/tests.js"></script>
</body>
</html>
```

### Module Pattern:
All files share a single global namespace:
```javascript
// At the top of every JS file:
window.TT = window.TT || {};

// Each file attaches its public API:
// storage.js → TT.storage = { save, load }
// solver.js → TT.solver = { solve, isLevelSolvable }
// etc.
```

Do NOT use ES modules (import/export) — plain script tags for maximum
static hosting compatibility.

---

## 11. Summary of Key Constraints

1. **Static files only** — no build tools, no npm, no bundlers. Plain HTML + CSS + JS files.
2. **No external JS dependencies** — only Google Fonts CDN for Silkscreen + Space Mono.
3. **Must work on desktop (mouse) and mobile (touch)** — pointer events, portrait layout, responsive scaling.
4. **All 5 starter levels must be verified solvable** by the included BFS solver.
5. **Cookie-based persistence** — not localStorage.
6. **Admin mode** via easter egg only — "are you god?" → "ya".
7. **Level editor** exports JSON that can be pasted into levels.js.
8. **Test suite** callable from console via `runTests()`.
9. **No sounds.**
10. **Silkscreen font** for titles, Space Mono for body/UI.
11. **Spacey dark theme** with cool-toned blocks and warm amber target.
12. **Shared namespace** — all JS files use `window.TT` object, no ES modules.