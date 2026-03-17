#!/usr/bin/env bash
# Orchestrates the data pipeline: add (optional) -> validate -> compile -> gap report.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# If a batch file is provided, add seasons first
if [ -n "$1" ]; then
    echo "=== Adding seasons from $1 ==="
    python "$SCRIPT_DIR/add_seasons.py" "$1"
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
