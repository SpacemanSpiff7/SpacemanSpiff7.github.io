---
name: add-seasons
description: Research and add seasonal produce data for missing items. Run with a category name, specific item slugs, or no args to see gaps.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, Agent
---

# Add Seasons Skill

Research California produce seasonality and add data for items missing from `produce_seasons.csv`.

## Usage

```
/add-seasons                      # Show coverage gaps
/add-seasons Herb                 # Research all missing herbs
/add-seasons Fruit --count 10    # Research 10 missing fruits
/add-seasons arrowroot cassava   # Research specific items by slug
```

## Workflow

1. **Identify gaps.** Run `python seasonal-produce/scripts/find_gaps.py --json` (optionally with `--category <name>`) to see what's missing.

2. **Determine targets.** If the user specified:
   - A category name (capitalized, matches produce_items.csv categories): filter to that category's missing items
   - Specific slugs (lowercase-with-dashes): research those exact items
   - `--count N`: limit to N items from the filtered set
   - No args: just show the gap report and ask what to research

3. **Research each item.** For each target item:
   - Use web search with queries like `"<item name>" California growing season harvest months`
   - Prioritize authoritative sources: UC ANR, USDA, CDFA, university extension programs
   - Also use training knowledge for common produce
   - Determine: which CA sub-region(s) grow it, season months, peak months, local vs import
   - For imports: identify the primary origin country and match to a region slug in `regions.csv`
   - Items can have BOTH local AND import entries -- this is correct and expected

4. **Choose regions carefully.** Read `seasonal-produce/scripts/convert_seed.py` for the `LOCAL_REGION_OVERRIDES` dict to see which CA sub-regions are used for similar crops. Common mappings:
   - Leafy greens / cool-weather crops: `salinas-valley`, `santa-maria-valley`
   - Tree fruit / nuts: `central-valley`, `sacramento-valley`
   - Citrus / avocados: `socal-coastal`, `ventura-county`, `san-diego-county`
   - Desert crops: `coachella-valley`, `imperial-valley`
   - Berries: `santa-maria-valley`, `central-coast`
   - Mexican imports: `sinaloa`, `michoacan`, `baja-california`, `sonora`

5. **Generate batch JSON.** Create a file at `seasonal-produce/scripts/batches/<timestamp>_<label>.json` with this schema:
   ```json
   [
     {
       "slug": "arrowroot",
       "entries": [
         {
           "region": "central-valley",
           "season": [5, 6, 7, 8, 9, 10],
           "peak": [7, 8, 9],
           "source": "local",
           "notes": "Tropical root crop grown in warm CA valleys.",
           "storage": "Store in cool dark place. Keeps 2 weeks."
         }
       ]
     }
   ]
   ```

6. **Validate.** Run `python seasonal-produce/scripts/add_seasons.py <batch> --dry-run` to check for errors.

7. **Show the user what will be added** and ask for confirmation before proceeding.

8. **Run the pipeline.** After confirmation: `bash seasonal-produce/scripts/pipeline.sh <batch>`

9. **Report results.** Show final coverage stats.

## Data Quality Rules

- No emojis in notes or storage tips
- Notes should be specific and informative -- mention varieties, flavor notes, growing context
- Storage tips should be practical and specific (days/weeks, temperature, method)
- Season months are 1-12 integers (January = 1)
- Peak months must be a subset of season months
- Use `source_type: "local"` for CA-grown, `"import"` for everything else
- Sort month arrays ascending
- Match the quality and style of existing entries in produce_seasons.csv

## File Paths (relative to working directory)

- Items list: `seasonal-produce/data/produce_items.csv`
- Regions: `seasonal-produce/data/regions.csv`
- Seasons CSV: `seasonal-produce/data/produce_seasons.csv`
- Gap finder: `seasonal-produce/scripts/find_gaps.py`
- Batch adder: `seasonal-produce/scripts/add_seasons.py`
- Pipeline: `seasonal-produce/scripts/pipeline.sh`
- Batch output dir: `seasonal-produce/scripts/batches/`
