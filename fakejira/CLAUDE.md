# Agile This - Project Conventions

## Overview
Lightweight browser-based task board with dark theme (Linear/Vercel aesthetic). No server, no build tools - just open `index.html`. Formerly "FakeJira" -- renamed to avoid trademark issues.

## Tech Stack
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- SortableJS via CDN for drag-and-drop
- Inter font via Google Fonts
- Data persists in localStorage, with JSON export/import

## File Structure
- `index.html` - HTML structure (header, columns, modals, inline SVG icons)
- `style.css` - All styles (dark theme, design tokens, layout, cards, modal, responsive, animations)
- `app.js` - All JavaScript (state, rendering, drag-drop, export/import, copy-to-clipboard)

## Data Model (v2)
State object stored in localStorage under key `fakejira-board`:
```json
{
  "version": 2,
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
```

### v1 -> v2 Migration
- Added `prompt` field (string, default `""`) to each ticket
- Migration runs automatically on load and import
- v1 board files are accepted and migrated seamlessly

## Conventions
- No build tools or bundlers
- Dark theme with CSS custom properties for all design tokens
- IDs are generated with `Date.now()` + random suffix
- Export produces compact JSON (no pretty-printing) to avoid unwanted newlines
- All icons are inline SVGs (no icon library)
- `prefers-reduced-motion` disables animations
- Keyboard shortcuts: N (new ticket), Escape (close modal), Cmd/Ctrl+S (save in modal)

## Testing
Open `index.html` in any modern browser. No dev server needed.
