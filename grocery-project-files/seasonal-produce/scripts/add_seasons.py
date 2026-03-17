"""Validates and appends new season entries from a JSON batch file to produce_seasons.csv."""

import argparse
import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
SEASONS_CSV = os.path.join(DATA, 'produce_seasons.csv')

FIELDNAMES = [
    'produce_slug', 'region_slug', 'season_months', 'peak_months',
    'source_type', 'notes', 'storage_tip',
]


def load_csv(filename):
    path = os.path.join(DATA, filename)
    with open(path) as f:
        return list(csv.DictReader(f))


def existing_keys():
    """Build set of (slug, region, source, season_sorted) tuples from current CSV."""
    keys = set()
    for row in load_csv('produce_seasons.csv'):
        try:
            months = tuple(sorted(json.loads(row['season_months'])))
        except (json.JSONDecodeError, TypeError):
            continue
        keys.add((row['produce_slug'], row['region_slug'], row['source_type'], months))
    return keys


def validate_batch(batch, produce_slugs, region_slugs, current_keys):
    """Validate batch entries. Returns (valid_rows, errors)."""
    valid_rows = []
    errors = []

    for i, item in enumerate(batch):
        slug = item.get('slug', '')
        if not slug:
            errors.append(f"Item {i}: missing slug")
            continue
        if slug not in produce_slugs:
            errors.append(f"Item {i}: slug '{slug}' not in produce_items.csv")
            continue

        entries = item.get('entries', [])
        if not entries:
            errors.append(f"Item {i} ({slug}): no entries")
            continue

        for j, entry in enumerate(entries):
            prefix = f"Item {i} ({slug}) entry {j}"

            region = entry.get('region', '')
            if region not in region_slugs:
                errors.append(f"{prefix}: region '{region}' not in regions.csv")
                continue

            source = entry.get('source', '')
            if source not in ('local', 'import'):
                errors.append(f"{prefix}: invalid source '{source}' (must be 'local' or 'import')")
                continue

            season = entry.get('season', [])
            if not isinstance(season, list) or not season:
                errors.append(f"{prefix}: season must be a non-empty list of months")
                continue

            bad_months = [m for m in season if not isinstance(m, int) or m < 1 or m > 12]
            if bad_months:
                errors.append(f"{prefix}: invalid months in season: {bad_months}")
                continue

            if len(season) != len(set(season)):
                errors.append(f"{prefix}: duplicate months in season")
                continue

            peak = entry.get('peak', [])
            if not isinstance(peak, list):
                errors.append(f"{prefix}: peak must be a list")
                continue

            bad_peak = [m for m in peak if not isinstance(m, int) or m < 1 or m > 12]
            if bad_peak:
                errors.append(f"{prefix}: invalid months in peak: {bad_peak}")
                continue

            if len(peak) != len(set(peak)):
                errors.append(f"{prefix}: duplicate months in peak")
                continue

            if not set(peak).issubset(set(season)):
                extras = set(peak) - set(season)
                errors.append(f"{prefix}: peak months {extras} not in season")
                continue

            # Duplicate check
            key = (slug, region, source, tuple(sorted(season)))
            if key in current_keys:
                errors.append(f"{prefix}: duplicate entry already exists in CSV")
                continue

            # Build the CSV row
            notes = entry.get('notes', '')
            storage = entry.get('storage', '')
            valid_rows.append({
                'produce_slug': slug,
                'region_slug': region,
                'season_months': json.dumps(sorted(season)),
                'peak_months': json.dumps(sorted(peak)),
                'source_type': source,
                'notes': notes,
                'storage_tip': storage,
            })
            current_keys.add(key)

    return valid_rows, errors


def append_rows(rows):
    """Append validated rows to produce_seasons.csv."""
    with open(SEASONS_CSV, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        for row in rows:
            writer.writerow(row)


def main():
    parser = argparse.ArgumentParser(description='Validate and append season data from a JSON batch.')
    parser.add_argument('batch_file', help='Path to batch JSON file')
    parser.add_argument('--dry-run', action='store_true', help='Validate only, do not write')
    args = parser.parse_args()

    with open(args.batch_file) as f:
        batch = json.load(f)

    if not isinstance(batch, list):
        print("ERROR: Batch file must contain a JSON array.")
        sys.exit(1)

    produce_slugs = {r['canonical_slug'] for r in load_csv('produce_items.csv')}
    region_slugs = {r['region_slug'] for r in load_csv('regions.csv')}
    current_keys = existing_keys()

    valid_rows, errors = validate_batch(batch, produce_slugs, region_slugs, current_keys)

    if errors:
        print(f"ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
        print()

    if args.dry_run:
        print(f"Dry run: {len(valid_rows)} rows would be added, {len(errors)} rejected.")
        if errors:
            sys.exit(1)
        return

    if errors:
        print(f"Batch rejected: {len(errors)} errors found. No rows were written.")
        sys.exit(1)

    if not valid_rows:
        print("No valid rows to add.")
        return

    append_rows(valid_rows)
    print(f"Added {len(valid_rows)} rows to produce_seasons.csv.")


if __name__ == '__main__':
    main()
