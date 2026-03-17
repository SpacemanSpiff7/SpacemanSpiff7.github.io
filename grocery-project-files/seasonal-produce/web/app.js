/* ============================================
   Seasonal Produce California — App
   Warm light theme with rotating ring navigator
   Concentric rings: month / category+source / status
   ============================================ */

(function () {
  'use strict';

  var MONTH_ABBRS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  var MONTH_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  var GROUP_COLORS = {
    'Citrus': 'var(--color-citrus)',
    'Berry': 'var(--color-berry)',
    'Stone Fruit': 'var(--color-stone-fruit)',
    'Pome Fruit': 'var(--color-pome)',
    'Tropical Fruit': 'var(--color-tropical)',
    'Melon': 'var(--color-cucurbit)',
    'Leafy Green': 'var(--color-leafy-green)',
    'Brassica': 'var(--color-brassica)',
    'Root/Tuber': 'var(--color-root)',
    'Allium': 'var(--color-allium)',
    'Legume': 'var(--color-legume)',
    'Cucurbit': 'var(--color-cucurbit)',
    'Stem/Stalk': 'var(--color-stem)',
    'Pepper': 'var(--color-chile)',
    'Herb': 'var(--color-herb)',
    'Mushroom': 'var(--color-mushroom)',
    'Nut': 'var(--color-nut)',
    'Edible Flower': 'var(--color-herb)',
    'Grain': 'var(--color-legume)',
    'Nightshade': 'var(--color-chile)',
    'Other': 'var(--color-root)',
  };

  // --- Category -> Culinary Groups mapping (built at init from data) ---
  var CATEGORY_TO_GROUPS = {};
  var ALL_CULINARY_GROUPS = [];
  var ORIGIN_GROUPS = [];

  // --- State ---
  var state = {
    data: null,
    produceBySlug: {},
    regionBySlug: {},
    seasonsBySlug: {},
    selectedMonth: new Date().getMonth() + 1,
    searchQuery: '',
    activeCategories: new Set(),
    activeSource: new Set(),
    activeStatus: new Set(),
    activeCulinaryGroups: new Set(),
    activeOriginGroups: new Set(),
    availabilityFilter: null,
    sortMode: 'status',
    filterAccordionOpen: false,
    expandedSections: new Set(),
    selectedItem: null,
  };

  // --- Caches ---
  // Per-month caches (invalidated on month change, populated at top of render)
  var statusCache = {};       // slug -> 'peak'|'in-season'|'coming'|'off'|'none'
  var comingSoonCache = {};    // slug -> boolean
  var leavingPeakCache = {};   // slug -> boolean

  // Data-dependent caches (populated once after data load, never invalidated)
  var sourceTypesCache = {};    // slug -> { local: true, import: true, ... }
  var seasonLengthCache = {};   // slug -> number
  var yearRoundCache = {};      // slug -> boolean
  var originGroupsCache = {};   // slug -> { groupName: true, ... }
  var hasLocalSeasonCache = {}; // slug -> boolean
  var earliestPeakMonthCache = {}; // slug -> number
  var aliasesBySlug = {};       // slug -> [lowercase alias strings]
  var aliasReverseMap = {};     // lowercase alias -> [slugs]

  // --- Data Loading ---
  function loadData() {
    var dataPromise;
    if (window.location.protocol === 'file:') {
      dataPromise = new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'data.json', true);
        xhr.onload = function () {
          if (xhr.status === 0 || xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else { reject(new Error('Failed to load data')); }
        };
        xhr.onerror = function () { reject(new Error('Failed to load data')); };
        xhr.send();
      });
    } else {
      dataPromise = fetch('data.json').then(function (res) {
        if (!res.ok) throw new Error('Failed to load data');
        return res.json();
      });
    }
    return dataPromise.then(function (data) {
      state.data = data;
      data.produce.forEach(function (p) { state.produceBySlug[p.slug] = p; });
      data.regions.forEach(function (r) { state.regionBySlug[r.slug] = r; });
      data.seasons.forEach(function (s) {
        if (!state.seasonsBySlug[s.p]) state.seasonsBySlug[s.p] = [];
        state.seasonsBySlug[s.p].push(s);
      });

      // Build category -> culinary groups map
      var groupSet = {};
      data.produce.forEach(function (p) {
        if (!CATEGORY_TO_GROUPS[p.category]) CATEGORY_TO_GROUPS[p.category] = {};
        CATEGORY_TO_GROUPS[p.category][p.culinaryGroup] = true;
        groupSet[p.culinaryGroup] = true;
      });
      // Convert to sorted arrays
      Object.keys(CATEGORY_TO_GROUPS).forEach(function (cat) {
        CATEGORY_TO_GROUPS[cat] = Object.keys(CATEGORY_TO_GROUPS[cat]).sort();
      });
      ALL_CULINARY_GROUPS = Object.keys(groupSet).sort();

      // Build origin groups list
      var og = {};
      data.regions.forEach(function (r) { if (r.originGroup) og[r.originGroup] = true; });
      ORIGIN_GROUPS = Object.keys(og).sort();

      // Populate data-dependent caches (computed once, never invalidated)
      computeDataCaches();
    });
  }

  function getColor(item) {
    return GROUP_COLORS[item.culinaryGroup] || 'var(--color-root)';
  }

  // --- Season Logic ---
  function getItemStatus(slug, month) {
    var seasons = state.seasonsBySlug[slug];
    if (!seasons || !seasons.length) return 'none';
    var isPeak = false, isSeason = false;
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].pk.indexOf(month) !== -1) isPeak = true;
      if (seasons[i].s.indexOf(month) !== -1) isSeason = true;
    }
    if (isPeak) return 'peak';
    if (isSeason) return 'in-season';
    var next = month === 12 ? 1 : month + 1;
    for (var j = 0; j < seasons.length; j++) {
      if (seasons[j].s.indexOf(next) !== -1) return 'coming';
    }
    return 'off';
  }

  function getItemIsComingSoon(slug, month) {
    var status = getItemStatus(slug, month);
    if (status === 'peak' || status === 'in-season') return false;
    var n1 = month === 12 ? 1 : month + 1;
    var n2 = n1 === 12 ? 1 : n1 + 1;
    var s1 = getItemStatus(slug, n1);
    var s2 = getItemStatus(slug, n2);
    return (s1 !== 'off' && s1 !== 'none') || (s2 !== 'off' && s2 !== 'none');
  }

  function getItemIsLeavingPeak(slug, month) {
    var next = month === 12 ? 1 : month + 1;
    return getItemStatus(slug, month) === 'peak' && getItemStatus(slug, next) !== 'peak';
  }

  function getSourceTypes(slug) {
    var seasons = state.seasonsBySlug[slug] || [];
    var types = {};
    seasons.forEach(function (s) { types[s.t] = true; });
    return types;
  }

  // --- Year-round detection (hide from default browse, show on search) ---
  // True when ALL entries span 12 months AND none have peak months.
  // Items with peak data (even peak=all-12) stay visible.
  function isYearRound(slug) {
    var seasons = state.seasonsBySlug[slug];
    if (!seasons || !seasons.length) return false;
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].s.length < 12) return false;
      if (seasons[i].pk.length > 0) return false;
    }
    return true;
  }

  // --- New filter helpers ---
  function getSeasonLength(slug) {
    var seasons = state.seasonsBySlug[slug];
    if (!seasons || !seasons.length) return 0;
    var months = {};
    seasons.forEach(function (s) {
      s.s.forEach(function (m) { months[m] = true; });
    });
    return Object.keys(months).length;
  }

  function getEarliestPeakMonth(slug) {
    var seasons = state.seasonsBySlug[slug];
    if (!seasons || !seasons.length) return 13;
    var earliest = 13;
    seasons.forEach(function (s) {
      s.pk.forEach(function (m) { if (m < earliest) earliest = m; });
    });
    return earliest;
  }

  function getOriginGroupsForItem(slug) {
    var seasons = state.seasonsBySlug[slug] || [];
    var groups = {};
    seasons.forEach(function (s) {
      var r = state.regionBySlug[s.r];
      if (r && r.originGroup) groups[r.originGroup] = true;
    });
    return groups;
  }

  // --- Cache population ---
  // Called once after data load to populate data-dependent caches
  function computeDataCaches() {
    state.data.produce.forEach(function (p) {
      sourceTypesCache[p.slug] = getSourceTypes(p.slug);
      seasonLengthCache[p.slug] = getSeasonLength(p.slug);
      yearRoundCache[p.slug] = isYearRound(p.slug);
      originGroupsCache[p.slug] = getOriginGroupsForItem(p.slug);
      hasLocalSeasonCache[p.slug] = hasLocalSeason(p.slug);
      earliestPeakMonthCache[p.slug] = getEarliestPeakMonth(p.slug);

      // Build alias lookup caches
      var rawAliases = p.a || [];
      var lower = [];
      for (var i = 0; i < rawAliases.length; i++) {
        var al = rawAliases[i].toLowerCase();
        lower.push(al);
        if (!aliasReverseMap[al]) aliasReverseMap[al] = [];
        aliasReverseMap[al].push(p.slug);
      }
      aliasesBySlug[p.slug] = lower;
    });
  }

  // Called at top of render() to populate per-month caches
  var lastComputedMonth = -1;
  function computeAllStatuses(month) {
    if (month === lastComputedMonth) return;
    lastComputedMonth = month;
    statusCache = {};
    comingSoonCache = {};
    leavingPeakCache = {};
    state.data.produce.forEach(function (p) {
      statusCache[p.slug] = getItemStatus(p.slug, month);
      comingSoonCache[p.slug] = getItemIsComingSoon(p.slug, month);
      leavingPeakCache[p.slug] = getItemIsLeavingPeak(p.slug, month);
    });
  }

  // --- Filtering ---
  function filterProduce() {
    var items = [];
    var month = state.selectedMonth;
    var hasAnyFilter = state.activeCategories.size > 0 || state.activeSource.size > 0 ||
      (state.activeStatus.size > 0 && state.activeStatus.size < 3) ||
      state.activeCulinaryGroups.size > 0 || state.activeOriginGroups.size > 0 ||
      state.availabilityFilter !== null;

    state.data.produce.forEach(function (p) {
      var hasSeasons = !!state.seasonsBySlug[p.slug];
      var isNoData = !hasSeasons;

      // Search applies to all items -- checks name, aliases, category, culinary group
      var searchMatch = null;
      if (state.searchQuery) {
        var q = state.searchQuery.toLowerCase();
        if (p.name.toLowerCase().indexOf(q) !== -1) {
          searchMatch = { type: 'name' };
        } else {
          // Check aliases
          var aliases = aliasesBySlug[p.slug] || [];
          var matchedAlias = null;
          for (var ai = 0; ai < aliases.length; ai++) {
            if (aliases[ai].indexOf(q) !== -1) {
              matchedAlias = (p.a || [])[ai] || aliases[ai];
              break;
            }
          }
          if (matchedAlias) {
            searchMatch = { type: 'alias', term: matchedAlias };
          } else if (p.category.toLowerCase().indexOf(q) !== -1 ||
                     p.culinaryGroup.toLowerCase().indexOf(q) !== -1) {
            searchMatch = { type: 'group' };
          }
        }
        if (!searchMatch) return;
      }

      // Category filter applies to all items
      if (state.activeCategories.size > 0) {
        if (!state.activeCategories.has(p.category)) return;
      }

      // Culinary group filter applies to all items
      if (state.activeCulinaryGroups.size > 0) {
        if (!state.activeCulinaryGroups.has(p.culinaryGroup)) return;
      }

      // Source filter -- skip for no-data items
      if (state.activeSource.size > 0) {
        if (isNoData) return;
        var types = sourceTypesCache[p.slug];
        var sourceMatch = false;
        state.activeSource.forEach(function (s) { if (types[s]) sourceMatch = true; });
        if (!sourceMatch) return;
      }

      // Status filter -- skip for no-data items
      var status = isNoData ? 'no-data' : statusCache[p.slug];

      if (state.activeStatus.size > 0 && state.activeStatus.size < 3) {
        if (isNoData) return;
        var passes = false;
        if (state.activeStatus.has('peak') && status === 'peak') passes = true;
        if (state.activeStatus.has('coming') && comingSoonCache[p.slug]) passes = true;
        if (state.activeStatus.has('leaving') && leavingPeakCache[p.slug]) passes = true;
        if (!passes) return;
      }

      // Origin group filter -- skip for no-data items
      if (state.activeOriginGroups.size > 0) {
        if (isNoData) return;
        var itemOrigins = originGroupsCache[p.slug];
        var originMatch = false;
        state.activeOriginGroups.forEach(function (g) { if (itemOrigins[g]) originMatch = true; });
        if (!originMatch) return;
      }

      // Availability filter -- skip for no-data items
      if (state.availabilityFilter !== null) {
        if (isNoData) return;
        var seasonLen = seasonLengthCache[p.slug];
        var yr = yearRoundCache[p.slug] || seasonLen === 12;
        if (state.availabilityFilter === 'year-round' && !yr) return;
        if (state.availabilityFilter === 'seasonal' && yr) return;
        if (state.availabilityFilter === 'short' && (yr || seasonLen > 4)) return;
        if (state.availabilityFilter === 'long' && (yr || seasonLen < 8)) return;
      }

      // Year-round hiding: hide year-round items unless searching, or availability filter is year-round
      if (!isNoData && !state.searchQuery && state.availabilityFilter !== 'year-round' && !hasAnyFilter && yearRoundCache[p.slug]) return;

      var item = { produce: p, status: status };
      if (searchMatch) item.searchMatch = searchMatch;
      items.push(item);
    });

    return items;
  }

  function sortItems(items) {
    var mode = state.sortMode;

    if (mode === 'alpha') {
      items.sort(function (a, b) {
        return a.produce.name.localeCompare(b.produce.name);
      });
      return items;
    }

    if (mode === 'peak-month') {
      items.sort(function (a, b) {
        var aND = a.status === 'no-data' ? 1 : 0;
        var bND = b.status === 'no-data' ? 1 : 0;
        if (aND !== bND) return aND - bND;
        var aPeak = earliestPeakMonthCache[a.produce.slug];
        var bPeak = earliestPeakMonthCache[b.produce.slug];
        if (aPeak !== bPeak) return aPeak - bPeak;
        return a.produce.name.localeCompare(b.produce.name);
      });
      return items;
    }

    if (mode === 'season-length') {
      items.sort(function (a, b) {
        var aND = a.status === 'no-data' ? 1 : 0;
        var bND = b.status === 'no-data' ? 1 : 0;
        if (aND !== bND) return aND - bND;
        var aLen = seasonLengthCache[a.produce.slug];
        var bLen = seasonLengthCache[b.produce.slug];
        if (aLen !== bLen) return aLen - bLen;
        return a.produce.name.localeCompare(b.produce.name);
      });
      return items;
    }

    if (mode === 'category') {
      items.sort(function (a, b) {
        var aND = a.status === 'no-data' ? 1 : 0;
        var bND = b.status === 'no-data' ? 1 : 0;
        if (aND !== bND) return aND - bND;
        var catCmp = a.produce.category.localeCompare(b.produce.category);
        if (catCmp !== 0) return catCmp;
        return a.produce.name.localeCompare(b.produce.name);
      });
      return items;
    }

    // Default: status sort (peak first)
    var order = { peak: 0, 'in-season': 1, coming: 2, off: 3, none: 4, 'no-data': 5 };
    items.sort(function (a, b) {
      var oa = order[a.status] !== undefined ? order[a.status] : 5;
      var ob = order[b.status] !== undefined ? order[b.status] : 5;
      if (oa !== ob) return oa - ob;
      var aLocal = hasLocalSeasonCache[a.produce.slug] ? 0 : 1;
      var bLocal = hasLocalSeasonCache[b.produce.slug] ? 0 : 1;
      if (aLocal !== bLocal) return aLocal - bLocal;
      return a.produce.name.localeCompare(b.produce.name);
    });
    return items;
  }

  function hasLocalSeason(slug) {
    var seasons = state.seasonsBySlug[slug] || [];
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].t === 'local') return true;
    }
    return false;
  }

  // --- Stats ---
  function computeStats(month) {
    var inSeason = 0, atPeak = 0;
    state.data.produce.forEach(function (p) {
      var status = statusCache[p.slug];
      if (status === 'peak') { atPeak++; inSeason++; }
      else if (status === 'in-season') { inSeason++; }
    });
    return { inSeason: inSeason, atPeak: atPeak };
  }

  // ============================================
  // SVG arc helper — used by all three rings
  // ============================================
  var RING_CX = 150, RING_CY = 150;

  function arcPath(cx, cy, outerR, innerR, startDeg, endDeg) {
    var s1 = (startDeg - 90) * Math.PI / 180;
    var e1 = (endDeg - 90) * Math.PI / 180;
    return 'M ' + (cx + outerR * Math.cos(s1)) + ' ' + (cy + outerR * Math.sin(s1)) +
           ' A ' + outerR + ' ' + outerR + ' 0 0 1 ' + (cx + outerR * Math.cos(e1)) + ' ' + (cy + outerR * Math.sin(e1)) +
           ' L ' + (cx + innerR * Math.cos(e1)) + ' ' + (cy + innerR * Math.sin(e1)) +
           ' A ' + innerR + ' ' + innerR + ' 0 0 0 ' + (cx + innerR * Math.cos(s1)) + ' ' + (cy + innerR * Math.sin(s1)) + ' Z';
  }

  function labelPos(cx, cy, outerR, innerR, startDeg, endDeg) {
    var midRad = ((startDeg + endDeg) / 2 - 90) * Math.PI / 180;
    var r = (outerR + innerR) / 2;
    return { x: cx + r * Math.cos(midRad), y: cy + r * Math.sin(midRad) };
  }

  // Arc path for textPath labels — always clockwise, like text on a spinning record.
  // Top of circle reads normally, bottom reads upside down. No flipping.
  function labelArcPath(cx, cy, r, startDeg, endDeg) {
    var s = (startDeg - 90) * Math.PI / 180;
    var e = (endDeg - 90) * Math.PI / 180;
    return 'M ' + (cx + r * Math.cos(s)) + ' ' + (cy + r * Math.sin(s)) +
           ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r * Math.cos(e)) + ' ' + (cy + r * Math.sin(e));
  }

  // ============================================
  // Outer Ring — months (rotates)
  // ============================================
  var OUTER_R = 140, OUTER_IR = 108;
  var RING_GAP = 2.5;
  var RING_SEG = 30 - RING_GAP;

  var ringCurrentAngle = 0;
  var ringBuilt = false;
  var ringSegments = [];
  var ringLabels = [];

  function buildRing() {
    var group = document.getElementById('ring-group');
    group.innerHTML = '';
    ringSegments = [];
    ringLabels = [];

    // Ensure defs exists for textPath arcs
    var defs = document.getElementById('ring-svg').querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      document.getElementById('ring-svg').insertBefore(defs, document.getElementById('ring-svg').firstChild);
    }

    var labelR = (OUTER_R + OUTER_IR) / 2;

    for (var i = 0; i < 12; i++) {
      var month = i + 1;
      var startAngle = i * 30 + RING_GAP / 2;
      var endAngle = startAngle + RING_SEG;

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', arcPath(RING_CX, RING_CY, OUTER_R, OUTER_IR, startAngle, endAngle));
      path.setAttribute('class', 'ring-segment');
      path.setAttribute('data-month', month);
      path.addEventListener('click', (function (m) {
        return function () { state.selectedMonth = m; render(); };
      })(month));
      group.appendChild(path);
      ringSegments.push(path);

      // Curved label via textPath
      var arcId = 'month-arc-' + i;
      var arcEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arcEl.setAttribute('d', labelArcPath(RING_CX, RING_CY, labelR, startAngle, endAngle));
      arcEl.setAttribute('id', arcId);
      defs.appendChild(arcEl);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'ring-segment-label');
      text.setAttribute('dy', '0.35em');
      var tp = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
      tp.setAttribute('href', '#' + arcId);
      tp.setAttribute('startOffset', '50%');
      tp.textContent = MONTH_ABBRS[i];
      text.appendChild(tp);
      group.appendChild(text);
      ringLabels.push(text);
    }

    ringCurrentAngle = -(state.selectedMonth - 1) * 30 - 15;
    group.style.transition = 'none';
    group.style.transform = 'rotate(' + ringCurrentAngle + 'deg)';
    group.offsetHeight; // force reflow
    group.style.transition = '';
    ringBuilt = true;
  }

  function updateRing() {
    var group = document.getElementById('ring-group');

    // Shortest-path rotation (Juggins-style CSS transform on whole group)
    var targetBase = -(state.selectedMonth - 1) * 30 - 15;
    var diff = targetBase - ringCurrentAngle;
    diff = ((diff % 360) + 540) % 360 - 180;
    ringCurrentAngle = ringCurrentAngle + diff;
    group.style.transform = 'rotate(' + ringCurrentAngle + 'deg)';

    // Update fills using classList.toggle — NEVER setAttribute('class')
    for (var i = 0; i < 12; i++) {
      var month = i + 1;
      var d = Math.abs(month - state.selectedMonth);
      if (d > 6) d = 12 - d;

      var fill;
      if (month === state.selectedMonth) { fill = 'var(--ring-active)'; }
      else if (d === 1) { fill = 'var(--ring-adjacent)'; }
      else { fill = 'var(--ring-inactive)'; }

      ringSegments[i].setAttribute('fill', fill);
      ringSegments[i].classList.toggle('active', month === state.selectedMonth);

      // Labels use textPath — no counter-rotation needed
      ringLabels[i].classList.toggle('label-active', month === state.selectedMonth);
      ringLabels[i].classList.toggle('label-adjacent', d === 1 && month !== state.selectedMonth);
    }

    // Update ring center text
    var stats = computeStats(state.selectedMonth);
    var monthEl = document.getElementById('ring-month');
    var dateEl = document.getElementById('ring-date');
    var peakStatEl = document.getElementById('ring-stat-peak');
    var seasonStatEl = document.getElementById('ring-stat-season');

    monthEl.textContent = MONTH_FULL[state.selectedMonth - 1].toUpperCase();

    var now = new Date();
    var isCurrentMonth = (state.selectedMonth === now.getMonth() + 1);
    dateEl.textContent = isCurrentMonth
      ? MONTH_NAMES[state.selectedMonth - 1] + ' ' + now.getDate()
      : MONTH_FULL[state.selectedMonth - 1];

    peakStatEl.innerHTML = '<strong>' + stats.atPeak + '</strong> in peak';
    seasonStatEl.innerHTML = '<strong>' + stats.inSeason + '</strong> in season';

    // Proportional tick mark — SVG line at outer ring edge
    // With centering fix, the month segment CENTER is at 12 o'clock.
    // The segment spans from -15 to +15 deg relative to 12 o'clock (ignoring gap).
    // dayFraction 0..1 maps across the full 30-deg slot.
    // tickAngle = (dayFraction - 0.5) * 30 puts day 1 at left edge, last day at right edge.
    var tickGroup = document.getElementById('ring-tick-group');
    if (tickGroup) {
      tickGroup.innerHTML = '';
      var now = new Date();
      var tickDay = now.getDate();
      var tickDaysInMonth = new Date(now.getFullYear(), state.selectedMonth, 0).getDate();
      var dayFraction = (tickDay - 0.5) / tickDaysInMonth; // 0..1
      var tickAngle = (dayFraction - 0.5) * 30; // deg from 12 o'clock, centered
      var tickRadians = (tickAngle - 90) * Math.PI / 180;
      var innerTick = OUTER_R + 1;  // starts just outside outer ring
      var outerTick = OUTER_R + 10; // extends outward

      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', RING_CX + innerTick * Math.cos(tickRadians));
      line.setAttribute('y1', RING_CY + innerTick * Math.sin(tickRadians));
      line.setAttribute('x2', RING_CX + outerTick * Math.cos(tickRadians));
      line.setAttribute('y2', RING_CY + outerTick * Math.sin(tickRadians));
      line.setAttribute('class', 'ring-tick-line');
      tickGroup.appendChild(line);

      var tipR = outerTick + 2;
      var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', RING_CX + tipR * Math.cos(tickRadians));
      dot.setAttribute('cy', RING_CY + tipR * Math.sin(tickRadians));
      dot.setAttribute('r', '2.5');
      dot.setAttribute('class', 'ring-tick-dot');
      tickGroup.appendChild(dot);
    }
  }

  function renderRing() {
    if (!ringBuilt) buildRing();
    updateRing();
  }

  // ============================================
  // Middle Ring — category + source (rotate-to-top on click)
  // ============================================
  var MID_OUTER = 98, MID_INNER = 80;
  var MID_SEG_DEG = 38, MID_GAP = 2;
  var MID_ITEMS = [
    { label: 'Fruit', type: 'category', match: 'Fruit' },
    { label: 'Veg', type: 'category', match: 'Vegetable' },
    { label: 'Chile', type: 'category', match: 'Chile Pepper' },
    { label: 'Herb', type: 'category', match: 'Herb' },
    { label: 'Mush', type: 'category', match: 'Mushroom' },
    { label: 'Nut', type: 'category', match: 'Nut' },
    { label: 'Flwr', type: 'category', match: 'Edible Flower' },
    { label: 'Local', type: 'source', match: 'local' },
    { label: 'Imp', type: 'source', match: 'import' },
  ];
  var midSegments = [];
  var midLabels = []; // each entry: { el, arcId }
  var midCurrentAngle = 0;
  var midLastClicked = 0; // index of last-clicked segment

  function buildMiddleRing() {
    var group = document.getElementById('mid-ring-group');
    group.innerHTML = '';
    midSegments = [];
    midLabels = [];

    // Defs for textPath arcs
    var defs = document.getElementById('ring-svg').querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      document.getElementById('ring-svg').insertBefore(defs, document.getElementById('ring-svg').firstChild);
    }

    var labelR = (MID_OUTER + MID_INNER) / 2;

    for (var i = 0; i < MID_ITEMS.length; i++) {
      var startAngle = i * (MID_SEG_DEG + MID_GAP) + MID_GAP / 2;
      var endAngle = startAngle + MID_SEG_DEG;

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', arcPath(RING_CX, RING_CY, MID_OUTER, MID_INNER, startAngle, endAngle));
      path.setAttribute('class', 'mid-segment');
      path.addEventListener('click', (function (idx, item) {
        return function () {
          midLastClicked = idx;
          var set = item.type === 'category' ? state.activeCategories : state.activeSource;
          if (set.has(item.match)) { set.delete(item.match); }
          else { set.add(item.match); }
          render();
        };
      })(i, MID_ITEMS[i]));
      group.appendChild(path);
      midSegments.push(path);

      // Curved label via textPath
      var arcId = 'mid-arc-' + i;
      var arcEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arcEl.setAttribute('d', labelArcPath(RING_CX, RING_CY, labelR, startAngle, endAngle));
      arcEl.setAttribute('id', arcId);
      defs.appendChild(arcEl);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'mid-segment-label');
      text.setAttribute('dy', '0.35em');
      var tp = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
      tp.setAttribute('href', '#' + arcId);
      tp.setAttribute('startOffset', '50%');
      tp.textContent = MID_ITEMS[i].label;
      text.appendChild(tp);
      group.appendChild(text);
      midLabels.push(text);
    }
  }

  function updateMiddleRing() {
    var group = document.getElementById('mid-ring-group');
    // Rotate so last-clicked segment center is at 12 o'clock
    var segCenter = midLastClicked * (MID_SEG_DEG + MID_GAP) + MID_GAP / 2 + MID_SEG_DEG / 2;
    var targetBase = -segCenter;
    var diff = targetBase - midCurrentAngle;
    diff = ((diff % 360) + 540) % 360 - 180;
    midCurrentAngle = midCurrentAngle + diff;
    group.style.transform = 'rotate(' + midCurrentAngle + 'deg)';

    for (var i = 0; i < MID_ITEMS.length; i++) {
      var set = MID_ITEMS[i].type === 'category' ? state.activeCategories : state.activeSource;
      var isActive = set.has(MID_ITEMS[i].match);
      midSegments[i].classList.toggle('active', isActive);
      midLabels[i].classList.toggle('label-active', isActive);
    }
  }

  // ============================================
  // Inner Ring — status filters (static, multi-select)
  // ============================================
  var INNER_OUTER = 72, INNER_INNER = 58;
  var INNER_SEG_DEG = 85, INNER_GAP = 5;
  var INNER_ITEMS = [
    { label: 'Peak', id: 'peak' },
    { label: 'Coming', id: 'coming' },
    { label: 'Leaving', id: 'leaving' },
    { label: 'All', id: 'all' },
  ];
  var innerSegments = [];
  var innerLabels = [];
  var innerCurrentAngle = 0;
  var innerLastClicked = 0;

  function buildInnerRing() {
    var group = document.getElementById('inner-ring-group');
    group.innerHTML = '';
    innerSegments = [];
    innerLabels = [];

    var defs = document.getElementById('ring-svg').querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      document.getElementById('ring-svg').insertBefore(defs, document.getElementById('ring-svg').firstChild);
    }

    var labelR = (INNER_OUTER + INNER_INNER) / 2;

    for (var i = 0; i < INNER_ITEMS.length; i++) {
      var startAngle = i * (INNER_SEG_DEG + INNER_GAP) + INNER_GAP / 2;
      var endAngle = startAngle + INNER_SEG_DEG;

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', arcPath(RING_CX, RING_CY, INNER_OUTER, INNER_INNER, startAngle, endAngle));
      path.setAttribute('class', 'inner-segment');
      path.setAttribute('data-status', INNER_ITEMS[i].id);
      path.addEventListener('click', (function (idx, item) {
        return function () {
          innerLastClicked = idx;
          if (item.id === 'all') {
            state.activeStatus.clear();
          } else {
            if (state.activeStatus.has(item.id)) { state.activeStatus.delete(item.id); }
            else { state.activeStatus.add(item.id); }
            if (state.activeStatus.size === 3) { state.activeStatus.clear(); innerLastClicked = 3; }
          }
          render();
        };
      })(i, INNER_ITEMS[i]));
      group.appendChild(path);
      innerSegments.push(path);

      // Curved label via textPath
      var arcId = 'inner-arc-' + i;
      var arcEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arcEl.setAttribute('d', labelArcPath(RING_CX, RING_CY, labelR, startAngle, endAngle));
      arcEl.setAttribute('id', arcId);
      defs.appendChild(arcEl);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'inner-segment-label');
      text.setAttribute('dy', '0.35em');
      var tp = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
      tp.setAttribute('href', '#' + arcId);
      tp.setAttribute('startOffset', '50%');
      tp.textContent = INNER_ITEMS[i].label;
      text.appendChild(tp);
      group.appendChild(text);
      innerLabels.push(text);
    }
  }

  function updateInnerRing() {
    var group = document.getElementById('inner-ring-group');
    // Rotate so last-clicked segment center is at 12 o'clock
    var segCenter = innerLastClicked * (INNER_SEG_DEG + INNER_GAP) + INNER_GAP / 2 + INNER_SEG_DEG / 2;
    var targetBase = -segCenter;
    var diff = targetBase - innerCurrentAngle;
    diff = ((diff % 360) + 540) % 360 - 180;
    innerCurrentAngle = innerCurrentAngle + diff;
    group.style.transform = 'rotate(' + innerCurrentAngle + 'deg)';

    for (var i = 0; i < INNER_ITEMS.length; i++) {
      var isActive;
      if (INNER_ITEMS[i].id === 'all') {
        isActive = state.activeStatus.size === 0;
      } else {
        isActive = state.activeStatus.has(INNER_ITEMS[i].id);
      }
      innerSegments[i].classList.toggle('active', isActive);
      innerLabels[i].classList.toggle('label-active', isActive);
    }
  }

  // ============================================
  // Ring bezels — thin divider lines between rings
  // ============================================
  function buildLeafDecor() {
    var group = document.getElementById('ring-leaf-decor');
    group.innerHTML = '';

    [OUTER_IR, MID_OUTER, MID_INNER, INNER_OUTER, INNER_INNER].forEach(function (r) {
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '150');
      circle.setAttribute('cy', '150');
      circle.setAttribute('r', r);
      circle.setAttribute('class', 'ring-bezel');
      group.appendChild(circle);
    });
  }

  // ============================================
  // Reset Filters
  // ============================================
  function resetFilters() {
    state.activeCategories.clear();
    state.activeSource.clear();
    state.activeStatus.clear();
    state.activeCulinaryGroups.clear();
    state.activeOriginGroups.clear();
    state.availabilityFilter = null;
    state.sortMode = 'status';
    state.filterAccordionOpen = false;
    state.expandedSections.clear();
    state.selectedMonth = new Date().getMonth() + 1;
    midLastClicked = 0;
    innerLastClicked = 3; // rotate "All" to top
    document.getElementById('filter-accordion').classList.add('hidden');
    document.getElementById('filter-toggle').classList.remove('accordion-open');
    render();
  }

  function bindResetFilters() {
    document.getElementById('filter-reset').addEventListener('click', function (e) {
      e.stopPropagation();
      resetFilters();
    });
  }

  function countActiveFilters() {
    var count = 0;
    count += state.activeCategories.size;
    count += state.activeSource.size;
    if (state.activeStatus.size > 0 && state.activeStatus.size < 3) count += state.activeStatus.size;
    count += state.activeCulinaryGroups.size;
    count += state.activeOriginGroups.size;
    if (state.availabilityFilter !== null) count += 1;
    return count;
  }

  function updateResetButton() {
    var count = countActiveFilters();
    var isNotCurrentMonth = state.selectedMonth !== (new Date().getMonth() + 1);
    var hasFilters = count > 0 || state.sortMode !== 'status' || isNotCurrentMonth;
    document.getElementById('filter-toggle-wrap').classList.toggle('has-filters', hasFilters);

    var badge = document.getElementById('filter-badge');
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // --- Now line position ---
  function getNowPosition(month) {
    var day = new Date().getDate();
    var daysInMonth = new Date(new Date().getFullYear(), month, 0).getDate();
    var fraction = (day - 1) / daysInMonth;
    return ((month - 1 + fraction) / 12) * 100;
  }

  // --- Render: Timeline (DOM-recycling) ---

  // Persistent header -- built once, now-line updated on month change
  var _tlHeaderBuilt = false;
  var _tlHeaderNowLine = null;
  var _tlHeaderMonth = null;

  // Persistent body now-line
  var _tlBodyNowContainer = null;
  var _tlBodyNowLine = null;

  // Row recycling pools
  var _tlActiveDataRows = {};     // slug -> DOM element
  var _tlActiveNoDataRows = {};   // slug -> DOM element
  // (no pool -- active-rows maps prevent redundant creation)
  var _tlNoDataDivider = null;    // persistent divider element
  var _tlEmptyMsg = null;         // persistent empty-state element
  var _tlLastMonth = null;        // track month for scroll-on-change

  function _tlBuildHeader() {
    var header = document.getElementById('timeline-header');
    header.innerHTML = '';

    var spacer = document.createElement('div');
    spacer.className = 'timeline-header-spacer';
    header.appendChild(spacer);

    var monthsRow = document.createElement('div');
    monthsRow.className = 'timeline-months';

    MONTH_NAMES.forEach(function (name) {
      var label = document.createElement('div');
      label.className = 'timeline-month-label';
      label.textContent = name;
      monthsRow.appendChild(label);
    });

    _tlHeaderNowLine = document.createElement('div');
    _tlHeaderNowLine.className = 'now-line-header';
    _tlHeaderNowLine.style.left = getNowPosition(state.selectedMonth) + '%';
    monthsRow.appendChild(_tlHeaderNowLine);
    header.appendChild(monthsRow);

    _tlHeaderMonth = state.selectedMonth;
    _tlHeaderBuilt = true;
  }

  function _tlUpdateNowLines() {
    var pos = getNowPosition(state.selectedMonth) + '%';
    if (_tlHeaderNowLine) _tlHeaderNowLine.style.left = pos;
    if (_tlBodyNowLine) _tlBodyNowLine.style.left = pos;
    _tlHeaderMonth = state.selectedMonth;
  }

  function _tlEnsureBodyNowLine(body) {
    if (!_tlBodyNowContainer) {
      _tlBodyNowContainer = document.createElement('div');
      _tlBodyNowContainer.style.cssText = 'position: absolute; left: var(--name-col); width: var(--timeline-width); top: 0; bottom: 0; pointer-events: none; z-index: 5;';
      _tlBodyNowLine = document.createElement('div');
      _tlBodyNowLine.className = 'now-line';
      _tlBodyNowContainer.appendChild(_tlBodyNowLine);
    }
    _tlBodyNowLine.style.left = getNowPosition(state.selectedMonth) + '%';
    if (_tlBodyNowContainer.parentNode !== body) {
      body.insertBefore(_tlBodyNowContainer, body.firstChild);
    }
  }

  // Build a fully-populated data row for a produce item
  function _tlMakeDataRow(item) {
    var slug = item.produce.slug;
    var seasons = state.seasonsBySlug[slug] || [];
    var color = getColor(item.produce);

    var localSeasons = seasons.filter(function (s) { return s.t === 'local'; });
    var importSeasons = seasons.filter(function (s) { return s.t === 'import'; });
    var isDual = localSeasons.length > 0 && importSeasons.length > 0;

    var row = document.createElement('div');
    row.className = 'timeline-row' + (isDual ? ' dual-row' : '') + (state.selectedItem === slug ? ' selected' : '');
    row.setAttribute('data-slug', slug);
    row._tlSlug = slug;

    row.addEventListener('click', function () {
      state.selectedItem = state.selectedItem === slug ? null : slug;
      renderSelectionOnly();
    });

    var nameCell = document.createElement('div');
    nameCell.className = 'timeline-name';
    nameCell.style.borderLeft = '3px solid ' + color;
    var nameSpan = document.createElement('span');
    nameSpan.textContent = item.produce.name;
    nameCell.appendChild(nameSpan);
    var aliasSpan = document.createElement('span');
    aliasSpan.className = 'timeline-alias-match';
    if (item.searchMatch && item.searchMatch.type === 'alias') {
      aliasSpan.textContent = '(' + item.searchMatch.term + ')';
    }
    nameCell.appendChild(aliasSpan);
    nameCell.title = item.produce.name;
    row.appendChild(nameCell);
    row._tlAliasSpan = aliasSpan;

    var barsArea = document.createElement('div');
    barsArea.className = 'timeline-bars';

    if (isDual) {
      renderBars(barsArea, localSeasons, color, 'local', true);
      renderBars(barsArea, importSeasons, color, 'import', true);
    } else {
      renderBars(barsArea, seasons, color, seasons[0] ? seasons[0].t : 'local', false);
    }

    // Add sticky source labels for all bars
    var bars = barsArea.querySelectorAll('.season-bar');
    bars.forEach(function (bar) {
      if (!bar._sourceLabel) return;
      var leftPct = parseFloat(bar.style.left);
      var widthPct = parseFloat(bar.style.width);
      var wrap = document.createElement('div');
      var posClass = isDual
        ? (bar.classList.contains('bar-import') ? ' bar-label-import' : ' bar-label-local')
        : ' bar-label-single';
      wrap.className = 'bar-label-track' + posClass;
      wrap.style.left = leftPct + '%';
      wrap.style.width = widthPct + '%';
      var lbl = document.createElement('span');
      lbl.className = 'bar-source-label';
      lbl.textContent = bar._sourceLabel;
      wrap.appendChild(lbl);
      barsArea.appendChild(wrap);
    });

    row.appendChild(barsArea);
    return row;
  }

  // Build a no-data row
  function _tlMakeNoDataRow(item) {
    var slug = item.produce.slug;
    var color = getColor(item.produce);

    var row = document.createElement('div');
    row.className = 'timeline-row no-data' + (state.selectedItem === slug ? ' selected' : '');
    row.setAttribute('data-slug', slug);
    row._tlSlug = slug;

    row.addEventListener('click', function () {
      state.selectedItem = state.selectedItem === slug ? null : slug;
      renderSelectionOnly();
    });

    var nameCell = document.createElement('div');
    nameCell.className = 'timeline-name';
    nameCell.style.borderLeft = '3px solid ' + color;
    var nameSpan = document.createElement('span');
    nameSpan.textContent = item.produce.name;
    nameCell.appendChild(nameSpan);
    var aliasSpan = document.createElement('span');
    aliasSpan.className = 'timeline-alias-match';
    if (item.searchMatch && item.searchMatch.type === 'alias') {
      aliasSpan.textContent = '(' + item.searchMatch.term + ')';
    }
    nameCell.appendChild(aliasSpan);
    nameCell.title = item.produce.name;
    row.appendChild(nameCell);
    row._tlAliasSpan = aliasSpan;

    var barsArea = document.createElement('div');
    barsArea.className = 'timeline-bars no-data-bars';
    var noDataLine = document.createElement('div');
    noDataLine.className = 'no-data-line';
    var noDataLabel = document.createElement('span');
    noDataLabel.className = 'no-data-label';
    noDataLabel.textContent = 'no data';
    noDataLine.appendChild(noDataLabel);
    barsArea.appendChild(noDataLine);

    row.appendChild(barsArea);
    return row;
  }

  // Detach a row from the DOM
  function _tlPoolRow(row) {
    if (row.parentNode) row.parentNode.removeChild(row);
  }

  function renderTimeline() {
    var body = document.getElementById('timeline-body');

    // Build header once; only update now-lines on month change
    if (!_tlHeaderBuilt) {
      _tlBuildHeader();
    } else if (_tlHeaderMonth !== state.selectedMonth) {
      _tlUpdateNowLines();
    }

    var items = sortItems(filterProduce());

    // --- Empty state ---
    if (items.length === 0) {
      // Pool all active rows
      var s;
      for (s in _tlActiveDataRows) {
        _tlPoolRow(_tlActiveDataRows[s]);
        delete _tlActiveDataRows[s];
      }
      for (s in _tlActiveNoDataRows) {
        _tlPoolRow(_tlActiveNoDataRows[s]);
        delete _tlActiveNoDataRows[s];
      }
      if (_tlNoDataDivider && _tlNoDataDivider.parentNode) _tlNoDataDivider.parentNode.removeChild(_tlNoDataDivider);
      if (_tlBodyNowContainer && _tlBodyNowContainer.parentNode) _tlBodyNowContainer.parentNode.removeChild(_tlBodyNowContainer);

      if (!_tlEmptyMsg) {
        _tlEmptyMsg = document.createElement('div');
        _tlEmptyMsg.style.cssText = 'padding: 40px; text-align: center; color: var(--text-muted); font-size: 0.85rem;';
        _tlEmptyMsg.textContent = 'No produce matches your filters.';
      }
      if (_tlEmptyMsg.parentNode !== body) {
        body.innerHTML = '';
        body.appendChild(_tlEmptyMsg);
      }
      return;
    }

    // Remove empty message if showing
    if (_tlEmptyMsg && _tlEmptyMsg.parentNode) _tlEmptyMsg.parentNode.removeChild(_tlEmptyMsg);

    // Ensure now-line is first child
    _tlEnsureBodyNowLine(body);

    // Separate data vs no-data
    var dataItems = [];
    var noDataItems = [];
    items.forEach(function (item) {
      if (item.status === 'no-data') noDataItems.push(item);
      else dataItems.push(item);
    });

    // Build lookup of wanted slugs
    var wantData = {};
    dataItems.forEach(function (item) { wantData[item.produce.slug] = true; });
    var wantNoData = {};
    noDataItems.forEach(function (item) { wantNoData[item.produce.slug] = true; });

    // Pool rows no longer in the filtered set
    var slug;
    for (slug in _tlActiveDataRows) {
      if (!wantData[slug]) {
        _tlPoolRow(_tlActiveDataRows[slug]);
        delete _tlActiveDataRows[slug];
      }
    }
    for (slug in _tlActiveNoDataRows) {
      if (!wantNoData[slug]) {
        _tlPoolRow(_tlActiveNoDataRows[slug]);
        delete _tlActiveNoDataRows[slug];
      }
    }

    // Append data rows in sorted order. appendChild moves existing DOM nodes.
    dataItems.forEach(function (item) {
      var s = item.produce.slug;
      var row = _tlActiveDataRows[s];
      if (row) {
        // Reuse -- toggle selected class + update alias annotation
        row.classList.toggle('selected', state.selectedItem === s);
        if (row._tlAliasSpan) {
          row._tlAliasSpan.textContent = (item.searchMatch && item.searchMatch.type === 'alias')
            ? '(' + item.searchMatch.term + ')' : '';
        }
      } else {
        // Create new row for this slug
        row = _tlMakeDataRow(item);
        _tlActiveDataRows[s] = row;
      }
      body.appendChild(row);
    });

    // No-data divider + rows
    if (noDataItems.length > 0) {
      if (!_tlNoDataDivider) {
        _tlNoDataDivider = document.createElement('div');
        _tlNoDataDivider.className = 'no-data-divider';
      }
      _tlNoDataDivider.innerHTML = '<span>No season data (' + noDataItems.length + ' items)</span>';
      body.appendChild(_tlNoDataDivider);

      noDataItems.forEach(function (item) {
        var s = item.produce.slug;
        var row = _tlActiveNoDataRows[s];
        if (row) {
          row.classList.toggle('selected', state.selectedItem === s);
          if (row._tlAliasSpan) {
            row._tlAliasSpan.textContent = (item.searchMatch && item.searchMatch.type === 'alias')
              ? '(' + item.searchMatch.term + ')' : '';
          }
        } else {
          row = _tlMakeNoDataRow(item);
          _tlActiveNoDataRows[s] = row;
        }
        body.appendChild(row);
      });
    } else if (_tlNoDataDivider && _tlNoDataDivider.parentNode) {
      _tlNoDataDivider.parentNode.removeChild(_tlNoDataDivider);
    }

    // Scroll to now-line on month change or first render
    var monthChanged = _tlLastMonth !== state.selectedMonth;
    _tlLastMonth = state.selectedMonth;

    var container = document.getElementById('timeline-container');
    var firstBars = body.querySelector('.timeline-bars');
    var totalBarWidth = firstBars ? firstBars.offsetWidth : 1200;
    var firstName = body.querySelector('.timeline-name');
    var nameColWidth = firstName ? firstName.offsetWidth : 160;

    if (monthChanged) {
      var nowPct = getNowPosition(state.selectedMonth) / 100;
      var scrollTarget = nameColWidth + (nowPct * totalBarWidth) - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, scrollTarget);
    }

    // Sticky source labels -- update on scroll
    updateStickyLabels(container, nameColWidth, totalBarWidth);
    container.removeEventListener('scroll', container._stickyHandler);
    container._stickyHandler = function () {
      if (!container._stickyRaf) {
        container._stickyRaf = requestAnimationFrame(function () {
          container._stickyRaf = null;
          updateStickyLabels(container, nameColWidth, totalBarWidth);
        });
      }
    };
    container.addEventListener('scroll', container._stickyHandler);
  }

  function updateStickyLabels(container, nameColW, barsW) {
    var scrollL = container.scrollLeft;
    // The bars area starts at nameColW in the document flow,
    // but nameCol is sticky so the visible bars left edge = scrollL
    var visibleBarsLeft = scrollL; // px offset within bars area that's at the left visible edge
    var labels = container.querySelectorAll('.bar-label-track');
    for (var i = 0; i < labels.length; i++) {
      var track = labels[i];
      var trackLeftPct = parseFloat(track.style.left) / 100;
      var trackWidthPct = parseFloat(track.style.width) / 100;
      var trackLeftPx = trackLeftPct * barsW;
      var trackRightPx = (trackLeftPct + trackWidthPct) * barsW;
      var lbl = track.querySelector('.bar-source-label');
      if (!lbl) continue;
      var lblW = lbl.offsetWidth || 40;
      // Clamp: label left = max(0, visibleBarsLeft - trackLeftPx), but don't push past right edge
      var offset = Math.max(0, visibleBarsLeft - trackLeftPx);
      offset = Math.min(offset, trackRightPx - trackLeftPx - lblW);
      if (offset < 0) offset = 0;
      lbl.style.left = offset + 'px';
    }
  }

  function renderBars(container, seasons, color, sourceType, isDual) {
    var allMonths = {}, peakMonths = {};
    seasons.forEach(function (s) {
      s.s.forEach(function (m) { allMonths[m] = true; });
      s.pk.forEach(function (m) { peakMonths[m] = true; });
    });

    var segments = buildSegments(allMonths);

    segments.forEach(function (seg) {
      var bar = document.createElement('div');
      bar.className = 'season-bar' + (sourceType === 'import' ? ' bar-import' : ' bar-local');

      bar.style.left = ((seg.start - 1) / 12 * 100) + '%';
      bar.style.width = (seg.months.length / 12 * 100) + '%';

      bar._sourceLabel = sourceType === 'local' ? 'CA' : (function () {
        var importRegions = [];
        seasons.forEach(function (s) {
          var r = state.regionBySlug[s.r];
          if (r && importRegions.indexOf(r.originGroup) === -1) importRegions.push(r.originGroup);
        });
        return importRegions.length ? importRegions[0] : 'Import';
      })();

      seg.months.forEach(function (m, mi) {
        var sub = document.createElement('div');
        sub.className = 'bar-segment ' + (peakMonths[m] ? 'peak' : 'available');
        sub.style.backgroundColor = color;
        sub.style.left = (mi / seg.months.length * 100) + '%';
        sub.style.width = (1 / seg.months.length * 100) + '%';
        bar.appendChild(sub);
      });

      var tt = document.createElement('div');
      tt.className = 'bar-tooltip';
      if (sourceType === 'local') {
        tt.textContent = 'Local CA';
      } else {
        var ttRegions = [];
        seasons.forEach(function (s) {
          var r = state.regionBySlug[s.r];
          if (r && ttRegions.indexOf(r.name) === -1) ttRegions.push(r.name);
        });
        tt.textContent = ttRegions.length ? ttRegions.join(', ') : 'Imported';
      }
      bar.appendChild(tt);

      container.appendChild(bar);
    });
  }

  function buildSegments(allMonths) {
    var months = [];
    for (var m = 1; m <= 12; m++) { if (allMonths[m]) months.push(m); }
    if (!months.length) return [];

    var segs = [], cur = [months[0]];
    for (var i = 1; i < months.length; i++) {
      if (months[i] === cur[cur.length - 1] + 1) { cur.push(months[i]); }
      else { segs.push({ start: cur[0], months: cur }); cur = [months[i]]; }
    }
    segs.push({ start: cur[0], months: cur });
    return segs;
  }

  // --- Detail Panel ---
  function renderDetail() {
    var panel = document.getElementById('detail-panel');
    var content = document.getElementById('detail-content');

    if (!state.selectedItem) {
      panel.classList.remove('visible');
      panel.classList.add('hidden');
      return;
    }

    var item = state.produceBySlug[state.selectedItem];
    var seasons = state.seasonsBySlug[state.selectedItem] || [];
    var color = getColor(item);
    if (!item) return;

    panel.classList.remove('hidden');
    panel.offsetHeight;
    panel.classList.add('visible');

    var html = '<h2 class="detail-name">' + escHtml(item.name) + '</h2>';
    html += '<div class="detail-meta"><span>' + escHtml(item.category) + '</span><span>' + escHtml(item.culinaryGroup) + '</span></div>';
    var itemAliases = item.a || [];
    if (itemAliases.length) {
      html += '<div class="detail-aliases">Also known as: ' + itemAliases.map(escHtml).join(', ') + '</div>';
    }

    if (!seasons.length) {
      html += '<p class="detail-notes" style="font-style: normal; color: var(--text-muted);">No season data available for this item.</p>';
      content.innerHTML = html;
      return;
    }

    var notes = '', storageTip = '';
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].n && !notes) notes = seasons[i].n;
      if (seasons[i].st && !storageTip) storageTip = seasons[i].st;
    }
    if (notes) html += '<p class="detail-notes">"' + escHtml(notes) + '"</p>';

    html += '<div class="detail-seasons">';
    var seen = {};
    seasons.forEach(function (s) {
      var key = s.r + ':' + s.t;
      if (!seen[key]) {
        seen[key] = { season: s, seasonMonths: new Set(s.s), peakMonths: new Set(s.pk) };
      } else {
        s.s.forEach(function (m) { seen[key].seasonMonths.add(m); });
        s.pk.forEach(function (m) { seen[key].peakMonths.add(m); });
      }
    });

    Object.keys(seen).forEach(function (key) {
      var entry = seen[key], s = entry.season;
      var region = state.regionBySlug[s.r];
      var rn = region ? region.name : s.r;
      var sArr = Array.from(entry.seasonMonths).sort(function (a, b) { return a - b; });
      var pArr = Array.from(entry.peakMonths).sort(function (a, b) { return a - b; });

      html += '<div class="detail-season-entry">';
      html += '<div class="detail-season-header"><span class="detail-region-name">' + escHtml(rn) + '</span>';
      html += '<span class="detail-source-badge ' + escHtml(s.t) + '">' + escHtml(s.t) + '</span></div>';
      html += '<div class="detail-season-months">Season: ' + monthRangeText(sArr) + ' &middot; Peak: ' + (pArr.length ? monthRangeText(pArr) : 'no clear peak') + '</div>';
      html += '<div class="detail-minibar-labels">';
      'JFMAMJJASOND'.split('').forEach(function (l) { html += '<span>' + l + '</span>'; });
      html += '</div>';
      html += '<div class="detail-minibar">';
      for (var m = 1; m <= 12; m++) {
        var cls = 'minibar-cell', style = '';
        if (entry.peakMonths.has(m)) { cls += ' peak'; style = 'background-color:' + color; }
        else if (entry.seasonMonths.has(m)) { cls += ' in-season'; style = 'background-color:' + color; }
        html += '<div class="' + cls + '"' + (style ? ' style="' + style + '"' : '') + '></div>';
      }
      html += '</div></div>';
    });
    html += '</div>';

    if (storageTip) {
      html += '<div class="detail-storage"><div class="detail-storage-label">Storage</div>' + escHtml(storageTip) + '</div>';
    }
    content.innerHTML = html;
  }

  function monthRangeText(months) {
    if (!months.length) return '';
    if (months.length === 12) return 'Year-round';
    // Detect wrap-around: if sorted months have a gap > 1, the range wraps.
    // e.g. [1, 10, 11, 12] has a gap between 1 and 10 — actual range is Oct–Jan.
    var sorted = months.slice().sort(function (a, b) { return a - b; });
    // Find the largest gap between consecutive months
    var maxGap = 0, gapAfter = 0;
    for (var i = 0; i < sorted.length - 1; i++) {
      var gap = sorted[i + 1] - sorted[i];
      if (gap > maxGap) { maxGap = gap; gapAfter = i; }
    }
    // Also check wrap gap (Dec -> Jan)
    var wrapGap = 12 - sorted[sorted.length - 1] + sorted[0];
    if (wrapGap >= maxGap) {
      // No wrap — contiguous range, first to last
      return MONTH_NAMES[sorted[0] - 1] + ' \u2013 ' + MONTH_NAMES[sorted[sorted.length - 1] - 1];
    }
    // Wrapped range — starts after the gap, ends before it
    var start = sorted[gapAfter + 1];
    var end = sorted[gapAfter];
    return MONTH_NAMES[start - 1] + ' \u2013 ' + MONTH_NAMES[end - 1];
  }

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // --- Search ---
  var searchTimeout;
  function bindSearch() {
    var input = document.getElementById('search');
    var clearBtn = document.getElementById('search-clear');
    input.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      clearBtn.classList.toggle('visible', input.value.length > 0);
      searchTimeout = setTimeout(function () {
        state.searchQuery = input.value.trim();
        render();
      }, 150);
    });
    clearBtn.addEventListener('click', function () {
      input.value = '';
      clearBtn.classList.remove('visible');
      state.searchQuery = '';
      state.selectedItem = null;
      render();
      input.focus();
    });
  }

  // --- Ring Arrows ---
  function bindRingArrows() {
    document.getElementById('ring-prev').addEventListener('click', function () {
      state.selectedMonth = state.selectedMonth === 1 ? 12 : state.selectedMonth - 1;
      render();
    });
    document.getElementById('ring-next').addEventListener('click', function () {
      state.selectedMonth = state.selectedMonth === 12 ? 1 : state.selectedMonth + 1;
      render();
    });
  }

  // --- Detail close ---
  function bindDetailClose() {
    document.getElementById('detail-close').addEventListener('click', function () {
      state.selectedItem = null;
      renderSelectionOnly();
    });
  }

  // (drag removed — all rings use click-to-rotate-to-top)

  // --- Load Animation (Juggins-style staggered reveal) ---
  var animTimers = [];
  var animDone = false;

  function playLoadAnimation() {
    // Guard against re-entrancy
    if (animDone) return;
    animTimers.forEach(clearTimeout);
    animTimers = [];

    // Outer ring — clockwise stagger
    var segments = document.querySelectorAll('.ring-segment');
    segments.forEach(function (seg, i) {
      animTimers.push(setTimeout(function () { seg.classList.add('anim-in'); }, 80 + i * 25));
    });

    // Middle ring — stagger after outer
    var midSegs = document.querySelectorAll('.mid-segment');
    midSegs.forEach(function (seg, i) {
      animTimers.push(setTimeout(function () { seg.classList.add('anim-in'); }, 420 + i * 20));
    });

    // Inner ring — stagger after middle
    var innerSegs = document.querySelectorAll('.inner-segment');
    innerSegs.forEach(function (seg, i) {
      animTimers.push(setTimeout(function () { seg.classList.add('anim-in'); }, 620 + i * 20));
    });

    // Center text
    animTimers.push(setTimeout(function () {
      document.querySelector('.ring-center').classList.add('anim-in');
    }, 740));

    // Controls bar
    animTimers.push(setTimeout(function () {
      var c = document.querySelector('.controls');
      if (c) c.classList.add('anim-in');
    }, 840));

    // Timeline rows
    animTimers.push(setTimeout(function () {
      document.querySelectorAll('.timeline-row').forEach(function (row, i) {
        row.style.animationDelay = (i * 12) + 'ms';
        row.classList.add('anim-in');
      });
      animDone = true;
    }, 960));
  }

  function skipAnimation() {
    if (animDone) return;
    animTimers.forEach(clearTimeout);
    animTimers = [];
    animDone = true;
    document.querySelectorAll('.ring-segment, .ring-center, .controls, .mid-segment, .inner-segment, .timeline-row')
      .forEach(function (el) { el.classList.add('anim-in'); el.style.animationDelay = '0ms'; });
  }

  // --- Filter Accordion ---
  var AVAILABILITY_OPTIONS = [
    { id: 'year-round', label: 'Year-round' },
    { id: 'seasonal', label: 'Seasonal' },
    { id: 'short', label: 'Short Season' },
    { id: 'long', label: 'Long Season' },
  ];

  var SORT_OPTIONS = [
    { id: 'status', label: 'Default' },
    { id: 'alpha', label: 'A-Z' },
    { id: 'peak-month', label: 'Peak Month' },
    { id: 'season-length', label: 'Season Length' },
    { id: 'category', label: 'Category' },
  ];

  function buildFilterAccordion() {
    // -- Status chips --
    var statusChips = document.getElementById('status-chips');
    INNER_ITEMS.forEach(function (item, idx) {
      var chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = item.label;
      chip.setAttribute('data-id', item.id);
      chip.addEventListener('click', function () {
        innerLastClicked = idx;
        if (item.id === 'all') {
          state.activeStatus.clear();
        } else {
          if (state.activeStatus.has(item.id)) { state.activeStatus.delete(item.id); }
          else { state.activeStatus.add(item.id); }
          if (state.activeStatus.size === 3) { state.activeStatus.clear(); innerLastClicked = 3; }
        }
        render();
      });
      statusChips.appendChild(chip);
    });

    // -- Category chips --
    var catChips = document.getElementById('category-chips');
    MID_ITEMS.forEach(function (item, idx) {
      if (item.type !== 'category') return;
      var chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = item.label;
      chip.setAttribute('data-match', item.match);
      chip.addEventListener('click', function () {
        midLastClicked = idx;
        if (state.activeCategories.has(item.match)) { state.activeCategories.delete(item.match); }
        else { state.activeCategories.add(item.match); }
        updateCulinaryChips();
        render();
      });
      catChips.appendChild(chip);
    });

    // -- Culinary group chips --
    buildCulinaryChips();

    // -- Source chips --
    var srcChips = document.getElementById('source-chips');
    MID_ITEMS.forEach(function (item, idx) {
      if (item.type !== 'source') return;
      var chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = item.label;
      chip.setAttribute('data-match', item.match);
      chip.addEventListener('click', function () {
        midLastClicked = idx;
        if (state.activeSource.has(item.match)) { state.activeSource.delete(item.match); }
        else { state.activeSource.add(item.match); }
        render();
      });
      srcChips.appendChild(chip);
    });

    // -- Origin group chips --
    var originChips = document.getElementById('origin-chips');
    ORIGIN_GROUPS.forEach(function (group) {
      var chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = group;
      chip.setAttribute('data-group', group);
      chip.addEventListener('click', function () {
        if (state.activeOriginGroups.has(group)) { state.activeOriginGroups.delete(group); }
        else { state.activeOriginGroups.add(group); }
        render();
      });
      originChips.appendChild(chip);
    });

    // -- Availability chips --
    var availChips = document.getElementById('availability-chips');
    AVAILABILITY_OPTIONS.forEach(function (opt) {
      var chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = opt.label;
      chip.setAttribute('data-id', opt.id);
      chip.addEventListener('click', function () {
        if (state.availabilityFilter === opt.id) { state.availabilityFilter = null; }
        else { state.availabilityFilter = opt.id; }
        render();
      });
      availChips.appendChild(chip);
    });

    // -- Sort chips --
    var sortChips = document.getElementById('sort-chips');
    SORT_OPTIONS.forEach(function (opt) {
      var chip = document.createElement('button');
      chip.className = 'filter-chip' + (opt.id === 'status' ? ' active' : '');
      chip.textContent = opt.label;
      chip.setAttribute('data-sort', opt.id);
      chip.addEventListener('click', function () {
        state.sortMode = opt.id;
        render();
      });
      sortChips.appendChild(chip);
    });

    // -- Accordion header toggles --
    var headers = document.querySelectorAll('.accordion-header');
    headers.forEach(function (header) {
      header.addEventListener('click', function () {
        var section = header.parentElement.getAttribute('data-section');
        var expanded = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (expanded) { state.expandedSections.delete(section); }
        else { state.expandedSections.add(section); }
      });
    });

    // -- Filter toggle button --
    document.getElementById('filter-toggle').addEventListener('click', function (e) {
      e.stopPropagation();
      state.filterAccordionOpen = !state.filterAccordionOpen;
      document.getElementById('filter-accordion').classList.toggle('hidden', !state.filterAccordionOpen);
      document.getElementById('filter-toggle').classList.toggle('accordion-open', state.filterAccordionOpen);
      if (!state.filterAccordionOpen) this.blur();
    });
  }

  function buildCulinaryChips() {
    var container = document.getElementById('culinary-chips');
    container.innerHTML = '';
    var groups = getVisibleCulinaryGroups();
    groups.forEach(function (group) {
      var chip = document.createElement('button');
      chip.className = 'filter-chip' + (state.activeCulinaryGroups.has(group) ? ' active' : '');
      chip.textContent = group;
      chip.setAttribute('data-group', group);
      chip.addEventListener('click', function () {
        if (state.activeCulinaryGroups.has(group)) { state.activeCulinaryGroups.delete(group); }
        else { state.activeCulinaryGroups.add(group); }
        render();
      });
      container.appendChild(chip);
    });
  }

  function getVisibleCulinaryGroups() {
    if (state.activeCategories.size === 0) return ALL_CULINARY_GROUPS;
    var visible = {};
    state.activeCategories.forEach(function (cat) {
      var groups = CATEGORY_TO_GROUPS[cat] || [];
      groups.forEach(function (g) { visible[g] = true; });
    });
    return Object.keys(visible).sort();
  }

  function updateCulinaryChips() {
    // Clear orphaned selections
    var visible = getVisibleCulinaryGroups();
    var visibleSet = {};
    visible.forEach(function (g) { visibleSet[g] = true; });
    state.activeCulinaryGroups.forEach(function (g) {
      if (!visibleSet[g]) state.activeCulinaryGroups.delete(g);
    });
    buildCulinaryChips();
  }

  function updateFilterAccordion() {
    // Sync status chips
    var statusChips = document.getElementById('status-chips').children;
    for (var i = 0; i < INNER_ITEMS.length; i++) {
      var isActive;
      if (INNER_ITEMS[i].id === 'all') {
        isActive = state.activeStatus.size === 0;
      } else {
        isActive = state.activeStatus.has(INNER_ITEMS[i].id);
      }
      statusChips[i].classList.toggle('active', isActive);
    }

    // Sync category chips
    var catChips = document.getElementById('category-chips').children;
    var catIdx = 0;
    MID_ITEMS.forEach(function (item) {
      if (item.type !== 'category') return;
      catChips[catIdx].classList.toggle('active', state.activeCategories.has(item.match));
      catIdx++;
    });

    // Update culinary chips visibility
    updateCulinaryChips();

    // Sync source chips
    var srcChips = document.getElementById('source-chips').children;
    var srcIdx = 0;
    MID_ITEMS.forEach(function (item) {
      if (item.type !== 'source') return;
      srcChips[srcIdx].classList.toggle('active', state.activeSource.has(item.match));
      srcIdx++;
    });

    // Sync origin chips
    var originChips = document.getElementById('origin-chips').children;
    for (var j = 0; j < ORIGIN_GROUPS.length; j++) {
      originChips[j].classList.toggle('active', state.activeOriginGroups.has(ORIGIN_GROUPS[j]));
    }

    // Sync availability chips
    var availChips = document.getElementById('availability-chips').children;
    for (var k = 0; k < AVAILABILITY_OPTIONS.length; k++) {
      availChips[k].classList.toggle('active', state.availabilityFilter === AVAILABILITY_OPTIONS[k].id);
    }

    // Sync sort chips
    var sortChips = document.getElementById('sort-chips').children;
    for (var s = 0; s < SORT_OPTIONS.length; s++) {
      sortChips[s].classList.toggle('active', state.sortMode === SORT_OPTIONS[s].id);
    }

    // Update section badges
    updateAccordionBadge('badge-status',
      state.activeStatus.size > 0 && state.activeStatus.size < 3 ? state.activeStatus.size : 0);
    updateAccordionBadge('badge-category', state.activeCategories.size);
    updateAccordionBadge('badge-culinary', state.activeCulinaryGroups.size);
    updateAccordionBadge('badge-source-origin', state.activeSource.size + state.activeOriginGroups.size);
    updateAccordionBadge('badge-availability', state.availabilityFilter !== null ? 1 : 0);
    updateAccordionBadge('badge-sort', state.sortMode !== 'status' ? 1 : 0);
  }

  function updateAccordionBadge(id, count) {
    var badge = document.getElementById(id);
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // --- Main Render ---
  // --- Lightweight render for selection-only changes ---
  // Toggles .selected on timeline rows and updates the detail panel
  // without rebuilding the entire timeline, rings, or filters.
  function renderSelectionOnly() {
    var prev = document.querySelector('.timeline-row.selected');
    if (prev) prev.classList.remove('selected');

    if (state.selectedItem) {
      var next = document.querySelector('.timeline-row[data-slug="' + state.selectedItem + '"]');
      if (next) next.classList.add('selected');
    }

    renderDetail();
  }

  function render() {
    computeAllStatuses(state.selectedMonth);
    renderRing();
    updateMiddleRing();
    updateInnerRing();
    updateResetButton();
    updateFilterAccordion();

    renderTimeline();

    renderDetail();

    if (animDone) {
      document.querySelectorAll('.timeline-row:not(.anim-in)').forEach(function (row) {
        row.classList.add('anim-in');
      });
    }
  }

  // --- Nav Hamburger Menu ---
  function bindNavMenu() {
    var hamburger = document.getElementById('nav-hamburger');
    var menu = document.getElementById('nav-menu');
    if (!hamburger || !menu) return;

    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      hamburger.classList.toggle('open');
      menu.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (menu.classList.contains('open') && !menu.contains(e.target)) {
        hamburger.classList.remove('open');
        menu.classList.remove('open');
      }
    });

    var brand = document.getElementById('nav-brand');
    if (brand) {
      brand.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  // --- Init ---
  function init() {
    loadData().then(function () {
      buildMiddleRing();
      buildInnerRing();
      buildLeafDecor();
      bindSearch();
      buildFilterAccordion();
      bindResetFilters();
      bindRingArrows();
      bindDetailClose();
      bindNavMenu();
      render();
      playLoadAnimation();

      document.addEventListener('click', skipAnimation, { once: true });
      document.addEventListener('keydown', skipAnimation, { once: true });
    }).catch(function (err) {
      var main = document.getElementById('main-content');
      if (main) {
        main.innerHTML = '<p style="padding:2rem;text-align:center;color:var(--text-secondary);">'
          + 'Unable to load produce data. Please try refreshing the page.</p>';
      }
      console.error('Data load failed:', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
