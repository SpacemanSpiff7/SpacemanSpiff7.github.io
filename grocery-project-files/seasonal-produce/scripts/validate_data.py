"""Validates data integrity across all CSV layers and reports coverage."""

import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')


def load_csv(filename):
    path = os.path.join(DATA, filename)
    with open(path) as f:
        return list(csv.DictReader(f))


def main():
    errors = []
    warnings = []

    produce = load_csv('produce_items.csv')
    regions = load_csv('regions.csv')
    seasons = load_csv('produce_seasons.csv')

    produce_slugs = {r['canonical_slug'] for r in produce}
    region_slugs = {r['region_slug'] for r in regions}

    print(f"Produce items: {len(produce)}")
    print(f"Regions: {len(regions)}")
    print(f"Season entries: {len(seasons)}")

    # Count aliases for summary (full validation happens later)
    aliases_path = os.path.join(DATA, 'produce_aliases.csv')
    if os.path.exists(aliases_path):
        alias_rows = load_csv('produce_aliases.csv')
        print(f"Aliases: {len(alias_rows)}")
    print()

    # Check for duplicate produce slugs
    seen = set()
    for r in produce:
        s = r['canonical_slug']
        if s in seen:
            errors.append(f"Duplicate produce slug: {s}")
        seen.add(s)

    # Check for duplicate region slugs
    seen = set()
    for r in regions:
        s = r['region_slug']
        if s in seen:
            errors.append(f"Duplicate region slug: {s}")
        seen.add(s)

    # Validate each season entry
    items_with_seasons = set()
    for i, row in enumerate(seasons):
        line = i + 2  # 1-indexed + header
        slug = row['produce_slug']
        region = row['region_slug']

        if slug not in produce_slugs:
            errors.append(f"Line {line}: produce_slug '{slug}' not in produce_items.csv")

        if region not in region_slugs:
            errors.append(f"Line {line}: region_slug '{region}' not in regions.csv")

        try:
            season_months = json.loads(row['season_months'])
        except json.JSONDecodeError:
            errors.append(f"Line {line}: invalid JSON in season_months: {row['season_months']}")
            continue

        try:
            peak_months = json.loads(row['peak_months'])
        except json.JSONDecodeError:
            errors.append(f"Line {line}: invalid JSON in peak_months: {row['peak_months']}")
            continue

        if not isinstance(season_months, list):
            errors.append(f"Line {line}: season_months is not an array")
            continue
        if not isinstance(peak_months, list):
            errors.append(f"Line {line}: peak_months is not an array")
            continue

        # Validate month values
        for m in season_months:
            if not isinstance(m, int) or m < 1 or m > 12:
                errors.append(f"Line {line}: invalid month {m} in season_months")

        for m in peak_months:
            if not isinstance(m, int) or m < 1 or m > 12:
                errors.append(f"Line {line}: invalid month {m} in peak_months")

        # Check for duplicates within arrays
        if len(season_months) != len(set(season_months)):
            errors.append(f"Line {line}: duplicate months in season_months")
        if len(peak_months) != len(set(peak_months)):
            errors.append(f"Line {line}: duplicate months in peak_months")

        # Peak must be subset of season
        if peak_months and season_months:
            peak_set = set(peak_months)
            season_set = set(season_months)
            if not peak_set.issubset(season_set):
                extra = peak_set - season_set
                errors.append(f"Line {line}: peak months {extra} not in season_months for {slug}")

        # Empty season months
        if not season_months:
            warnings.append(f"Line {line}: empty season_months for {slug} in {region}")

        # Source type validation
        if row['source_type'] not in ('local', 'import'):
            errors.append(f"Line {line}: invalid source_type '{row['source_type']}'")

        items_with_seasons.add(slug)

    # Validate aliases (optional file)
    aliases_path = os.path.join(DATA, 'produce_aliases.csv')
    alias_count = 0
    items_with_aliases = set()
    if os.path.exists(aliases_path):
        aliases = load_csv('produce_aliases.csv')
        alias_count = len(aliases)
        alias_map = {}  # lowercase alias -> list of slugs
        for i, row in enumerate(aliases):
            line = i + 2
            slug = row['canonical_slug']
            alias = row['alias'].strip()

            if slug not in produce_slugs:
                errors.append(f"Aliases line {line}: slug '{slug}' not in produce_items.csv")

            if not alias:
                errors.append(f"Aliases line {line}: empty alias for '{slug}'")
                continue

            alias_lower = alias.lower()
            alias_map.setdefault(alias_lower, []).append(slug)
            items_with_aliases.add(slug)

        # Warn on cross-slug aliases (not an error -- e.g., "yam" maps to both yam and orange-sweet-potato)
        for alias_lower, slugs in alias_map.items():
            unique_slugs = list(dict.fromkeys(slugs))
            if len(unique_slugs) > 1:
                warnings.append(f"Alias '{alias_lower}' maps to multiple items: {', '.join(unique_slugs)}")

    # Coverage report
    items_without = produce_slugs - items_with_seasons
    coverage = len(items_with_seasons) / len(produce_slugs) * 100

    print(f"Items with season data: {len(items_with_seasons)}/{len(produce_slugs)} ({coverage:.1f}%)")
    print()

    if errors:
        print(f"ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
        print()

    if warnings:
        print(f"WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  {w}")
        print()

    if not errors:
        print("Validation PASSED")
    else:
        print("Validation FAILED")
        sys.exit(1)


if __name__ == '__main__':
    main()
