# Agile This - Project Conventions

## Overview
Lightweight browser-based task board with dark theme (Linear/Vercel aesthetic). No server, no build tools - just open `index.html`. Formerly "FakeJira" -- renamed to avoid trademark issues.

## Tech Stack
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- SortableJS via CDN for drag-and-drop
- Geist + Silkscreen fonts via Google Fonts
- Data persists in localStorage, with JSON export/import

## File Structure
- `index.html` - HTML structure (header, board tabs, columns, modals, import dialog, inline SVG icons)
- `style.css` - All styles (dark theme, design tokens, layout, cards, tabs, modal, import dialog, responsive, animations)
- `app.js` - All JavaScript (state, rendering, board CRUD, drag-drop, export/import, copy-to-clipboard)

## Data Model (v3)
State object stored in localStorage under key `fakejira-board`:
```json
{
  "version": 3,
  "title": "My Project",
  "boards": [
    {
      "id": "B-LXK3A",
      "title": "Board 1",
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
      "columnOrder": { "todo": [], "in-progress": [], "testing": [], "done": [] },
      "labelPresets": ["bug", "feature", "ui", "backend", "urgent"]
    }
  ],
  "activeBoardIndex": 0
}
```

### Multi-Board Architecture
- Each board has its own `tickets`, `columnOrder`, and `labelPresets`
- `activeBoard()` helper returns `state.boards[state.activeBoardIndex]`
- All CRUD operations use `activeBoard()` instead of direct `state.*` access
- Board IDs use `B-` prefix, ticket IDs use `FJ-` prefix
- Default project/board names are randomly selected from satirical themed name pools (matching the mission statement easter egg tone)

### Migration Chain
- **v1 -> v2**: Added `prompt` field to tickets
- **v2 -> v3**: Wraps existing `tickets`, `columnOrder`, `labelPresets` into a single board inside the project envelope. Assigns random names from themed pools
- Migration runs automatically on load and import
- v1 and v2 board files are accepted and migrated seamlessly

### Import/Export
- Export always produces v3 format with project title in filename
- Import detects version and migrates v1/v2 files to v3
- Import dialog offers two options: "Replace Project" (replaces everything) or "Add Boards" (appends boards to current project)
- Both import modes support undo via toast
- Board IDs are regenerated on "Add Boards" to avoid collisions

## UI Components

### Project Title
- Editable inline text input in header between brand and actions
- Saves on blur/Enter
- If cleared, auto-assigns a random name from the pool

### Board Tabs
- Horizontal tab bar between header and board columns (glass/blur aesthetic)
- Click to switch boards, double-click to rename inline
- Delete button appears on hover (hidden if only 1 board)
- "+" button to add new board
- Scrolls horizontally on mobile

### Import Dialog
- Modal with two action buttons: Replace Project, Add Boards
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

## Testing
Open `index.html` in any modern browser. No dev server needed.
