# LLM Doc Audit Report

Audit date: 2026-03-16

Scope reviewed:
- `CLAUDE.md`
- `README.md`
- `docs/DATA_SOURCES.md`
- `docs/LESSONS.md`
- `reference/DESIGN_DIRECTION.md`
- `reference/STONE_FRUIT_GUIDE.md`

Method:
- Repo-local claims were checked against the current tree, `web/*`, `data/*`, `web/data.json`, `scripts/validate_data.py`, and the parent-site references `../data-sources.md` and `../../data/projects.json`.
- External factual claims were spot-checked against primary or closest-available sources such as UC ANR, California commodity-board sites, and Dave Wilson Nursery harvest references.
- Claims verified as true are omitted below. This report includes only false claims to correct and claims that could not be verified.

## False Claims To Correct

### `CLAUDE.md`

- `CLAUDE.md:31-47` The architecture block is stale. The repo now has 335 produce items, 33 regions, and 284 season entries, `docs/` contains both `LESSONS.md` and `DATA_SOURCES.md`, `web/compact.html` no longer exists, and `web/stone-fruit-guide.html` now does.  
  Correction: update the tree and counts to match the current repo.  
  Evidence: `python scripts/validate_data.py`, `find . -maxdepth 2 -type f | sort`, `web/index.html`.

- `CLAUDE.md:56` `web/data.json` is not “<100KB.”  
  Correction: current size is 134,248 bytes.  
  Evidence: `ls -l web/data.json data/compiled.json`.

- `CLAUDE.md:62-64` The data-model counts are stale.  
  Correction: `produce_items.csv` has 335 rows, `regions.csv` has 33 rows, `produce_seasons.csv` has 284 rows, and 208 items currently have season data.  
  Evidence: `python scripts/validate_data.py`, `python - <<'PY' ...` row counts.

- `CLAUDE.md:92` The filter dropdown does not show a badge count of active filters.  
  Correction: the current UI shrinks the filter button and reveals a reset button when filters are active; there is no numeric badge.  
  Evidence: `web/index.html:66-75`, `web/style.css:590-652`, `web/app.js:636-639`.

- `CLAUDE.md:134` The “leaf embellishments” note is obsolete. The current `buildLeafDecor()` implementation draws bezel circles only; it does not render leaf or botanical shapes.  
  Correction: remove this gotcha or rewrite it to describe the bezel circles.  
  Evidence: `web/index.html:41`, `web/app.js:601-613`.

### `README.md`

- `README.md:14` The middle ring category list is incomplete.  
  Correction: the current middle ring includes `Flwr` / `Edible Flower` in addition to Fruit, Veg, Chile, Herb, Mushroom, Nut, Local, and Import.  
  Evidence: `web/app.js:269-281`.

- `README.md:49-57` The “Grid View” section describes a feature that does not exist in the current app. There is no grid view, no grid cards, and no bars/grid toggle.  
  Correction: remove this section or mark it as unimplemented.  
  Evidence: `web/index.html:96-101`, `web/app.js` only renders `renderTimeline()`, and there is no grid-view DOM/CSS/JS.

- `README.md:64` “Click any item (in timeline or grid)” is false because there is no grid view.  
  Correction: detail-panel opening currently applies to timeline rows and peak-strip cards only.  
  Evidence: `web/app.js:694-747`, `web/app.js:1097-1108`.

- `README.md:100-102` The dataset counts are stale.  
  Correction: 335 canonical produce items, 33 regions, and 284 season entries covering 208 items.  
  Evidence: `python scripts/validate_data.py`, `web/data.json`.

- `README.md:146` `web/compact.html` is listed in the architecture block, but that file has been deleted.  
  Correction: remove the compact-view entry and add current files if you want the tree to remain representative.  
  Evidence: `find . -maxdepth 2 -type f | sort`, `git status --short`.

### `docs/DATA_SOURCES.md`

- `docs/DATA_SOURCES.md:30-31` The coverage figures are stale.  
  Correction: the current dataset has season data for 208 of 335 items (62.1%), not 97 items initially and “~160+” after expansion.  
  Evidence: `python scripts/validate_data.py`, `web/data.json`.

### `docs/LESSONS.md`

- `docs/LESSONS.md:52` The coverage note is stale.  
  Correction: current coverage is 208 of 335 items, not 97 of 332.  
  Evidence: `python scripts/validate_data.py`.

- `docs/LESSONS.md:86` The background description still talks about a “flat dark teal background,” but the shipped app now uses a warm light background.  
  Correction: update this note to describe the current off-white theme if it is meant to reflect the live app.  
  Evidence: `web/style.css:10-12`, `web/style.css:90`.

- `docs/LESSONS.md:90` The “leaf/botanical decorations” note is obsolete for the same reason as `CLAUDE.md:134`: the current SVG helper builds bezel circles, not leaf shapes.  
  Correction: remove or rewrite the note to match the current implementation.  
  Evidence: `web/index.html:41`, `web/app.js:601-613`.

- `docs/LESSONS.md:114` The paper-grain opacity is not 2%.  
  Correction: current opacity is 3.5%.  
  Evidence: `web/style.css:150-156`.

- `docs/LESSONS.md:138` “Items where ... peak = all 12 months are hidden” is false. The implementation hides only items whose season spans all 12 months and whose peak list is empty. Any non-empty peak data keeps the item visible.  
  Correction: rewrite the rule to match `isYearRound()`.  
  Evidence: `web/app.js:134-145`.

### `reference/DESIGN_DIRECTION.md`

- `reference/DESIGN_DIRECTION.md:13-31,190-235` The document specifies a dark teal / near-black theme and matching CSS variable block, but the shipped app uses a warm light palette (`#F7F3ED`, `#FFFDF8`, `#D4702C`).  
  Correction: either label this as superseded historical direction or update it to the current theme.  
  Evidence: `web/style.css:10-29`.

- `reference/DESIGN_DIRECTION.md:46-60` The document says the ring concept is “simplified to a single prominent ring,” but the shipped app uses three functional concentric rings for month, category/source, and status.  
  Correction: update the design doc or mark this as abandoned direction.  
  Evidence: `web/index.html:40-45`, `web/app.js:259-597`.

- `reference/DESIGN_DIRECTION.md:69-106,174,254,262,270` The document specifies a grid-card view and a bars/grid toggle, but the current app has timeline-only rendering.  
  Correction: remove or label the grid-view spec as unimplemented.  
  Evidence: `web/index.html:96-101`, `web/app.js` only implements timeline and peak-strip rendering.

- `reference/DESIGN_DIRECTION.md:71,104,118-125,180-184` The document repeatedly specifies emoji-based UI elements, but the current app intentionally uses plain text and the repo guidance explicitly says not to use emojis.  
  Correction: remove emoji-based instructions.  
  Evidence: `CLAUDE.md:139-141`, `web/app.js:714-715`, `web/app.js:880-881`.

- `reference/DESIGN_DIRECTION.md:94-95,183` The document specifies striped import bars, but the current app intentionally gives local and import bars the same visual treatment.  
  Correction: update the design direction to match the shipped timeline treatment.  
  Evidence: `web/style.css:850-862`, `docs/LESSONS.md:58-61`.

- `reference/DESIGN_DIRECTION.md:131-142` The document presents heading/body font choices as undecided, but the app already ships with Fraunces and DM Sans.  
  Correction: note that the choice has been made, or move this section to historical context.  
  Evidence: `web/index.html:9`, `web/style.css:52-53`.

- `reference/DESIGN_DIRECTION.md:242-255` The specified animation sequence no longer matches the implementation timings or behaviors in `playLoadAnimation()`.  
  Correction: update to actual timings if this doc is meant to describe the current build.  
  Evidence: `web/app.js:1009-1043`.

- `reference/DESIGN_DIRECTION.md:302` `compiled.json` is not “<100KB.”  
  Correction: current file size is 134,248 bytes.  
  Evidence: `ls -l data/compiled.json`.

### `reference/STONE_FRUIT_GUIDE.md`

- `reference/STONE_FRUIT_GUIDE.md:21` Babcock is not “late Jun” in the cited Central California timing references I found. Dave Wilson Nursery lists Babcock at July 7 to July 21 / mid-July in Central CA.  
  Correction: change the timing to mid-July or qualify it by region.  
  Evidence: Dave Wilson Nursery, Babcock page: https://www.davewilson.com/nurseries/products/fruit-trees/peach-white/babcock/

- `reference/STONE_FRUIT_GUIDE.md:76` Flavor Queen is not “early Jul” in the Dave Wilson timing references I found. Dave Wilson lists July 15 to July 30 in Fresno and late July into August in Hickman.  
  Correction: change the timing to mid/late July into August.  
  Evidence: https://www.wheretobuy.davewilson.com/product-information-commercial/product/flavor-queen-pluot-interspecific-plum and https://www.davewilson.com/nurseries/products/fruit-trees/pluot-interspecific/flavor_queen/

- `reference/STONE_FRUIT_GUIDE.md:77` Flavor Grenade is not well described as “Jul--Aug.” Dave Wilson lists August 1 to August 15 in Fresno and as late as August 30 to October 2 in another catalog reference.  
  Correction: move the stated window later and qualify it by location/catalog.  
  Evidence: https://www.davewilson.com/growers/products/fruit-trees/pluot-interspecific/flavor_grenade/ and https://www.davewilson.com/nurseries/products/fruit-trees/pluot-interspecific/flavor_grenade/

- `reference/STONE_FRUIT_GUIDE.md:87` “Patterson dominates commercial production (~95% of CA crop)” is overstated. UC ANR summarizes Patterson at 81% of California volume in one cited source and 82% of processed volume in another.  
  Correction: replace `~95%` with a sourced figure in the low-80% range, or avoid giving a percentage without a year/source.  
  Evidence: UC ANR Apricot Scion & Rootstock Selection: https://ucanr.edu/site/fruit-nut-research-information-center/apricot-scion-rootstock-selection and UC ANR overview snippet surfaced via search.

## Claims Not Verified

### `docs/DATA_SOURCES.md`

- `docs/DATA_SOURCES.md:3,7-26` I could verify that several named organizations and resources exist, but I could not verify from repo evidence that these specific sources were in fact used to build this dataset, or that each one served the exact “primary” role claimed here. The repo has no citation map from source to item/row.  
  Gap: methodology provenance is asserted, not documented.

- `docs/DATA_SOURCES.md:38,41-44` I could not independently verify the methodology claims about what the month ranges and peak windows represent, the storage-window adjustments, or the “2--4 weeks year to year” variability statement, because the repo does not tie individual rows to source notes.  
  Gap: no per-row sourcing or explanation of how month windows were derived.

### `reference/STONE_FRUIT_GUIDE.md`

- `reference/STONE_FRUIT_GUIDE.md:5` The broad claim that “most grocery store stone fruit is bred for shipping durability, not flavor” is plausible but not verifiable as written without a cited industry or breeding source.  
  Gap: unsupported generalization.

- `reference/STONE_FRUIT_GUIDE.md:15,41,74` Superlative cultivar claims such as “widely considered the best yellow peach ever bred,” “widely considered the sweetest nectarine,” and “widely considered THE best pluot” were not verifiable from authoritative sources.  
  Gap: these need cited tasting data or should be rewritten as opinion.

- `reference/STONE_FRUIT_GUIDE.md:28,72,78,100` I could not verify several objective-seeming cultivar/quality claims, including “Galaxy is the main commercial variety,” “pluots typically measure 2-5 brix higher than plums,” and “Rainier [has the] highest sugar content of common varieties.”  
  Gap: no authoritative cultivar-performance or sugar-data sources were cited.

- `reference/STONE_FRUIT_GUIDE.md:33,49,64,106,113` The import-quality claims about Chilean peaches/nectarines/plums/cherries and cold-chain texture effects were not verifiable from the sources reviewed.  
  Gap: these are factual market/quality claims stated without sourcing.

- `reference/STONE_FRUIT_GUIDE.md:86` I confirmed Blenheim is associated with the Ark of Taste in secondary sources, but I did not get a primary Ark-of-Taste entry for this variety during this pass, so I am not marking it false. The “often just 10 days” season-length claim also remained insufficiently sourced.  
  Gap: needs direct Ark-of-Taste citation and a primary harvest-window source.

- `reference/STONE_FRUIT_GUIDE.md:112-116` The buying-guide rules (“If it doesn’t smell like anything, it won’t taste like anything,” “Ripe at the store usually means 2 days out,” etc.) were not verifiable as universal factual rules.  
  Gap: these read as expert heuristics/opinion, not sourced facts.

## Notes

- The biggest recurring problem is staleness, not fabrication: repo counts, file inventory, and implemented UI behavior changed after these docs were written.
- The second biggest problem is missing provenance: external-source and horticulture claims are often plausible, but the repo does not document which source supports which statement.
