"""Merges CSV layers into compiled.json for the web app."""

import csv
import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
WEB = os.path.join(ROOT, 'web')


def load_csv(filename):
    path = os.path.join(DATA, filename)
    try:
        with open(path) as f:
            return list(csv.DictReader(f))
    except (OSError, csv.Error) as e:
        print(f"ERROR: Failed to read {path}: {e}")
        sys.exit(1)


def main():
    errors = []
    produce_rows = load_csv('produce_items.csv')
    region_rows = load_csv('regions.csv')
    season_rows = load_csv('produce_seasons.csv')

    produce = []
    for r in produce_rows:
        produce.append({
            'slug': r['canonical_slug'],
            'name': r['canonical_name'],
            'category': r['category'],
            'culinaryGroup': r['culinary_group'],
        })

    regions = []
    for i, r in enumerate(region_rows):
        line = i + 2
        try:
            lat = float(r['latitude'])
            lng = float(r['longitude'])
        except (ValueError, TypeError) as e:
            errors.append(f"regions.csv line {line}: invalid coordinates: {e}")
            continue
        if not (-90 <= lat <= 90):
            errors.append(f"regions.csv line {line}: latitude {lat} out of range (-90..90)")
        if not (-180 <= lng <= 180):
            errors.append(f"regions.csv line {line}: longitude {lng} out of range (-180..180)")
        regions.append({
            'slug': r['region_slug'],
            'name': r['region_name'],
            'originGroup': r['origin_group'],
            'country': r['country'],
            'lat': lat,
            'lng': lng,
        })

    seasons = []
    for i, r in enumerate(season_rows):
        line = i + 2
        try:
            season_months = json.loads(r['season_months'])
        except (json.JSONDecodeError, TypeError) as e:
            errors.append(f"produce_seasons.csv line {line}: invalid season_months JSON: {e}")
            continue
        try:
            peak_months = json.loads(r['peak_months'])
        except (json.JSONDecodeError, TypeError) as e:
            errors.append(f"produce_seasons.csv line {line}: invalid peak_months JSON: {e}")
            continue
        seasons.append({
            'p': r['produce_slug'],
            'r': r['region_slug'],
            's': season_months,
            'pk': peak_months,
            't': r['source_type'],
            'n': r['notes'],
            'st': r['storage_tip'],
        })

    if errors:
        print(f"ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)

    items_with_seasons = len(set(s['p'] for s in seasons))

    compiled = {
        'produce': produce,
        'regions': regions,
        'seasons': seasons,
        'meta': {
            'generated': datetime.now(timezone.utc).isoformat(),
            'produceCount': len(produce),
            'seasonsCount': len(seasons),
            'coveragePct': round(items_with_seasons / len(produce) * 100, 1),
        }
    }

    # Write to data/ and web/
    for out_dir in [DATA, WEB]:
        out_path = os.path.join(out_dir, 'compiled.json' if out_dir == DATA else 'data.json')
        os.makedirs(out_dir, exist_ok=True)
        with open(out_path, 'w') as f:
            json.dump(compiled, f, separators=(',', ':'))
        size = os.path.getsize(out_path)
        print(f"Wrote {out_path} ({size:,} bytes)")

    print(f"\nProduce: {len(produce)}, Regions: {len(regions)}, Seasons: {len(seasons)}")
    print(f"Coverage: {compiled['meta']['coveragePct']:.1f}%")


if __name__ == '__main__':
    main()
