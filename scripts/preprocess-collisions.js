#!/usr/bin/env node

/**
 * LA Traffic Collisions Data Preprocessor
 *
 * Converts the raw 303MB JSON file into spatial tiles for browser-based querying.
 *
 * Output:
 * - assets/collisions/tiles/*.json (~300 GeoJSON tiles)
 * - assets/collisions/overview.json (overview aggregates)
 * - assets/collisions/manifest.json (tile metadata)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  inputFile: 'data/la_traffic_collisions.json',
  outputDir: 'assets/collisions',
  tilesDir: 'assets/collisions/tiles',
  tileSize: 0.02, // degrees (~2km x 2km)

  // LA bounding box
  bounds: {
    minLat: 33.7,
    maxLat: 34.35,
    minLon: -118.7,
    maxLon: -118.1
  }
};

// Time buckets (hour ranges)
const TIME_BUCKETS = {
  EARLY_MORNING: { start: 0, end: 6 },    // 12am-6am
  AM_PEAK: { start: 6, end: 10 },         // 6am-10am
  MIDDAY: { start: 10, end: 15 },         // 10am-3pm
  PM_PEAK: { start: 15, end: 19 },        // 3pm-7pm
  EVENING: { start: 19, end: 22 },        // 7pm-10pm
  LATE_NIGHT: { start: 22, end: 24 }      // 10pm-12am
};

function getTimeBucket(hour) {
  for (const [bucket, range] of Object.entries(TIME_BUCKETS)) {
    if (hour >= range.start && hour < range.end) {
      return bucket;
    }
  }
  return 'UNKNOWN';
}

function parseTimeOccurred(timeStr) {
  if (!timeStr || timeStr === '') return null;

  // Time is in HHMM format (e.g., "2335" for 11:35pm)
  const timeNum = parseInt(timeStr, 10);
  if (isNaN(timeNum)) return null;

  const hours = Math.floor(timeNum / 100);
  const minutes = timeNum % 100;

  if (hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) return null;

  return hours * 60 + minutes;
}

/**
 * Check if MO codes string contains any of the specified codes
 */
function hasCode(moCodesStr, codes) {
  if (!moCodesStr) return false;
  const moCodeArray = moCodesStr.trim().split(/\s+/);
  return codes.some(code => moCodeArray.includes(code));
}

/**
 * Extract collision type from MO codes
 * Returns: 'vehicle-to-vehicle', 'vehicle-pedestrian', 'vehicle-motorcycle',
 *          'vehicle-bicycle', 'other', or null
 */
function extractCollisionType(moCodesStr) {
  if (!moCodesStr) return null;

  const hasPedestrian = hasCode(moCodesStr, ['3003', '3103']);
  const hasMotorcycle = hasCode(moCodesStr, ['3002', '3102']);
  const hasBicycle = hasCode(moCodesStr, ['3004', '3104']);
  const hasVehicle = hasCode(moCodesStr, ['3101', '3401']);

  if (hasPedestrian) return 'vehicle-pedestrian';
  if (hasMotorcycle && hasVehicle) return 'vehicle-motorcycle';
  if (hasBicycle && hasVehicle) return 'vehicle-bicycle';
  if (hasVehicle) return 'vehicle-to-vehicle';

  return 'other';
}

/**
 * Extract severity level from MO codes
 * Returns: 'property_damage', 'minor_injury', 'severe_injury', or 'unknown'
 *
 * IMPORTANT: Previous mapping incorrectly used codes 3030, 4020, 4021 as "fatal"
 * indicators, resulting in 214K (34.5%) records marked fatal - impossible given
 * LA has ~1,200 fatalities/year.
 *
 * Analysis revealed:
 * - 3030 = Traffic violation cited (NOT fatal!) - 204K records
 * - 4020 = Complaint of pain (minor injury) - 11K records
 * - 4021 = Minor/moderate injury - 8K records
 *
 * The dataset lacks a reliable fatal indicator in MO codes.
 * True fatality data would need to come from a separate source.
 *
 * Current verified mapping based on LAPD MO code documentation:
 * - 4025: Severe/incapacitating injury
 * - 4024, 4027: Visible injury
 * - 4020, 4021, 4026: Minor injury / complaint of pain
 * - 4003, 3025: Property damage only
 */
function extractSeverity(moCodesStr) {
  if (!moCodesStr) return 'unknown';

  // Severe/incapacitating injury (highest severity we can reliably identify)
  if (hasCode(moCodesStr, ['4025'])) {
    return 'severe_injury';
  }

  // Visible injury (moderate severity)
  if (hasCode(moCodesStr, ['4024', '4027'])) {
    return 'severe_injury';
  }

  // Minor injury / complaint of pain
  if (hasCode(moCodesStr, ['4020', '4021', '4026'])) {
    return 'minor_injury';
  }

  // Property damage only
  if (hasCode(moCodesStr, ['4003', '3025'])) {
    return 'property_damage';
  }

  // Check for any other 40xx injury code (treat as minor)
  const moCodeArray = moCodesStr.trim().split(/\s+/);
  const hasInjuryCode = moCodeArray.some(code => code.startsWith('40'));
  if (hasInjuryCode) return 'minor_injury';

  // Unknown severity - no injury codes present
  return 'unknown';
}

function processRecord(record, columnNames) {
  // Build a map of column names to values
  const data = {};
  columnNames.forEach((name, idx) => {
    data[name] = record[idx];
  });

  // Extract location data (index 25 in the data array contains location)
  const location = record[25];
  if (!location || !Array.isArray(location)) return null;

  const lat = parseFloat(location[1]);
  const lon = parseFloat(location[2]);

  // Filter out (0,0) coordinates
  if (lat === 0 && lon === 0) return null;
  if (isNaN(lat) || isNaN(lon)) return null;
  if (lat < CONFIG.bounds.minLat || lat > CONFIG.bounds.maxLat) return null;
  if (lon < CONFIG.bounds.minLon || lon > CONFIG.bounds.maxLon) return null;

  // Parse date_occ
  const dateOcc = data['Date Occurred'];
  if (!dateOcc) return null;

  const date = new Date(dateOcc);
  if (isNaN(date.getTime())) return null;

  // Parse time_occ
  const timeOccMinutes = parseTimeOccurred(data['Time Occurred']);
  const hour = timeOccMinutes !== null ? Math.floor(timeOccMinutes / 60) : null;

  // Derive fields
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dow = date.getDay(); // 0 = Sunday
  const isWeekend = dow === 0 || dow === 6;
  const timeBucket = hour !== null ? getTimeBucket(hour) : 'UNKNOWN';

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lon, lat]
    },
    properties: {
      dr_number: data['DR Number'],
      date_occ: dateOcc,
      time_occ_minutes: timeOccMinutes,
      hour: hour,
      year: year,
      month: month,
      dow: dow,
      is_weekend: isWeekend,
      time_bucket: timeBucket,
      area_id: data['Area ID'],
      area_name: data['Area Name'],
      premise_code: data['Premise Code'],
      premise_desc: data['Premise Description'],
      address: data['Address'],
      cross_street: data['Cross Street'],
      victim_age: data['Victim Age'],
      victim_sex: data['Victim Sex'],

      // MO Codes and derived fields
      mo_codes: record[17] || '',  // Raw MO codes string (index 17)
      collision_type: extractCollisionType(record[17]),
      severity: extractSeverity(record[17]),
      has_pedestrian: hasCode(record[17], ['3003', '3103']),
      has_motorcycle: hasCode(record[17], ['3002', '3102']),
      has_bicycle: hasCode(record[17], ['3004', '3104']),
      is_hit_and_run: hasCode(record[17], ['3034']),
      is_dui: hasCode(record[17], ['3035'])
    }
  };
}

function getTileKey(lat, lon) {
  // Round to nearest tile boundary
  const tileLat = Math.floor(lat / CONFIG.tileSize) * CONFIG.tileSize;
  const tileLon = Math.floor(lon / CONFIG.tileSize) * CONFIG.tileSize;
  return `lat_${tileLat.toFixed(2)}_lon_${tileLon.toFixed(2)}`;
}

function main() {
  console.log('Starting LA Traffic Collisions preprocessing...\n');

  // Check input file exists
  if (!fs.existsSync(CONFIG.inputFile)) {
    console.error(`ERROR: Input file not found: ${CONFIG.inputFile}`);
    process.exit(1);
  }

  // Create output directories
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.tilesDir)) {
    fs.mkdirSync(CONFIG.tilesDir, { recursive: true });
  }

  console.log('Loading raw JSON...');
  const rawData = JSON.parse(fs.readFileSync(CONFIG.inputFile, 'utf8'));

  // Extract column names from metadata
  const columnNames = rawData.meta.view.columns.map(col => col.name);
  const records = rawData.data;

  console.log(`Total records in dataset: ${records.length}`);

  // Initialize data structures
  const tiles = new Map(); // Map<tileKey, GeoJSON features[]>
  const overview = {
    total_count: 0,
    excluded_count: 0,
    hourly_counts: new Array(24).fill(0),
    dow_counts: new Array(7).fill(0),
    year_counts: {},
    month_counts: {},
    time_bucket_counts: {},
    area_counts: {},
    premise_counts: {},
    tile_counts: {},

    // Collision type and severity aggregations
    collision_type_counts: {},
    severity_counts: {},
    special_circumstances: {
      hit_and_run: 0,
      dui: 0,
      pedestrian: 0,
      motorcycle: 0,
      bicycle: 0
    },

    min_date: null,
    max_date: null,
    bounds: CONFIG.bounds
  };

  // Process each record
  console.log('\nProcessing records...');
  const progressInterval = Math.floor(records.length / 20); // 5% increments

  records.forEach((record, idx) => {
    if (idx % progressInterval === 0) {
      const percent = Math.round((idx / records.length) * 100);
      process.stdout.write(`\rProgress: ${percent}%`);
    }

    const feature = processRecord(record, columnNames);

    if (!feature) {
      overview.excluded_count++;
      return;
    }

    // Get tile key
    const [lon, lat] = feature.geometry.coordinates;
    const tileKey = getTileKey(lat, lon);

    // Add to tile
    if (!tiles.has(tileKey)) {
      tiles.set(tileKey, []);
    }
    tiles.get(tileKey).push(feature);

    // Update overview aggregates
    overview.total_count++;

    const props = feature.properties;

    if (props.hour !== null) {
      overview.hourly_counts[props.hour]++;
    }

    overview.dow_counts[props.dow]++;

    overview.year_counts[props.year] = (overview.year_counts[props.year] || 0) + 1;
    overview.month_counts[props.month] = (overview.month_counts[props.month] || 0) + 1;
    overview.time_bucket_counts[props.time_bucket] =
      (overview.time_bucket_counts[props.time_bucket] || 0) + 1;

    if (props.area_name) {
      overview.area_counts[props.area_name] =
        (overview.area_counts[props.area_name] || 0) + 1;
    }

    if (props.premise_desc) {
      overview.premise_counts[props.premise_desc] =
        (overview.premise_counts[props.premise_desc] || 0) + 1;
    }

    // Collision type and severity aggregations
    if (props.collision_type) {
      overview.collision_type_counts[props.collision_type] =
        (overview.collision_type_counts[props.collision_type] || 0) + 1;
    }

    if (props.severity) {
      overview.severity_counts[props.severity] =
        (overview.severity_counts[props.severity] || 0) + 1;
    }

    if (props.is_hit_and_run) overview.special_circumstances.hit_and_run++;
    if (props.is_dui) overview.special_circumstances.dui++;
    if (props.has_pedestrian) overview.special_circumstances.pedestrian++;
    if (props.has_motorcycle) overview.special_circumstances.motorcycle++;
    if (props.has_bicycle) overview.special_circumstances.bicycle++;

    overview.tile_counts[tileKey] = (overview.tile_counts[tileKey] || 0) + 1;

    // Track date range
    if (!overview.min_date || props.date_occ < overview.min_date) {
      overview.min_date = props.date_occ;
    }
    if (!overview.max_date || props.date_occ > overview.max_date) {
      overview.max_date = props.date_occ;
    }
  });

  console.log('\n\nProcessing complete!');
  console.log(`Valid records: ${overview.total_count}`);
  console.log(`Excluded records: ${overview.excluded_count}`);
  console.log(`Total tiles: ${tiles.size}`);

  // Convert counts objects to sorted arrays
  overview.year_counts = Object.entries(overview.year_counts)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => a.year - b.year);

  overview.area_counts = Object.entries(overview.area_counts)
    .map(([area_name, count]) => ({ area_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 areas

  overview.premise_counts = Object.entries(overview.premise_counts)
    .map(([premise_desc, count]) => ({ premise_desc, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 premises

  // Calculate days in range
  const minDate = new Date(overview.min_date);
  const maxDate = new Date(overview.max_date);
  overview.days_in_range = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

  // Write tile files
  console.log('\nWriting tile files...');
  const manifest = {
    tiles: [],
    generated_at: new Date().toISOString(),
    total_tiles: tiles.size,
    total_records: overview.total_count
  };

  let tileIdx = 0;
  for (const [tileKey, features] of tiles.entries()) {
    tileIdx++;
    if (tileIdx % 10 === 0) {
      process.stdout.write(`\rWriting tiles: ${tileIdx}/${tiles.size}`);
    }

    const geojson = {
      type: 'FeatureCollection',
      features: features
    };

    const filename = `${tileKey}.json`;
    const filepath = path.join(CONFIG.tilesDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(geojson));

    // Calculate tile bounds
    const [latStr, lonStr] = tileKey.replace('lat_', '').split('_lon_');
    const tileLat = parseFloat(latStr);
    const tileLon = parseFloat(lonStr);

    // Get year range for this tile
    const years = [...new Set(features.map(f => f.properties.year))].sort();

    manifest.tiles.push({
      filename: filename,
      bounds: {
        south: tileLat,
        north: tileLat + CONFIG.tileSize,
        west: tileLon,
        east: tileLon + CONFIG.tileSize
      },
      record_count: features.length,
      year_range: {
        min: years[0],
        max: years[years.length - 1]
      }
    });
  }

  console.log('\n\nWriting overview and manifest files...');

  // Write overview
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'overview.json'),
    JSON.stringify(overview, null, 2)
  );

  // Write manifest
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Final stats
  const overviewSize = fs.statSync(path.join(CONFIG.outputDir, 'overview.json')).size;
  const manifestSize = fs.statSync(path.join(CONFIG.outputDir, 'manifest.json')).size;

  console.log('\n=== Preprocessing Complete! ===\n');
  console.log('Output files:');
  console.log(`- overview.json: ${(overviewSize / 1024).toFixed(2)} KB`);
  console.log(`- manifest.json: ${(manifestSize / 1024).toFixed(2)} KB`);
  console.log(`- ${tiles.size} tile files in assets/collisions/tiles/`);
  console.log(`\nTotal valid records: ${overview.total_count.toLocaleString()}`);
  console.log(`Date range: ${overview.min_date} to ${overview.max_date}`);
  console.log(`Peak hour: ${overview.hourly_counts.indexOf(Math.max(...overview.hourly_counts))}:00`);
  console.log(`Top area: ${overview.area_counts[0].area_name} (${overview.area_counts[0].count.toLocaleString()} collisions)`);
}

// Run
try {
  main();
} catch (error) {
  console.error('\nERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
