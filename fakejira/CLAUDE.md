# Agile This - Project Conventions

## Overview
Lightweight browser-based task board with dark theme (Linear/Vercel aesthetic). No server, no build tools - just open `index.html`. No server, no build tools.

## Tech Stack
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- SortableJS via CDN for drag-and-drop
- Geist + Silkscreen fonts via Google Fonts
- Data persists in localStorage, with JSON export/import

## File Structure
- `index.html` - HTML structure (header, board tabs, columns, modals, import dialog, inline SVG icons)
- `style.css` - All styles (dark theme, design tokens, layout, cards, tabs, modal, import dialog, responsive, animations)
- `app.js` - All JavaScript (state, rendering, board CRUD, drag-drop, export/import, copy-to-clipboard)
- `guide.html` - Quick start guide (static, imports style.css for component styling)

## URL Routing & Multi-Project Storage

### Hash-Based Routing
- URLs use `#project/<N>` format (e.g., `#project/0`, `#project/1`)
- On first load, hash normalizes to `#project/0` if missing
- `hashchange` event triggers save-current → load-new → re-render cycle
- Navigating to a non-existent project ID auto-creates a default project

### localStorage Keys
| Key | Purpose |
|-----|---------|
| `agilethis-projects` | Project registry: `{ nextId: N, list: [0, 1, ...] }` |
| `agilethis-project-<N>` | Per-project state (v4 format, see below) |
| `agilethis-col-collapsed-<N>` | Per-project collapsed column state |
| `agilethis-sidebar` | Sidebar expand/collapse (shared) |
| `agilethis-sidebar-width` | Sidebar width (shared) |
| `agilethis-col-widths` | Column widths (shared) |

### Migration
On first load, `migrateToProjectRegistry()` runs:
1. If `agilethis-projects` exists, skip (already migrated)
2. Check for `agilethis-board` or `fakejira-board` data
3. Copy to `agilethis-project-0`, migrate collapsed columns key
4. Create registry `{ nextId: 1, list: [0] }`
5. Clean up old keys

### "New" Dropdown
Replaces the old separate "New Project" and "New Ticket" buttons:
- **Ticket** — opens the new ticket modal (keyboard shortcut `N` still works)
- **Project in New Window** — allocates a new project ID, opens in new tab
- **Duplicate this Project** — deep-copies current state to a new project slot, opens in new tab
- **Clear this Project** — resets current project to defaults (shows save prompt if tickets exist)

## Data Model (v4)
State object stored in localStorage under key `agilethis-project-<N>`:
```json
{
  "version": 4,
  "title": "My Project",
  "boards": [
    {
      "id": "B-LXK3A",
      "title": "Board 1",
      "color": "#6366f1",
      "columns": [
        { "id": "todo", "name": "Todo", "color": "#818cf8" },
        { "id": "in-progress", "name": "In Progress", "color": "#f59e42" },
        { "id": "testing", "name": "Testing", "color": "#a78bfa" },
        { "id": "done", "name": "Done", "color": "#34d399" },
        { "id": "canceled", "name": "Canceled", "color": "#71717a" }
      ],
      "priorities": [
        { "id": "low", "name": "Low", "color": "#34d399" },
        { "id": "medium", "name": "Medium", "color": "#fbbf24" },
        { "id": "high", "name": "High", "color": "#fb923c" },
        { "id": "critical", "name": "Critical", "color": "#f87171" }
      ],
      "tickets": [
        {
          "id": "FJ-...",
          "title": "...",
          "description": "...",
          "prompt": "",
          "status": "todo",
          "priority": "medium",
          "labels": [],
          "createdAt": "...",
          "updatedAt": "..."
        }
      ],
      "columnOrder": { "todo": [], "in-progress": [], "testing": [], "done": [], "canceled": [] },
      "labelPresets": ["bug", "feature", "ui", "backend", "urgent"]
    }
  ],
  "activeBoardIndex": 0,
  "defaults": {
    "columns": [/* same structure as board.columns */],
    "priorities": [/* same structure as board.priorities */],
    "labelPresets": ["bug", "feature", "ui", "backend", "urgent"]
  }
}
```

### Multi-Board Architecture
- Each board has its own `tickets`, `columns`, `priorities`, `columnOrder`, and `labelPresets`
- `activeBoard()` helper returns `state.boards[state.activeBoardIndex]`
- `boardColumns()`, `boardPriorities()` return the active board's column/priority config
- All CRUD operations use `activeBoard()` instead of direct `state.*` access
- Board IDs use `B-` prefix, ticket IDs use `FJ-` prefix
- Default project/board names are randomly selected from satirical themed name pools (matching the mission statement easter egg tone)
- Columns and priorities are fully customizable per-board via the settings drawer
- `state.defaults` stores project-level defaults used when creating new boards

### Column Guardrails
- First column (intake) is always required but renamable
- Last column "Canceled" has a fixed name but customizable color
- Middle columns can be freely added, removed, renamed, and reordered
- Removing a column with tickets prompts for a destination column

### Migration Chain
- **v1 -> v2**: Added `prompt` field to tickets
- **v2 -> v3**: Wraps existing `tickets`, `columnOrder`, `labelPresets` into a single board inside the project envelope. Assigns random names from themed pools
- **v3 -> v4**: Adds `columns`, `priorities`, `color` to each board, adds `defaults` to state
- **Storage migration**: Old `agilethis-board`/`fakejira-board` keys migrated to per-project `agilethis-project-0` on first load
- Migration runs automatically on load and import
- v1, v2, and v3 board files are accepted and migrated seamlessly

### Import/Export
- Export always produces v4 format with project title in filename
- Import detects version and migrates v1/v2/v3 files to v4
- Import dialog offers three options: "Add to Active Board", "Add as New Board", "New Project"
- Both import modes support undo via toast
- Board IDs are regenerated on "Add Boards" to avoid collisions

## UI Components

### Guide Link
- Info icon (`btn--ghost`) in header, opens `guide.html` in new tab
- Guide uses real CSS classes from `style.css` so examples auto-update with style changes
- No JavaScript -- purely static HTML

### Project Title
- Editable inline text input in header between brand and actions
- Saves on blur/Enter
- If cleared, auto-assigns a random name from the pool

### Board Tabs
- Sidebar tab list with drag-to-reorder
- Click to switch boards, double-click to rename inline
- Gear icon on each tab opens board settings drawer
- Delete button appears on hover (hidden if only 1 board)
- "+" button to add new board

### Settings Drawer
- Slide-out panel from right edge (380px wide, full height)
- Two entry points: gear icon on board tab (board settings), "Defaults" button in header (project defaults)
- Sections with dividers: Columns, Priorities, Label Presets, Board Color (board mode only)
- Columns/priorities: sortable list with drag handle, color swatch, inline rename, remove button
- Column guardrails: first column locked (renamable), last "Canceled" column locked (fixed name)
- Removing a column with tickets shows inline migration dialog
- Label presets: chip-style list with X to remove, input to add
- Board color: palette grid of color swatches
- All column/priority colors use inline styles (no hardcoded CSS classes)

### Import Dialog
- Modal with three action buttons: Add to Active Board, Add as New Board, New Project
- Cancel button to abort

## Conventions
- No build tools or bundlers
- Dark theme with CSS custom properties for all design tokens
- Ticket IDs generated with `Date.now()` + random suffix (FJ- prefix)
- Board IDs generated similarly (B- prefix)
- Export produces compact JSON (no pretty-printing) to avoid unwanted newlines
- All icons are inline SVGs (no icon library)
- `prefers-reduced-motion` disables animations
- Keyboard shortcuts: N (new ticket), Escape (close modal/dialog)
- Undo for ticket delete captures board index at deletion time, restores to that specific board
- Never assume, ask clarifying questions

## Mobile Layout (<=640px)
- **Desktop-first** app -- mobile changes are scoped to `@media (max-width: 640px)` only
- Collapsed sidebar (44px) pushes board content right (no overlap)
- Expanded sidebar overlays board with dark backdrop; tap backdrop to close
- Header compacts to single row (48px height) with icon-only ghost buttons
- "New" primary button retains text label on mobile
- iOS auto-zoom prevented with `font-size: 16px` on inputs/textareas/selects

## Testing
Open `index.html` in any modern browser. No dev server needed.
