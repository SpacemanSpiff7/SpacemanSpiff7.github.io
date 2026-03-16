"""Merges CSV layers into compiled.json for the web app."""

import csv
import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
WEB = os.path.join(ROOT, 'web')


def load_csv(filename):
    path = os.path.join(DATA, filename)
    with open(path) as f:
        return list(csv.DictReader(f))


def main():
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
    for r in region_rows:
        regions.append({
            'slug': r['region_slug'],
            'name': r['region_name'],
            'originGroup': r['origin_group'],
            'country': r['country'],
            'lat': float(r['latitude']),
            'lng': float(r['longitude']),
        })

    seasons = []
    for r in season_rows:
        seasons.append({
            'produceSlug': r['produce_slug'],
            'regionSlug': r['region_slug'],
            'seasonMonths': json.loads(r['season_months']),
            'peakMonths': json.loads(r['peak_months']),
            'sourceType': r['source_type'],
            'notes': r['notes'],
            'storageTip': r['storage_tip'],
        })

    items_with_seasons = len(set(s['produceSlug'] for s in seasons))

    compiled = {
        'produce': produce,
        'regions': regions,
        'seasons': seasons,
        'meta': {
            'generated': datetime.now(timezone.utc).isoformat(),
            'produceCount': len(produce),
            'seasonsCount': len(seasons),
            'coveragePct': round(items_with_seasons / len(produce) * 100),
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
    print(f"Coverage: {compiled['meta']['coveragePct']}%")


if __name__ == '__main__':
    main()
