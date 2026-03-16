#!/bin/bash
# Run this in the parent directory where you want the project created.
# It creates seasonal-produce/ with the input files ready for Claude Code.

set -e

PROJECT="seasonal-produce"

echo "Creating project directory: $PROJECT"
mkdir -p "$PROJECT/input"
mkdir -p "$PROJECT/data"
mkdir -p "$PROJECT/scripts"
mkdir -p "$PROJECT/web"

# Copy input files (these should be in the same directory as this script)
if [ -f "produce_items.csv" ]; then
    cp produce_items.csv "$PROJECT/input/produce_items.csv"
    echo "✓ Copied produce_items.csv"
else
    echo "✗ Missing produce_items.csv — place it next to this script"
    exit 1
fi

if [ -f "produce_seasons_seed.json" ]; then
    cp produce_seasons_seed.json "$PROJECT/input/produce_seasons_seed.json"
    echo "✓ Copied produce_seasons_seed.json"
else
    echo "✗ Missing produce_seasons_seed.json — place it next to this script"
    exit 1
fi

if [ -f "CLAUDE_CODE_PROMPT.md" ]; then
    cp CLAUDE_CODE_PROMPT.md "$PROJECT/CLAUDE.md"
    echo "✓ Copied prompt as CLAUDE.md"
else
    echo "⚠ No CLAUDE_CODE_PROMPT.md found — copy it manually"
fi

echo ""
echo "Done. Project structure:"
find "$PROJECT" -type f | head -20
echo ""
echo "Next: cd $PROJECT && claude"
echo "Then paste or reference CLAUDE.md as your prompt."
