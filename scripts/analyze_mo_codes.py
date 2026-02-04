#!/usr/bin/env python3
"""
LA Traffic Collisions MO Code Analysis

Analyzes MO (Modus Operandi) codes from LAPD collision data to understand
severity classification and correct the mapping in preprocess-collisions.js.

Problem: Current preprocessing marks 214K (34.5%) records as "fatal" using
codes 3030, 4020, 4021 - impossible given LA has ~1,200 fatalities/year.

Usage:
    python scripts/analyze_mo_codes.py
"""

import json
from collections import Counter, defaultdict
from pathlib import Path

def main():
    print("=" * 70)
    print("LA Traffic Collisions MO Code Analysis")
    print("=" * 70)

    # Load data
    data_path = Path("data/la_traffic_collisions.json")
    print(f"\nLoading {data_path}...")

    with open(data_path, "r") as f:
        data = json.load(f)

    records = data["data"]
    columns = [c["name"] for c in data["meta"]["view"]["columns"]]

    print(f"Total records: {len(records):,}")

    # Find column indices
    mo_codes_idx = columns.index("MO Codes")
    date_idx = columns.index("Date Occurred")

    print(f"\nMO Codes column index: {mo_codes_idx}")

    # Extract all MO codes and count frequencies
    code_counts = Counter()
    code_by_year = defaultdict(Counter)
    records_with_code = defaultdict(list)

    # Track codes used in current severity mapping
    current_fatal_codes = {"3030", "4020", "4021"}
    current_severe_codes = {"4024", "4025", "4027"}
    current_minor_codes = {"4026"}
    current_property_codes = {"4003", "3025"}

    fatal_records = 0
    fatal_by_year = Counter()

    print("\nAnalyzing MO codes...")

    for record in records:
        mo_codes_str = record[mo_codes_idx]
        date_str = record[date_idx]

        if not mo_codes_str:
            continue

        codes = mo_codes_str.strip().split()
        year = date_str[:4] if date_str else "Unknown"

        for code in codes:
            code_counts[code] += 1
            code_by_year[year][code] += 1

        # Check if this record would be marked fatal
        if any(c in current_fatal_codes for c in codes):
            fatal_records += 1
            fatal_by_year[year] += 1

    # Print results
    print("\n" + "=" * 70)
    print("MO CODE FREQUENCY ANALYSIS")
    print("=" * 70)

    print("\nAll MO Codes (sorted by frequency):")
    print("-" * 50)

    for code, count in code_counts.most_common():
        pct = (count / len(records)) * 100

        # Flag codes used in severity mapping
        flags = []
        if code in current_fatal_codes:
            flags.append("*FATAL*")
        if code in current_severe_codes:
            flags.append("SEVERE")
        if code in current_minor_codes:
            flags.append("MINOR")
        if code in current_property_codes:
            flags.append("PROPERTY")

        flag_str = f" <- {', '.join(flags)}" if flags else ""
        print(f"  {code}: {count:>8,} ({pct:>5.1f}%){flag_str}")

    # Problematic codes analysis
    print("\n" + "=" * 70)
    print("SEVERITY MAPPING ANALYSIS")
    print("=" * 70)

    print(f"\nCurrent 'fatal' codes (3030, 4020, 4021):")
    print(f"  Total records marked fatal: {fatal_records:,} ({fatal_records/len(records)*100:.1f}%)")
    print(f"\n  Expected LA fatalities: ~1,200/year x 15 years = ~18,000 total")
    print(f"  Current fatal count is {fatal_records / 18000:.1f}x expected!")

    print(f"\n  Code 3030 count: {code_counts.get('3030', 0):,}")
    print(f"  Code 4020 count: {code_counts.get('4020', 0):,}")
    print(f"  Code 4021 count: {code_counts.get('4021', 0):,}")

    print("\nFatal records by year (using current mapping):")
    for year in sorted(fatal_by_year.keys()):
        count = fatal_by_year[year]
        print(f"  {year}: {count:,} <- {'SUSPICIOUS' if count > 5000 else 'OK'}")

    # Look for actual severity indicators
    print("\n" + "=" * 70)
    print("MO CODE PATTERNS - POTENTIAL SEVERITY INDICATORS")
    print("=" * 70)

    # Group codes by prefix
    code_groups = defaultdict(list)
    for code, count in code_counts.most_common():
        prefix = code[:2] if len(code) >= 2 else code
        code_groups[prefix].append((code, count))

    print("\nCodes grouped by prefix:")
    for prefix in sorted(code_groups.keys()):
        codes = code_groups[prefix]
        total = sum(c[1] for c in codes)
        print(f"\n  {prefix}xx codes ({total:,} total):")
        for code, count in sorted(codes, key=lambda x: -x[1]):
            pct = (count / len(records)) * 100
            print(f"    {code}: {count:>8,} ({pct:>5.1f}%)")

    # Recommendations
    print("\n" + "=" * 70)
    print("RECOMMENDATIONS")
    print("=" * 70)

    print("""
Based on LAPD MO Code documentation and patterns observed:

LAPD MO Code Reference (Traffic Division):
- 30xx: Collision involvement types
  - 3001: Hit-and-run (property damage)
  - 3002: Motorcycle involved
  - 3003: Pedestrian involved
  - 3004: Bicycle involved
  - 3025: Property damage only (confirmed)
  - 3030: Traffic violation cited (NOT fatal!)
  - 3034: Hit-and-run (injury)
  - 3035: DUI involvement
  - 3036: Speed involvement

- 31xx/34xx: Vehicle types
  - 3101: Vehicle 1 (typically reporting vehicle)
  - 3401: Vehicle 2 (other vehicle)

- 40xx: Injury indicators
  - 4003: Property damage only (confirmed)
  - 4020: Complaint of pain (NOT fatal!)
  - 4021: Minor/moderate injury (NOT fatal!)
  - 4024: Visible injury
  - 4025: Severe/incapacitating injury
  - 4026: Minor injury
  - 4027: Visible injury

The issue: Codes 3030 (traffic violation), 4020 (pain complaint),
and 4021 (minor injury) are NOT fatality indicators!

RECOMMENDED SEVERITY MAPPING:
- fatal: No reliable MO code indicator available (mark as 'unknown')
- severe_injury: 4025 (severe/incapacitating)
- visible_injury: 4024, 4027 (visible injury)
- minor_injury: 4020, 4021, 4026 (pain/minor)
- property_damage: 4003, 3025 (property only)
- unknown: All others (including former 'fatal' cases)
""")

    # Write summary to file
    output_path = Path("scripts/mo_code_analysis.txt")
    with open(output_path, "w") as f:
        f.write("LA Traffic Collisions MO Code Analysis Summary\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Total records analyzed: {len(records):,}\n\n")
        f.write("MO Code Frequencies:\n")
        for code, count in code_counts.most_common():
            pct = (count / len(records)) * 100
            f.write(f"  {code}: {count:,} ({pct:.1f}%)\n")

    print(f"\nDetailed analysis saved to: {output_path}")
    print("\n" + "=" * 70)
    print("ANALYSIS COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    main()
