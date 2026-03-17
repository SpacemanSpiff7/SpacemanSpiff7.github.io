"""Reports produce items missing season data, grouped by category."""

import argparse
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
    parser = argparse.ArgumentParser(description='Report produce items missing season data.')
    parser.add_argument('--category', nargs='+', help='Filter to specific categories')
    parser.add_argument('--json', action='store_true', dest='json_output',
                        help='Output machine-readable JSON')
    args = parser.parse_args()

    produce = load_csv('produce_items.csv')
    seasons = load_csv('produce_seasons.csv')

    items_with_seasons = {r['produce_slug'] for r in seasons}

    # Build category -> slug mapping
    by_category = {}
    for row in produce:
        cat = row['category']
        slug = row['canonical_slug']
        if cat not in by_category:
            by_category[cat] = {'all': [], 'missing': []}
        by_category[cat]['all'].append(slug)
        if slug not in items_with_seasons:
            by_category[cat]['missing'].append(slug)

    # Filter categories if requested
    if args.category:
        filtered = {}
        requested = {c.lower() for c in args.category}
        for cat in by_category:
            if cat.lower() in requested:
                filtered[cat] = by_category[cat]
        by_category = filtered

    # Sort categories and slugs
    for cat in by_category:
        by_category[cat]['all'].sort()
        by_category[cat]['missing'].sort()

    total_items = sum(len(v['all']) for v in by_category.values())
    total_missing = sum(len(v['missing']) for v in by_category.values())
    total_covered = total_items - total_missing

    if args.json_output:
        output = {
            'coverage': {
                'total': total_items,
                'covered': total_covered,
                'missing': total_missing,
                'pct': round(total_covered / total_items * 100, 1) if total_items else 0,
            },
            'categories': {}
        }
        for cat in sorted(by_category):
            info = by_category[cat]
            if info['missing']:
                output['categories'][cat] = {
                    'total': len(info['all']),
                    'missing': len(info['missing']),
                    'slugs': info['missing'],
                }
        json.dump(output, sys.stdout, indent=2)
        print()
        return

    # Human-readable output
    print(f"Coverage: {total_covered}/{total_items} items have season data "
          f"({round(total_covered / total_items * 100, 1) if total_items else 0}%)")
    print(f"Missing: {total_missing} items\n")

    for cat in sorted(by_category):
        info = by_category[cat]
        if not info['missing']:
            continue
        print(f"{cat} ({len(info['missing'])} missing / {len(info['all'])} total):")
        for slug in info['missing']:
            print(f"  {slug}")
        print()


if __name__ == '__main__':
    main()
