#!/usr/bin/env bash
# Orchestrates the data pipeline: add (optional) -> validate -> compile -> gap report.
# Usage:
#   bash pipeline.sh                        # validate + compile + gaps
#   bash pipeline.sh batch.json             # add seasons + validate + compile + gaps
#   bash pipeline.sh --aliases batch.json   # add aliases + validate + compile + gaps
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Parse arguments
ALIAS_MODE=false
BATCH_FILE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --aliases)
            ALIAS_MODE=true
            shift
            ;;
        *)
            BATCH_FILE="$1"
            shift
            ;;
    esac
done

# If a batch file is provided, add seasons or aliases first
if [ -n "$BATCH_FILE" ]; then
    if [ "$ALIAS_MODE" = true ]; then
        echo "=== Adding aliases from $BATCH_FILE ==="
        python "$SCRIPT_DIR/add_aliases.py" "$BATCH_FILE"
    else
        echo "=== Adding seasons from $BATCH_FILE ==="
        python "$SCRIPT_DIR/add_seasons.py" "$BATCH_FILE"
    fi
    echo
fi

echo "=== Validating data ==="
python "$SCRIPT_DIR/validate_data.py"
echo

echo "=== Compiling data ==="
python "$SCRIPT_DIR/compile_data.py"
echo

echo "=== Coverage gaps ==="
python "$SCRIPT_DIR/find_gaps.py"
