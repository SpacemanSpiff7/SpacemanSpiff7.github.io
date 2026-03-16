# Grocery Project Files

## Permissions

When you need access to files outside the current working directory, ask the user for read and/or write access to the specific directory path rather than asking for approval to `cd`.

## Overview

This directory contains the seasonal produce project and its supporting files.

```
grocery-project-files/
├── seasonal-produce/    # The main app (see seasonal-produce/CLAUDE.md)
├── data-sources.md      # Sourcing methodology for produce data
├── produce_items.csv    # Original 328-item canonical list
├── produce_seasons_seed.json  # Original seed data for ~97 items
└── setup.sh             # Environment setup script
```

## Quick Reference

- **App location:** `seasonal-produce/web/index.html`
- **Data pipeline:** `seasonal-produce/scripts/compile_data.py` and `validate_data.py`
- **Design docs:** `seasonal-produce/reference/DESIGN_DIRECTION.md`
- **Lessons learned:** `seasonal-produce/docs/LESSONS.md`
- **User-facing docs:** `seasonal-produce/README.md`
- **Data methodology:** `data-sources.md`

## Commands

```bash
# Validate data integrity
python seasonal-produce/scripts/validate_data.py

# Compile CSVs to web/data.json
python seasonal-produce/scripts/compile_data.py

# Serve locally
python -m http.server 8000 --directory seasonal-produce/web
```

Always use `python` (not `python3`) via virtual environment.

## No Emojis

Do not use emojis anywhere in the app or documentation.
