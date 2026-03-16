/* ============================================
   Seasonal Produce California — App
   Dark theme with rotating ring navigator
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
    view: 'timeline',
    selectedItem: null,
    showOffSeason: false,
  };

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
        if (!state.seasonsBySlug[s.produceSlug]) state.seasonsBySlug[s.produceSlug] = [];
        state.seasonsBySlug[s.produceSlug].push(s);
      });
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
      if (seasons[i].peakMonths.indexOf(month) !== -1) isPeak = true;
      if (seasons[i].seasonMonths.indexOf(month) !== -1) isSeason = true;
    }
    if (isPeak) return 'peak';
    if (isSeason) return 'in-season';
    var next = month === 12 ? 1 : month + 1;
    for (var j = 0; j < seasons.length; j++) {
      if (seasons[j].seasonMonths.indexOf(next) !== -1) return 'coming';
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
    seasons.forEach(function (s) { types[s.sourceType] = true; });
    return types;
  }

  // --- Filtering ---
  function filterProduce() {
    var items = [];
    var month = state.selectedMonth;

    state.data.produce.forEach(function (p) {
      if (!state.seasonsBySlug[p.slug]) return;

      if (state.searchQuery) {
        if (p.name.toLowerCase().indexOf(state.searchQuery.toLowerCase()) === -1) return;
      }

      if (state.activeCategories.size > 0) {
        if (!state.activeCategories.has(p.category)) return;
      }

      if (state.activeSource.size > 0) {
        var types = getSourceTypes(p.slug);
        var sourceMatch = false;
        state.activeSource.forEach(function (s) { if (types[s]) sourceMatch = true; });
        if (!sourceMatch) return;
      }

      var status = getItemStatus(p.slug, month);

      if (state.activeStatus.size > 0 && state.activeStatus.size < 3) {
        var passes = false;
        if (state.activeStatus.has('peak') && status === 'peak') passes = true;
        if (state.activeStatus.has('coming') && getItemIsComingSoon(p.slug, month)) passes = true;
        if (state.activeStatus.has('leaving') && getItemIsLeavingPeak(p.slug, month)) passes = true;
        if (!passes) return;
      }

      if (state.view === 'grid' && !state.showOffSeason && (status === 'off' || status === 'none')) {
        return;
      }

      items.push({ produce: p, status: status });
    });

    return items;
  }

  function sortItems(items) {
    var order = { peak: 0, 'in-season': 1, coming: 2, off: 3, none: 4 };
    items.sort(function (a, b) {
      var oa = order[a.status] !== undefined ? order[a.status] : 4;
      var ob = order[b.status] !== undefined ? order[b.status] : 4;
      if (oa !== ob) return oa - ob;
      // Locality tiebreaker: local items rank higher than import
      var aLocal = hasLocalSeason(a.produce.slug) ? 0 : 1;
      var bLocal = hasLocalSeason(b.produce.slug) ? 0 : 1;
      if (aLocal !== bLocal) return aLocal - bLocal;
      return a.produce.name.localeCompare(b.produce.name);
    });
    return items;
  }

  function hasLocalSeason(slug) {
    var seasons = state.seasonsBySlug[slug] || [];
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].sourceType === 'local') return true;
    }
    return false;
  }

  // --- Stats ---
  function computeStats(month) {
    var inSeason = 0, atPeak = 0;
    state.data.produce.forEach(function (p) {
      var status = getItemStatus(p.slug, month);
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
  // Stoumann-inspired leaf embellishments
  // Translates CSS shape() arcs to SVG paths
  // ============================================
  function buildLeafDecor() {
    var group = document.getElementById('ring-leaf-decor');
    group.innerHTML = '';

    // Stoumann .leaf-main: almond shape — two opposing elliptical arcs
    // shape(from 50% 0%, arc to 50% 100% of 100% 75% ccw, arc to 50% 0% of 100% 75% ccw)
    // In SVG: a vertical almond centered on 150,150, ~260px tall
    var leafMain = 'M 150 30 C 80 90 80 210 150 270 C 220 210 220 90 150 30 Z';

    var l1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    l1.setAttribute('d', leafMain);
    l1.setAttribute('class', 'leaf-embellish leaf-main');
    l1.setAttribute('transform', 'rotate(22 150 150)');
    group.appendChild(l1);

    var l2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    l2.setAttribute('d', leafMain);
    l2.setAttribute('class', 'leaf-embellish leaf-main');
    l2.setAttribute('transform', 'rotate(-22 150 150)');
    group.appendChild(l2);

    // Stoumann .leaf-left / .leaf-right: smaller horizontal leaves
    // shape(from 0% 50%, arc to 100% 50% of 100% 250% ccw, arc to 0% 50% of 100% 250% ccw)
    var leafSmall = 'M 120 150 C 135 130 165 130 180 150 C 165 170 135 170 120 150 Z';

    var l3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    l3.setAttribute('d', leafSmall);
    l3.setAttribute('class', 'leaf-embellish leaf-side');
    l3.setAttribute('transform', 'rotate(50 150 150) translate(0 -80)');
    group.appendChild(l3);

    var l4 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    l4.setAttribute('d', leafSmall);
    l4.setAttribute('class', 'leaf-embellish leaf-side');
    l4.setAttribute('transform', 'rotate(-50 150 150) translate(0 -80)');
    group.appendChild(l4);

    // Stoumann .sun: gold circle accent
    var sun = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    sun.setAttribute('cx', '150');
    sun.setAttribute('cy', '150');
    sun.setAttribute('r', '56');
    sun.setAttribute('class', 'leaf-embellish sun-glow');
    group.appendChild(sun);

    // Thin ring dividers (like brass bezels on a watchface)
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
  function bindResetFilters() {
    document.getElementById('reset-filters').addEventListener('click', function () {
      state.activeCategories.clear();
      state.activeSource.clear();
      state.activeStatus.clear();
      midLastClicked = 0;
      innerLastClicked = 3; // rotate "All" to top
      render();
    });
  }

  function updateResetButton() {
    var hasFilters = state.activeCategories.size > 0 ||
                     state.activeSource.size > 0 ||
                     (state.activeStatus.size > 0 && state.activeStatus.size < 3);
    document.getElementById('reset-filters').classList.toggle('hidden', !hasFilters);
  }

  // --- Now line position ---
  function getNowPosition(month) {
    var day = new Date().getDate();
    var daysInMonth = new Date(new Date().getFullYear(), month, 0).getDate();
    var fraction = (day - 1) / daysInMonth;
    return ((month - 1 + fraction) / 12) * 100;
  }

  // --- Render: Timeline ---
  function renderTimeline() {
    var header = document.getElementById('timeline-header');
    var body = document.getElementById('timeline-body');

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

    var nowLineH = document.createElement('div');
    nowLineH.className = 'now-line-header';
    nowLineH.style.left = getNowPosition(state.selectedMonth) + '%';
    monthsRow.appendChild(nowLineH);

    header.appendChild(monthsRow);

    body.innerHTML = '';
    var items = sortItems(filterProduce());

    if (items.length === 0) {
      body.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No produce matches your filters.</div>';
      return;
    }

    var nowLineContainer = document.createElement('div');
    nowLineContainer.style.cssText = 'position: absolute; left: var(--name-col); width: var(--timeline-width); top: 0; bottom: 0; pointer-events: none; z-index: 5;';
    var nowLine = document.createElement('div');
    nowLine.className = 'now-line';
    nowLine.style.left = getNowPosition(state.selectedMonth) + '%';
    nowLineContainer.appendChild(nowLine);
    body.appendChild(nowLineContainer);

    items.forEach(function (item) {
      var slug = item.produce.slug;
      var seasons = state.seasonsBySlug[slug] || [];
      var color = getColor(item.produce);

      var localSeasons = seasons.filter(function (s) { return s.sourceType === 'local'; });
      var importSeasons = seasons.filter(function (s) { return s.sourceType === 'import'; });
      var isDual = localSeasons.length > 0 && importSeasons.length > 0;

      var row = document.createElement('div');
      row.className = 'timeline-row' + (isDual ? ' dual-row' : '') + (state.selectedItem === slug ? ' selected' : '');

      row.addEventListener('click', function () {
        state.selectedItem = state.selectedItem === slug ? null : slug;
        render();
      });

      var nameCell = document.createElement('div');
      nameCell.className = 'timeline-name';
      nameCell.style.borderLeft = '3px solid ' + color;

      nameCell.appendChild(document.createTextNode(item.produce.name));
      nameCell.title = item.produce.name;
      row.appendChild(nameCell);

      var barsArea = document.createElement('div');
      barsArea.className = 'timeline-bars';

      if (isDual) {
        renderBars(barsArea, localSeasons, color, 'local', true);
        renderBars(barsArea, importSeasons, color, 'import', true);
      } else {
        renderBars(barsArea, seasons, color, seasons[0] ? seasons[0].sourceType : 'local', false);
      }

      row.appendChild(barsArea);
      body.appendChild(row);
    });

    // Scroll to now line
    var container = document.getElementById('timeline-container');
    var firstBars = body.querySelector('.timeline-bars');
    var totalBarWidth = firstBars ? firstBars.offsetWidth : 1200;
    var firstName = body.querySelector('.timeline-name');
    var nameColWidth = firstName ? firstName.offsetWidth : 160;
    var nowPct = getNowPosition(state.selectedMonth) / 100;
    var scrollTarget = nameColWidth + (nowPct * totalBarWidth) - container.clientWidth / 2;
    container.scrollLeft = Math.max(0, scrollTarget);
  }

  function renderBars(container, seasons, color, sourceType, isDual) {
    var allMonths = {}, peakMonths = {};
    seasons.forEach(function (s) {
      s.seasonMonths.forEach(function (m) { allMonths[m] = true; });
      s.peakMonths.forEach(function (m) { peakMonths[m] = true; });
    });

    var segments = buildSegments(allMonths);

    segments.forEach(function (seg) {
      var bar = document.createElement('div');
      bar.className = 'season-bar' + (sourceType === 'import' ? ' bar-import' : ' bar-local');

      bar.style.left = ((seg.start - 1) / 12 * 100) + '%';
      bar.style.width = (seg.months.length / 12 * 100) + '%';

      if (isDual) {
        var lbl = document.createElement('span');
        lbl.className = 'bar-source-label';
        if (sourceType === 'local') {
          lbl.textContent = 'CA';
        } else {
          // Show origin region abbreviation for imports
          var importRegions = [];
          seasons.forEach(function (s) {
            var r = state.regionBySlug[s.regionSlug];
            if (r && importRegions.indexOf(r.originGroup) === -1) importRegions.push(r.originGroup);
          });
          lbl.textContent = importRegions.length ? importRegions[0] : 'Import';
        }
        bar.appendChild(lbl);
      }

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
          var r = state.regionBySlug[s.regionSlug];
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

  // --- Grid ---
  function renderGrid() {
    var container = document.getElementById('grid-container');
    container.innerHTML = '';
    var items = sortItems(filterProduce());

    if (!items.length) {
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No produce matches your filters.</div>';
      return;
    }

    var groups = {};
    items.forEach(function (item) {
      var cat = item.produce.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    Object.keys(groups).sort().forEach(function (cat) {
      var group = document.createElement('div');
      group.className = 'grid-category-group';
      var title = document.createElement('h2');
      title.className = 'grid-category-title';
      title.textContent = cat;
      group.appendChild(title);

      var cards = document.createElement('div');
      cards.className = 'grid-cards';
      groups[cat].forEach(function (item) { cards.appendChild(createGridCard(item)); });
      group.appendChild(cards);
      container.appendChild(group);
    });
  }

  function createGridCard(item) {
    var slug = item.produce.slug;
    var seasons = state.seasonsBySlug[slug] || [];
    var color = getColor(item.produce);

    var card = document.createElement('div');
    card.className = 'grid-card' + (state.selectedItem === slug ? ' selected' : '');
    card.addEventListener('click', function () {
      state.selectedItem = state.selectedItem === slug ? null : slug;
      render();
    });

    var name = document.createElement('div');
    name.className = 'grid-card-name';
    name.textContent = item.produce.name;
    card.appendChild(name);

    var gl = document.createElement('div');
    gl.className = 'grid-card-group';
    gl.textContent = item.produce.culinaryGroup;
    card.appendChild(gl);

    var minibar = document.createElement('div');
    minibar.className = 'grid-card-minibar';
    var allM = {}, peakM = {};
    seasons.forEach(function (s) {
      s.seasonMonths.forEach(function (m) { allM[m] = true; });
      s.peakMonths.forEach(function (m) { peakM[m] = true; });
    });
    for (var m = 1; m <= 12; m++) {
      var cell = document.createElement('div');
      cell.className = 'minibar-cell';
      if (peakM[m]) { cell.classList.add('peak'); cell.style.backgroundColor = color; }
      else if (allM[m]) { cell.classList.add('in-season'); cell.style.backgroundColor = color; }
      minibar.appendChild(cell);
    }
    card.appendChild(minibar);

    var regionNames = [];
    var primarySource = 'local';
    seasons.forEach(function (s) {
      var r = state.regionBySlug[s.regionSlug];
      if (r && regionNames.indexOf(r.name) === -1) regionNames.push(r.name);
      if (s.sourceType === 'import') primarySource = 'import';
    });
    if (regionNames.length) {
      var re = document.createElement('div');
      re.className = 'grid-card-region';
      re.textContent = regionNames.slice(0, 2).join(', ');
      if (regionNames.length > 2) re.textContent += ' +' + (regionNames.length - 2);
      card.appendChild(re);
    }

    var se = document.createElement('span');
    se.className = 'grid-card-source ' + primarySource;
    se.textContent = primarySource;
    card.appendChild(se);

    return card;
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

    var notes = '', storageTip = '';
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].notes && !notes) notes = seasons[i].notes;
      if (seasons[i].storageTip && !storageTip) storageTip = seasons[i].storageTip;
    }
    if (notes) html += '<p class="detail-notes">"' + escHtml(notes) + '"</p>';

    html += '<div class="detail-seasons">';
    var seen = {};
    seasons.forEach(function (s) {
      var key = s.regionSlug + ':' + s.sourceType;
      if (!seen[key]) {
        seen[key] = { season: s, seasonMonths: new Set(s.seasonMonths), peakMonths: new Set(s.peakMonths) };
      } else {
        s.seasonMonths.forEach(function (m) { seen[key].seasonMonths.add(m); });
        s.peakMonths.forEach(function (m) { seen[key].peakMonths.add(m); });
      }
    });

    Object.keys(seen).forEach(function (key) {
      var entry = seen[key], s = entry.season;
      var region = state.regionBySlug[s.regionSlug];
      var rn = region ? region.name : s.regionSlug;
      var sArr = Array.from(entry.seasonMonths).sort(function (a, b) { return a - b; });
      var pArr = Array.from(entry.peakMonths).sort(function (a, b) { return a - b; });

      html += '<div class="detail-season-entry">';
      html += '<div class="detail-season-header"><span class="detail-region-name">' + escHtml(rn) + '</span>';
      html += '<span class="detail-source-badge ' + s.sourceType + '">' + s.sourceType + '</span></div>';
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

  // --- View toggle ---
  function bindViewToggle() {
    document.getElementById('view-timeline').addEventListener('click', function () { state.view = 'timeline'; render(); });
    document.getElementById('view-grid').addEventListener('click', function () { state.view = 'grid'; render(); });
  }

  function updateViewToggle() {
    document.getElementById('view-timeline').classList.toggle('active', state.view === 'timeline');
    document.getElementById('view-grid').classList.toggle('active', state.view === 'grid');
  }

  // --- Search ---
  var searchTimeout;
  function bindSearch() {
    var input = document.getElementById('search');
    input.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        state.searchQuery = input.value.trim();
        render();
      }, 150);
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
      render();
    });
  }

  // (drag removed — all rings use click-to-rotate-to-top)

  // --- Load Animation (Juggins-style staggered reveal) ---
  var animTimers = [];
  var animDone = false;

  function playLoadAnimation() {
    animTimers.push(setTimeout(function () {
      document.querySelector('.site-title').classList.add('anim-in');
    }, 0));

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
    document.querySelectorAll('.site-title, .ring-segment, .ring-center, .controls, .mid-segment, .inner-segment, .timeline-row')
      .forEach(function (el) { el.classList.add('anim-in'); el.style.animationDelay = '0ms'; });
  }

  // --- Peak Strip ---
  function renderPeakStrip() {
    var container = document.getElementById('peak-strip');
    if (!container) return;
    container.innerHTML = '';

    // Only show when status filter is "All" (empty set) or includes "peak"
    var sz = state.activeStatus.size;
    if (sz > 0 && !state.activeStatus.has('peak')) {
      container.classList.add('hidden');
      return;
    }

    var month = state.selectedMonth;
    var peakItems = [];
    state.data.produce.forEach(function (p) {
      if (getItemStatus(p.slug, month) === 'peak') {
        peakItems.push(p);
      }
    });

    // Sort by name, take up to 12 for the strip
    peakItems.sort(function (a, b) { return a.name.localeCompare(b.name); });
    var items = peakItems.slice(0, 12);

    if (!items.length) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    var label = document.createElement('span');
    label.className = 'peak-strip-label';
    label.textContent = 'Peak now';
    container.appendChild(label);

    items.forEach(function (p) {
      var card = document.createElement('button');
      card.className = 'peak-card';
      var color = getColor(p);
      card.style.borderColor = color;
      card.style.setProperty('--card-color', color);
      card.textContent = p.name;
      card.addEventListener('click', function () {
        state.selectedItem = state.selectedItem === p.slug ? null : p.slug;
        render();
      });
      container.appendChild(card);
    });
  }

  // --- Main Render ---
  function render() {
    renderRing();
    updateMiddleRing();
    updateInnerRing();
    updateResetButton();
    updateViewToggle();
    renderPeakStrip();

    if (state.view === 'timeline') {
      document.getElementById('timeline-container').classList.remove('hidden');
      document.getElementById('grid-container').classList.add('hidden');
      renderTimeline();
    } else {
      document.getElementById('timeline-container').classList.add('hidden');
      document.getElementById('grid-container').classList.remove('hidden');
      renderGrid();
    }

    renderDetail();

    if (animDone) {
      document.querySelectorAll('.timeline-row:not(.anim-in)').forEach(function (row) {
        row.classList.add('anim-in');
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
      bindViewToggle();
      bindResetFilters();
      bindRingArrows();
      bindDetailClose();
      render();
      playLoadAnimation();

      document.addEventListener('click', skipAnimation, { once: true });
      document.addEventListener('keydown', skipAnimation, { once: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
