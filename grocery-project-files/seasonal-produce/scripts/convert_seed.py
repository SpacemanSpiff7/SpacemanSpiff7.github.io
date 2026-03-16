"""One-time script: converts input/produce_seasons_seed.json -> data/produce_seasons.csv"""

import csv
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Slug remapping: seed ID -> canonical CSV slug
SLUG_REMAP = {
    'chard': 'swiss-chard',
    'mushroom': 'button-mushroom',
    'pea': 'english-pea',
    'pomelo': 'pummelo',
    'melon-honeydew': 'honeydew',
    'squash-summer': 'zucchini',
    'squash-winter': 'butternut-squash',
    'chile-pepper': 'jalapeno',
}

# Import region mapping: seed region string -> list of region_slugs
IMPORT_REGION_MAP = {
    'Mexico': ['sinaloa'],
    'Chile': ['chile-central'],
    'Chile/New Zealand': ['chile-central', 'new-zealand'],
    'Chile/Peru': ['chile-central', 'peru-coast'],
    'Mexico/Peru': ['sinaloa', 'peru-coast'],
    'Mexico/Central America': ['sinaloa', 'guatemala'],
    'Mexico/Southeast Asia': ['sinaloa', 'southeast-asia'],
    'Central America': ['costa-rica'],
    'Central America/Ecuador': ['costa-rica', 'ecuador'],
    'Central America/Vietnam': ['costa-rica', 'southeast-asia'],
    'Costa Rica/Central America': ['costa-rica', 'guatemala'],
    'Peru/Ecuador/Brazil': ['peru-coast', 'ecuador', 'brazil'],
}

# Local region mapping by crop type / item ID
# Maps seed item ID -> list of CA region slugs
LOCAL_REGION_OVERRIDES = {
    # Berries
    'strawberry': ['santa-maria-valley', 'salinas-valley'],
    'raspberry': ['santa-maria-valley', 'central-coast'],
    'blackberry': ['central-coast'],
    'blueberry': ['central-valley', 'north-coast'],

    # Citrus
    'blood-orange': ['central-valley', 'socal-coastal'],
    'grapefruit': ['coachella-valley', 'socal-coastal'],
    'kumquat': ['central-valley'],
    'lemon': ['ventura-county', 'socal-coastal'],
    'lime': ['socal-coastal'],
    'mandarin': ['central-valley', 'socal-coastal'],
    'meyer-lemon': ['socal-coastal', 'central-coast'],
    'navel-orange': ['central-valley', 'socal-coastal'],
    'valencia-orange': ['central-valley', 'socal-coastal'],
    'tangelo': ['central-valley'],
    'pummelo': ['central-valley'],

    # Stone fruit
    'apricot': ['central-valley'],
    'cherry': ['central-valley', 'sacramento-valley'],
    'nectarine': ['central-valley'],
    'peach': ['central-valley'],
    'plum': ['central-valley'],
    'pluot': ['central-valley'],

    # Pome fruit
    'apple': ['sacramento-valley', 'sierra-foothills'],
    'asian-pear': ['central-valley', 'sacramento-valley'],
    'pear': ['sacramento-valley', 'central-valley'],

    # Tropical/subtropical
    'avocado': ['san-diego-county', 'ventura-county'],
    'cherimoya': ['socal-coastal'],
    'fig': ['central-valley'],
    'guava': ['socal-coastal'],
    'loquat': ['socal-coastal'],
    'persimmon': ['central-valley'],
    'pomegranate': ['central-valley'],
    'cactus-pear': ['socal-coastal'],
    'cactus-pad': ['socal-coastal'],
    'date': ['coachella-valley'],
    'olive': ['central-valley', 'sacramento-valley'],
    'passion-fruit': ['socal-coastal'],

    # Leafy greens
    'arugula': ['salinas-valley'],
    'bok-choy': ['salinas-valley'],
    'cabbage': ['salinas-valley', 'central-valley'],
    'collard-greens': ['salinas-valley'],
    'kale': ['salinas-valley', 'central-coast'],
    'lettuce': ['salinas-valley'],
    'spinach': ['salinas-valley'],
    'swiss-chard': ['salinas-valley'],
    'radicchio': ['salinas-valley'],

    # Artichoke/asparagus
    'artichoke': ['central-coast'],
    'asparagus': ['central-valley', 'imperial-valley'],

    # Brassica
    'broccoli': ['salinas-valley', 'central-coast'],
    'broccoli-rabe': ['salinas-valley'],
    'brussels-sprout': ['central-coast'],
    'cauliflower': ['salinas-valley', 'central-coast'],
    'kohlrabi': ['salinas-valley'],
    'romanesco': ['salinas-valley'],

    # Root/tuber
    'beet': ['central-valley', 'salinas-valley'],
    'carrot': ['central-valley', 'imperial-valley'],
    'celery-root': ['central-coast'],
    'parsnip': ['central-coast'],
    'potato': ['central-valley'],
    'radish': ['central-valley', 'salinas-valley'],
    'rutabaga': ['central-valley'],
    'sunchoke': ['central-valley'],
    'sweet-potato': ['central-valley'],
    'turnip': ['central-valley'],

    # Allium
    'garlic': ['central-valley'],
    'green-garlic': ['central-coast', 'central-valley'],
    'leek': ['central-coast'],
    'onion': ['central-valley', 'imperial-valley'],

    # Cucurbit
    'cantaloupe': ['central-valley', 'imperial-valley'],
    'cucumber': ['central-valley'],
    'honeydew': ['central-valley', 'imperial-valley'],
    'pumpkin': ['central-valley'],
    'zucchini': ['central-valley'],
    'watermelon': ['central-valley', 'imperial-valley'],

    # Other veg
    'bell-pepper': ['central-valley'],
    'jalapeno': ['central-valley'],
    'corn': ['central-valley'],
    'eggplant': ['central-valley'],
    'fava-bean': ['central-coast', 'central-valley'],
    'fennel': ['central-coast'],
    'green-bean': ['central-valley'],
    'english-pea': ['central-coast', 'salinas-valley'],
    'rhubarb': ['north-coast'],
    'tomatillo': ['central-valley'],
    'tomato': ['central-valley'],

    # Nuts
    'almond': ['central-valley'],
    'walnut': ['central-valley', 'sacramento-valley'],

    # Mushroom
    'button-mushroom': ['central-coast'],

    # Grape (table)
    'grape': ['central-valley'],

    # Melon
    'dragon-fruit': ['socal-coastal'],
}

# Default CA region for items not in overrides
DEFAULT_LOCAL_REGIONS = ['central-valley']


def expand_month_range(start, end):
    """Expand [start, end] into list of months, handling wrapping."""
    if start <= end:
        return list(range(start, end + 1))
    else:
        return list(range(start, 13)) + list(range(1, end + 1))


def expand_month_ranges(ranges):
    """Expand list of [start, end] pairs into flat sorted month list."""
    months = set()
    for r in ranges:
        if isinstance(r, list) and len(r) == 2:
            months.update(expand_month_range(r[0], r[1]))
        elif isinstance(r, int):
            months.add(r)
    return sorted(months)


def get_local_regions(slug):
    """Get CA sub-regions for a local produce item."""
    return LOCAL_REGION_OVERRIDES.get(slug, DEFAULT_LOCAL_REGIONS)


def get_import_regions(region_str):
    """Map seed region string to list of region_slugs."""
    if region_str in IMPORT_REGION_MAP:
        return IMPORT_REGION_MAP[region_str]
    # Fallback
    print(f"  WARNING: Unknown import region '{region_str}', defaulting to sinaloa")
    return ['sinaloa']


def local_region_variant(region_str):
    """Handle local region variants like 'California (Central Valley)'."""
    mapping = {
        'California': None,  # use crop-based lookup
        'California (cold storage)': None,  # use crop-based lookup
        'California (second crop)': None,  # use crop-based lookup
        'California (Central Valley)': ['central-valley'],
        'California (Coachella Valley)': ['coachella-valley'],
        'California (SoCal)': ['socal-coastal'],
    }
    return mapping.get(region_str)


def main():
    seed_path = os.path.join(ROOT, 'input', 'produce_seasons_seed.json')
    out_path = os.path.join(ROOT, 'data', 'produce_seasons.csv')

    with open(seed_path) as f:
        seed = json.load(f)

    rows = []

    for item in seed:
        raw_slug = item['id']
        slug = SLUG_REMAP.get(raw_slug, raw_slug)
        notes = item.get('notes', '')
        storage_tip = item.get('storage_tip', '')

        for season in item['seasons']:
            source = season['source']
            region_str = season['region']
            avail = expand_month_ranges(season.get('available', []))
            peak = expand_month_ranges(season.get('peak', []))

            if source == 'local':
                # Check for specific region variant first
                variant = local_region_variant(region_str)
                if variant is not None:
                    region_slugs = variant
                else:
                    region_slugs = get_local_regions(slug)

                for rs in region_slugs:
                    rows.append({
                        'produce_slug': slug,
                        'region_slug': rs,
                        'season_months': json.dumps(avail),
                        'peak_months': json.dumps(peak),
                        'source_type': 'local',
                        'notes': notes,
                        'storage_tip': storage_tip,
                    })
            else:
                # Import
                region_slugs = get_import_regions(region_str)
                for rs in region_slugs:
                    rows.append({
                        'produce_slug': slug,
                        'region_slug': rs,
                        'season_months': json.dumps(avail),
                        'peak_months': json.dumps(peak),
                        'source_type': 'import',
                        'notes': notes,
                        'storage_tip': storage_tip,
                    })

    # Deduplicate: same produce_slug + region_slug + source_type gets merged
    # (but different season windows for same item+region should stay separate)
    with open(out_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'produce_slug', 'region_slug', 'season_months', 'peak_months',
            'source_type', 'notes', 'storage_tip'
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {out_path}")


if __name__ == '__main__':
    main()
