/* ============================================
   Seasonal Produce California — App
   Dark theme with rotating ring navigator
   ============================================ */

(function () {
  'use strict';

  var MONTH_ABBRS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  var MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  var MONTH_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  var CATEGORY_CHIPS = [
    { label: 'Fruit', match: 'Fruit' },
    { label: 'Vegetable', match: 'Vegetable' },
    { label: 'Chile', match: 'Chile Pepper' },
    { label: 'Herb', match: 'Herb' },
    { label: 'Mushroom', match: 'Mushroom' },
    { label: 'Nut', match: 'Nut' },
    { label: 'Flower', match: 'Edible Flower' },
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
    categoryFilter: null,
    sourceFilter: null,
    quickAction: 'all',
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
      if (state.categoryFilter) {
        if (p.category !== state.categoryFilter) return;
      }
      if (state.sourceFilter) {
        var types = getSourceTypes(p.slug);
        if (!types[state.sourceFilter]) return;
      }

      var status = getItemStatus(p.slug, month);

      // Quick action filter
      if (state.quickAction === 'peak') {
        if (status !== 'peak') return;
      } else if (state.quickAction === 'coming') {
        if (!getItemIsComingSoon(p.slug, month)) return;
      } else if (state.quickAction === 'leaving') {
        if (!getItemIsLeavingPeak(p.slug, month)) return;
      }
      // 'all' shows everything

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
      var oa = order[a.status] || 4;
      var ob = order[b.status] || 4;
      if (oa !== ob) return oa - ob;
      return a.produce.name.localeCompare(b.produce.name);
    });
    return items;
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
  // Ring Navigator — rotating watchface
  // ============================================

  // Track cumulative rotation to avoid jarring jumps (always take shortest path)
  var ringCurrentAngle = 0;
  var ringBuilt = false;
  var ringSegments = [];  // cached path elements
  var ringLabels = [];    // cached text elements

  var RING_CX = 150, RING_CY = 150;
  var RING_OUTER = 140, RING_INNER = 100;
  var RING_GAP = 2.5;
  var RING_SEG = 30 - RING_GAP;

  function buildRing() {
    var group = document.getElementById('ring-group');
    group.innerHTML = '';
    ringSegments = [];
    ringLabels = [];

    for (var i = 0; i < 12; i++) {
      var month = i + 1;
      var startAngle = i * 30 + RING_GAP / 2;
      var endAngle = startAngle + RING_SEG;

      var sRad = (startAngle - 90) * Math.PI / 180;
      var eRad = (endAngle - 90) * Math.PI / 180;

      var d = 'M ' + (RING_CX + RING_OUTER * Math.cos(sRad)) + ' ' + (RING_CY + RING_OUTER * Math.sin(sRad)) +
              ' A ' + RING_OUTER + ' ' + RING_OUTER + ' 0 0 1 ' + (RING_CX + RING_OUTER * Math.cos(eRad)) + ' ' + (RING_CY + RING_OUTER * Math.sin(eRad)) +
              ' L ' + (RING_CX + RING_INNER * Math.cos(eRad)) + ' ' + (RING_CY + RING_INNER * Math.sin(eRad)) +
              ' A ' + RING_INNER + ' ' + RING_INNER + ' 0 0 0 ' + (RING_CX + RING_INNER * Math.cos(sRad)) + ' ' + (RING_CY + RING_INNER * Math.sin(sRad)) + ' Z';

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'ring-segment');
      path.setAttribute('data-month', month);
      path.addEventListener('click', (function (m) {
        return function () {
          state.selectedMonth = m;
          state.quickAction = 'all';
          render();
        };
      })(month));
      group.appendChild(path);
      ringSegments.push(path);

      // Label
      var midRad = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180;
      var labelR = (RING_OUTER + RING_INNER) / 2;
      var lx = RING_CX + labelR * Math.cos(midRad);
      var ly = RING_CY + labelR * Math.sin(midRad);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', lx);
      text.setAttribute('y', ly);
      text.setAttribute('class', 'ring-segment-label');
      text.textContent = MONTH_ABBRS[i];
      group.appendChild(text);
      ringLabels.push({ el: text, cx: lx, cy: ly });
    }

    // Set initial rotation without transition
    ringCurrentAngle = -(state.selectedMonth - 1) * 30;
    group.style.transition = 'none';
    group.style.transform = 'rotate(' + ringCurrentAngle + 'deg)';
    // Force reflow then re-enable transition
    group.offsetHeight;
    group.style.transition = '';

    ringBuilt = true;
  }

  function updateRing() {
    var group = document.getElementById('ring-group');

    // Calculate target angle — take shortest path
    var targetBase = -(state.selectedMonth - 1) * 30;
    // Normalize difference to find shortest rotation
    var diff = targetBase - ringCurrentAngle;
    // Bring diff into -180..180 range
    diff = ((diff % 360) + 540) % 360 - 180;
    ringCurrentAngle = ringCurrentAngle + diff;

    // Apply CSS transform (transition handles animation)
    group.style.transform = 'rotate(' + ringCurrentAngle + 'deg)';

    // Update segment fills and label styles
    var counterRot = -ringCurrentAngle;
    for (var i = 0; i < 12; i++) {
      var month = i + 1;
      var d = Math.abs(month - state.selectedMonth);
      if (d > 6) d = 12 - d;

      var fill, cls = 'ring-segment';
      if (month === state.selectedMonth) {
        fill = 'var(--ring-active)';
        cls += ' active';
      } else if (d === 1) {
        fill = 'var(--ring-adjacent)';
      } else {
        fill = 'var(--ring-inactive)';
      }

      ringSegments[i].setAttribute('fill', fill);
      ringSegments[i].setAttribute('class', cls);

      // Counter-rotate labels so text stays upright
      var lbl = ringLabels[i];
      lbl.el.setAttribute('transform', 'rotate(' + counterRot + ' ' + lbl.cx + ' ' + lbl.cy + ')');
      var lClass = 'ring-segment-label';
      if (month === state.selectedMonth) lClass += ' label-active';
      else if (d === 1) lClass += ' label-adjacent';
      lbl.el.setAttribute('class', lClass);
    }

    // Update ring center
    var stats = computeStats(state.selectedMonth);
    var monthEl = document.getElementById('ring-month');
    var countEl = document.getElementById('ring-count');
    var labelEl = document.getElementById('ring-label');
    var peakEl = document.getElementById('ring-peak-label');

    monthEl.textContent = MONTH_FULL[state.selectedMonth - 1].toUpperCase();

    if (state.quickAction === 'peak') {
      countEl.textContent = stats.atPeak;
      labelEl.textContent = 'at peak';
      peakEl.textContent = stats.inSeason + ' total in season';
    } else if (state.quickAction === 'coming') {
      var comingCount = 0;
      state.data.produce.forEach(function (p) {
        if (state.seasonsBySlug[p.slug] && getItemIsComingSoon(p.slug, state.selectedMonth)) comingCount++;
      });
      countEl.textContent = comingCount;
      labelEl.textContent = 'coming soon';
      peakEl.textContent = stats.inSeason + ' in season now';
    } else if (state.quickAction === 'leaving') {
      var leavingCount = 0;
      state.data.produce.forEach(function (p) {
        if (state.seasonsBySlug[p.slug] && getItemIsLeavingPeak(p.slug, state.selectedMonth)) leavingCount++;
      });
      countEl.textContent = leavingCount;
      labelEl.textContent = 'leaving peak';
      peakEl.textContent = 'get them now';
    } else {
      countEl.textContent = stats.inSeason;
      labelEl.textContent = 'in season';
      peakEl.textContent = stats.atPeak + ' at peak';
    }
  }

  function renderRing() {
    if (!ringBuilt) buildRing();
    updateRing();
  }

  // --- Render: Category Chips ---
  function renderCategoryChips() {
    var container = document.getElementById('category-filters');
    container.innerHTML = '';
    CATEGORY_CHIPS.forEach(function (chip) {
      var btn = document.createElement('button');
      btn.className = 'chip' + (state.categoryFilter === chip.match ? ' active' : '');
      btn.textContent = chip.label;
      btn.addEventListener('click', function () {
        state.categoryFilter = state.categoryFilter === chip.match ? null : chip.match;
        render();
      });
      container.appendChild(btn);
    });
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

      if (!isDual && seasons.length > 0) {
        var dot = document.createElement('span');
        dot.className = 'source-dot ' + seasons[0].sourceType;
        nameCell.appendChild(dot);
      }

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

      if (sourceType === 'import') bar.style.borderColor = color;

      if (isDual) {
        var lbl = document.createElement('span');
        lbl.className = 'bar-source-label';
        lbl.textContent = sourceType === 'local' ? 'CA' : 'Import';
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
      tt.textContent = sourceType === 'import' ? 'Imported' : 'Local CA';
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
    return MONTH_NAMES[months[0] - 1] + ' \u2013 ' + MONTH_NAMES[months[months.length - 1] - 1];
  }

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // --- Quick Actions ---
  function bindQuickActions() {
    document.querySelectorAll('#quick-actions .quick-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.quickAction = btn.getAttribute('data-action');
        render();
      });
    });
  }

  function updateQuickActions() {
    document.querySelectorAll('#quick-actions .quick-btn').forEach(function (btn) {
      btn.classList.toggle('active', state.quickAction === btn.getAttribute('data-action'));
    });
  }

  // --- Source filter chips ---
  function bindSourceFilters() {
    document.querySelectorAll('#source-filters .chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var source = btn.getAttribute('data-source');
        state.sourceFilter = state.sourceFilter === source ? null : source;
        render();
      });
    });
  }

  function updateSourceChips() {
    document.querySelectorAll('#source-filters .chip').forEach(function (btn) {
      btn.classList.toggle('active', state.sourceFilter === btn.getAttribute('data-source'));
    });
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

  // --- Load Animation ---
  var animTimers = [];
  var animDone = false;

  function playLoadAnimation() {
    animTimers.push(setTimeout(function () {
      document.querySelector('.site-title').classList.add('anim-in');
    }, 0));

    var segments = document.querySelectorAll('.ring-segment');
    segments.forEach(function (seg, i) {
      animTimers.push(setTimeout(function () { seg.classList.add('anim-in'); }, 80 + i * 25));
    });

    animTimers.push(setTimeout(function () {
      document.querySelector('.ring-center').classList.add('anim-in');
    }, 420));

    animTimers.push(setTimeout(function () {
      var c = document.querySelector('.controls');
      var q = document.querySelector('.quick-actions');
      if (c) c.classList.add('anim-in');
      if (q) q.classList.add('anim-in');
    }, 560));

    animTimers.push(setTimeout(function () {
      document.querySelectorAll('.timeline-row').forEach(function (row, i) {
        row.style.animationDelay = (i * 12) + 'ms';
        row.classList.add('anim-in');
      });
      animDone = true;
    }, 700));
  }

  function skipAnimation() {
    if (animDone) return;
    animTimers.forEach(clearTimeout);
    animTimers = [];
    animDone = true;
    document.querySelectorAll('.site-title, .ring-segment, .ring-center, .controls, .quick-actions, .timeline-row')
      .forEach(function (el) { el.classList.add('anim-in'); el.style.animationDelay = '0ms'; });
  }

  // --- Main Render ---
  function render() {
    renderRing();
    renderCategoryChips();
    updateSourceChips();
    updateQuickActions();
    updateViewToggle();

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
      bindSearch();
      bindSourceFilters();
      bindViewToggle();
      bindQuickActions();
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
