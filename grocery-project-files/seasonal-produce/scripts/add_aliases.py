"""Validates and appends produce aliases from a JSON batch file to produce_aliases.csv."""

import argparse
import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
ALIASES_CSV = os.path.join(DATA, 'produce_aliases.csv')

FIELDNAMES = ['canonical_slug', 'alias']


def load_csv(filename):
    path = os.path.join(DATA, filename)
    with open(path) as f:
        return list(csv.DictReader(f))


def existing_aliases():
    """Build a dict of lowercase alias -> list of slugs from current CSV."""
    alias_map = {}
    if not os.path.exists(ALIASES_CSV):
        return alias_map
    for row in load_csv('produce_aliases.csv'):
        key = row['alias'].strip().lower()
        alias_map.setdefault(key, []).append(row['canonical_slug'])
    return alias_map


def validate_batch(batch, produce_slugs, current_aliases):
    """Validate batch entries. Returns (valid_rows, errors, warnings)."""
    valid_rows = []
    errors = []
    warnings = []

    # Track aliases added within this batch to detect intra-batch duplicates
    batch_aliases = {}

    for i, item in enumerate(batch):
        slug = item.get('slug', '')
        if not slug:
            errors.append(f"Item {i}: missing slug")
            continue
        if slug not in produce_slugs:
            errors.append(f"Item {i}: slug '{slug}' not in produce_items.csv")
            continue

        aliases = item.get('aliases', [])
        if not isinstance(aliases, list) or not aliases:
            errors.append(f"Item {i} ({slug}): aliases must be a non-empty list")
            continue

        for j, alias in enumerate(aliases):
            prefix = f"Item {i} ({slug}) alias {j}"

            if not isinstance(alias, str) or not alias.strip():
                errors.append(f"{prefix}: alias must be a non-empty string")
                continue

            alias_clean = alias.strip()
            alias_lower = alias_clean.lower()

            # Check if alias duplicates the item's own canonical name
            produce_name = None
            for row in load_csv('produce_items.csv'):
                if row['canonical_slug'] == slug:
                    produce_name = row['canonical_name']
                    break
            if produce_name and alias_lower == produce_name.lower():
                errors.append(f"{prefix}: alias '{alias_clean}' is the same as the canonical name")
                continue

            # Check for cross-slug overlap in existing data
            if alias_lower in current_aliases:
                existing_slugs = current_aliases[alias_lower]
                if slug not in existing_slugs:
                    warnings.append(
                        f"{prefix}: alias '{alias_clean}' already maps to "
                        f"{', '.join(existing_slugs)} -- will also map to {slug}"
                    )
                else:
                    errors.append(f"{prefix}: alias '{alias_clean}' already exists for {slug}")
                    continue

            # Check for cross-slug overlap within this batch
            if alias_lower in batch_aliases:
                other_slug = batch_aliases[alias_lower]
                if other_slug != slug:
                    warnings.append(
                        f"{prefix}: alias '{alias_clean}' also maps to "
                        f"{other_slug} in this batch"
                    )

            batch_aliases[alias_lower] = slug
            current_aliases.setdefault(alias_lower, []).append(slug)

            valid_rows.append({
                'canonical_slug': slug,
                'alias': alias_clean,
            })

    return valid_rows, errors, warnings


def append_rows(rows):
    """Append validated rows to produce_aliases.csv."""
    with open(ALIASES_CSV, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        for row in rows:
            writer.writerow(row)


def main():
    parser = argparse.ArgumentParser(description='Validate and append aliases from a JSON batch.')
    parser.add_argument('batch_file', help='Path to batch JSON file')
    parser.add_argument('--dry-run', action='store_true', help='Validate only, do not write')
    args = parser.parse_args()

    with open(args.batch_file) as f:
        batch = json.load(f)

    if not isinstance(batch, list):
        print("ERROR: Batch file must contain a JSON array.")
        sys.exit(1)

    produce_slugs = {r['canonical_slug'] for r in load_csv('produce_items.csv')}
    current_aliases = existing_aliases()

    valid_rows, errors, warnings = validate_batch(batch, produce_slugs, current_aliases)

    if warnings:
        print(f"WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  {w}")
        print()

    if errors:
        print(f"ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
        print()

    if args.dry_run:
        print(f"Dry run: {len(valid_rows)} aliases would be added, {len(errors)} rejected.")
        if errors:
            sys.exit(1)
        return

    if errors:
        print(f"Batch rejected: {len(errors)} errors found. No aliases were written.")
        sys.exit(1)

    if not valid_rows:
        print("No valid aliases to add.")
        return

    append_rows(valid_rows)
    print(f"Added {len(valid_rows)} aliases to produce_aliases.csv.")


if __name__ == '__main__':
    main()
