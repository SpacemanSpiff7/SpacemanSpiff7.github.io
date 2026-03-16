/* ============================================
   Seasonal Produce California — App
   Dark theme with ring navigator
   ============================================ */

(function () {
  'use strict';

  // --- Constants ---
  var MONTH_ABBRS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  var MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  var MONTH_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Category chip labels mapped to CSV category values
  var CATEGORY_CHIPS = [
    { label: 'Fruit', match: 'Fruit' },
    { label: 'Vegetable', match: 'Vegetable' },
    { label: 'Chile', match: 'Chile Pepper' },
    { label: 'Herb', match: 'Herb' },
    { label: 'Mushroom', match: 'Mushroom' },
    { label: 'Nut', match: 'Nut' },
    { label: 'Flower', match: 'Edible Flower' },
  ];

  // Culinary group -> CSS color variable mapping
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
    quickAction: null,
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
          } else {
            reject(new Error('Failed to load data'));
          }
        };
        xhr.onerror = function () { reject(new Error('Failed to load data')); };
        xhr.send();
      });
    } else {
      dataPromise = fetch('data.json')
        .then(function (res) {
          if (!res.ok) throw new Error('Failed to load data');
          return res.json();
        });
    }
    return dataPromise.then(function (data) {
      state.data = data;

      data.produce.forEach(function (p) {
        state.produceBySlug[p.slug] = p;
      });

      data.regions.forEach(function (r) {
        state.regionBySlug[r.slug] = r;
      });

      data.seasons.forEach(function (s) {
        if (!state.seasonsBySlug[s.produceSlug]) {
          state.seasonsBySlug[s.produceSlug] = [];
        }
        state.seasonsBySlug[s.produceSlug].push(s);
      });
    });
  }

  // --- Color helper ---
  function getColor(item) {
    return GROUP_COLORS[item.culinaryGroup] || 'var(--color-root)';
  }

  // --- Season Logic ---
  function getItemStatus(slug, month) {
    var seasons = state.seasonsBySlug[slug];
    if (!seasons || seasons.length === 0) return 'none';

    var isPeak = false;
    var isSeason = false;

    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].peakMonths.indexOf(month) !== -1) {
        isPeak = true;
      }
      if (seasons[i].seasonMonths.indexOf(month) !== -1) {
        isSeason = true;
      }
    }

    if (isPeak) return 'peak';
    if (isSeason) return 'in-season';

    var next = month === 12 ? 1 : month + 1;
    for (var j = 0; j < seasons.length; j++) {
      if (seasons[j].seasonMonths.indexOf(next) !== -1) {
        return 'coming';
      }
    }

    return 'off';
  }

  function getItemIsComingSoon(slug, month) {
    var status = getItemStatus(slug, month);
    if (status === 'peak' || status === 'in-season') return false;
    var next1 = month === 12 ? 1 : month + 1;
    var next2 = next1 === 12 ? 1 : next1 + 1;
    return getItemStatus(slug, next1) !== 'off' && getItemStatus(slug, next1) !== 'none' ||
           getItemStatus(slug, next2) !== 'off' && getItemStatus(slug, next2) !== 'none';
  }

  function getItemIsLeavingPeak(slug, month) {
    var nextMonth = month === 12 ? 1 : month + 1;
    return getItemStatus(slug, month) === 'peak' && getItemStatus(slug, nextMonth) !== 'peak';
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

      // Search filter
      if (state.searchQuery) {
        if (p.name.toLowerCase().indexOf(state.searchQuery.toLowerCase()) === -1) return;
      }

      // Category filter
      if (state.categoryFilter) {
        if (p.category !== state.categoryFilter) return;
      }

      // Source filter
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

      // In grid view, hide off-season unless showing all
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
    var inSeason = 0;
    var atPeak = 0;

    state.data.produce.forEach(function (p) {
      var status = getItemStatus(p.slug, month);
      if (status === 'peak') { atPeak++; inSeason++; }
      else if (status === 'in-season') { inSeason++; }
    });

    return { inSeason: inSeason, atPeak: atPeak };
  }

  // --- Render: SVG Ring Navigator ---
  function renderRing() {
    var svg = document.getElementById('ring-svg');
    var viewSize = 300;
    var cx = viewSize / 2;
    var cy = viewSize / 2;
    var outerR = 140;
    var innerR = 95;
    var gapDeg = 2;
    var segDeg = 30 - gapDeg;

    svg.innerHTML = '';

    for (var i = 0; i < 12; i++) {
      var month = i + 1;
      var startAngle = i * 30 + gapDeg / 2;
      var endAngle = startAngle + segDeg;

      var startRad = (startAngle - 90) * Math.PI / 180;
      var endRad = (endAngle - 90) * Math.PI / 180;

      var outerX1 = cx + outerR * Math.cos(startRad);
      var outerY1 = cy + outerR * Math.sin(startRad);
      var outerX2 = cx + outerR * Math.cos(endRad);
      var outerY2 = cy + outerR * Math.sin(endRad);
      var innerX1 = cx + innerR * Math.cos(endRad);
      var innerY1 = cy + innerR * Math.sin(endRad);
      var innerX2 = cx + innerR * Math.cos(startRad);
      var innerY2 = cy + innerR * Math.sin(startRad);

      var largeArc = segDeg > 180 ? 1 : 0;

      var d = 'M ' + outerX1 + ' ' + outerY1 +
              ' A ' + outerR + ' ' + outerR + ' 0 ' + largeArc + ' 1 ' + outerX2 + ' ' + outerY2 +
              ' L ' + innerX1 + ' ' + innerY1 +
              ' A ' + innerR + ' ' + innerR + ' 0 ' + largeArc + ' 0 ' + innerX2 + ' ' + innerY2 +
              ' Z';

      // Determine fill color
      var fill;
      var diff = Math.abs(month - state.selectedMonth);
      if (diff > 6) diff = 12 - diff;
      if (month === state.selectedMonth) {
        fill = 'var(--ring-active)';
      } else if (diff === 1) {
        fill = 'var(--ring-adjacent)';
      } else {
        fill = 'var(--ring-inactive)';
      }

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', fill);
      path.setAttribute('class', 'ring-segment' + (month === state.selectedMonth ? ' active' : ''));
      path.setAttribute('data-month', month);
      path.addEventListener('click', (function (m) {
        return function () {
          state.selectedMonth = m;
          state.quickAction = null;
          render();
        };
      })(month));
      svg.appendChild(path);

      // Month label text at midpoint of arc
      var midAngle = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180;
      var labelR = (outerR + innerR) / 2;
      var labelX = cx + labelR * Math.cos(midAngle);
      var labelY = cy + labelR * Math.sin(midAngle);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', labelX);
      text.setAttribute('y', labelY);
      text.setAttribute('class', 'ring-segment-label');
      if (month === state.selectedMonth) {
        text.setAttribute('fill', 'var(--bg-body)');
      }
      text.textContent = MONTH_ABBRS[i];
      svg.appendChild(text);
    }

    // Update ring center
    var stats = computeStats(state.selectedMonth);
    document.getElementById('ring-month').textContent = MONTH_FULL[state.selectedMonth - 1].toUpperCase();
    document.getElementById('ring-count').textContent = stats.inSeason;
    document.getElementById('ring-peak-label').textContent = stats.atPeak + ' at peak';
  }

  // --- Render: Month Strip ---
  function renderMonthStrip() {
    var container = document.getElementById('month-strip');
    container.innerHTML = '';

    MONTH_ABBRS.forEach(function (abbr, i) {
      var btn = document.createElement('button');
      btn.className = 'month-strip-btn' + (i + 1 === state.selectedMonth ? ' active' : '');
      btn.textContent = abbr;
      btn.setAttribute('aria-label', MONTH_FULL[i]);
      btn.addEventListener('click', function () {
        state.selectedMonth = i + 1;
        state.quickAction = null;
        render();
      });
      container.appendChild(btn);
    });
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

  // --- Render: Stats ---
  function renderStats() {
    var stats = computeStats(state.selectedMonth);
    var el = document.getElementById('stats-line');
    el.innerHTML = '<strong>' + stats.inSeason + '</strong> in season &middot; <strong>' + stats.atPeak + '</strong> at peak in ' + MONTH_FULL[state.selectedMonth - 1];
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

    // Body
    body.innerHTML = '';
    var items = sortItems(filterProduce());

    if (items.length === 0) {
      body.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No produce matches your filters.</div>';
      return;
    }

    // Now line in body
    var nowLineContainer = document.createElement('div');
    nowLineContainer.style.cssText = 'position: absolute; left: var(--name-col); width: var(--timeline-width); top: 0; bottom: 0; pointer-events: none; z-index: 5;';
    var nowLine = document.createElement('div');
    nowLine.className = 'now-line';
    nowLine.style.left = getNowPosition(state.selectedMonth) + '%';
    nowLineContainer.appendChild(nowLine);
    body.appendChild(nowLineContainer);

    items.forEach(function (item, idx) {
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

      // Name cell with source dot for single-source rows
      var nameCell = document.createElement('div');
      nameCell.className = 'timeline-name';

      if (!isDual && seasons.length > 0) {
        var dot = document.createElement('span');
        dot.className = 'source-dot ' + seasons[0].sourceType;
        nameCell.appendChild(dot);
      }

      var nameText = document.createTextNode(item.produce.name);
      nameCell.appendChild(nameText);
      nameCell.title = item.produce.name;
      row.appendChild(nameCell);

      // Bars area
      var barsArea = document.createElement('div');
      barsArea.className = 'timeline-bars';

      if (isDual) {
        renderBars(barsArea, localSeasons, color, 'local', true);
        renderBars(barsArea, importSeasons, color, 'import', true);
      } else {
        var sourceType = seasons[0] ? seasons[0].sourceType : 'local';
        renderBars(barsArea, seasons, color, sourceType, false);
      }

      row.appendChild(barsArea);
      body.appendChild(row);
    });

    // Scroll to center now line
    var container = document.getElementById('timeline-container');
    var firstBars = body.querySelector('.timeline-bars');
    var totalBarWidth = firstBars ? firstBars.offsetWidth : 1200;
    var firstName = body.querySelector('.timeline-name');
    var nameColWidth = firstName ? firstName.offsetWidth : 180;
    var nowPct = getNowPosition(state.selectedMonth) / 100;
    var scrollTarget = nameColWidth + (nowPct * totalBarWidth) - container.clientWidth / 2;
    container.scrollLeft = Math.max(0, scrollTarget);
  }

  function renderBars(container, seasons, color, sourceType, isDual) {
    var allMonths = {};
    var peakMonths = {};

    seasons.forEach(function (s) {
      s.seasonMonths.forEach(function (m) { allMonths[m] = true; });
      s.peakMonths.forEach(function (m) { peakMonths[m] = true; });
    });

    var segments = buildSegments(allMonths, peakMonths);

    segments.forEach(function (seg) {
      var bar = document.createElement('div');
      bar.className = 'season-bar' + (sourceType === 'import' ? ' bar-import' : ' bar-local');

      var left = ((seg.start - 1) / 12) * 100;
      var width = (seg.months.length / 12) * 100;
      bar.style.left = left + '%';
      bar.style.width = width + '%';

      if (sourceType === 'import') {
        bar.style.borderColor = color;
      }

      // Source label for dual bars
      if (isDual) {
        var srcLabel = document.createElement('span');
        srcLabel.className = 'bar-source-label';
        srcLabel.textContent = sourceType === 'local' ? 'CA' : 'Import';
        bar.appendChild(srcLabel);
      }

      seg.months.forEach(function (m, mi) {
        var subSeg = document.createElement('div');
        subSeg.className = 'bar-segment ' + (peakMonths[m] ? 'peak' : 'available');
        subSeg.style.backgroundColor = color;
        subSeg.style.left = (mi / seg.months.length * 100) + '%';
        subSeg.style.width = (1 / seg.months.length * 100) + '%';
        bar.appendChild(subSeg);
      });

      // Tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'bar-tooltip';
      tooltip.textContent = sourceType === 'import' ? 'Imported' : 'Local CA';
      bar.appendChild(tooltip);

      container.appendChild(bar);
    });
  }

  function buildSegments(allMonths, peakMonths) {
    var months = [];
    for (var m = 1; m <= 12; m++) {
      if (allMonths[m]) months.push(m);
    }
    if (months.length === 0) return [];

    var segments = [];
    var current = [months[0]];

    for (var i = 1; i < months.length; i++) {
      if (months[i] === current[current.length - 1] + 1) {
        current.push(months[i]);
      } else {
        segments.push({ start: current[0], months: current });
        current = [months[i]];
      }
    }
    segments.push({ start: current[0], months: current });

    return segments;
  }

  // --- Render: Grid ---
  function renderGrid() {
    var container = document.getElementById('grid-container');
    container.innerHTML = '';

    var items = sortItems(filterProduce());

    if (items.length === 0) {
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No produce matches your filters.</div>';
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

      groups[cat].forEach(function (item) {
        var card = createGridCard(item);
        cards.appendChild(card);
      });

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

    var groupLabel = document.createElement('div');
    groupLabel.className = 'grid-card-group';
    groupLabel.textContent = item.produce.culinaryGroup;
    card.appendChild(groupLabel);

    var minibar = document.createElement('div');
    minibar.className = 'grid-card-minibar';

    var allMonths = {};
    var peakMonths = {};
    seasons.forEach(function (s) {
      s.seasonMonths.forEach(function (m) { allMonths[m] = true; });
      s.peakMonths.forEach(function (m) { peakMonths[m] = true; });
    });

    for (var m = 1; m <= 12; m++) {
      var cell = document.createElement('div');
      cell.className = 'minibar-cell';
      if (peakMonths[m]) {
        cell.classList.add('peak');
        cell.style.backgroundColor = color;
      } else if (allMonths[m]) {
        cell.classList.add('in-season');
        cell.style.backgroundColor = color;
      }
      minibar.appendChild(cell);
    }
    card.appendChild(minibar);

    var regionNames = [];
    var primarySource = 'local';
    seasons.forEach(function (s) {
      var region = state.regionBySlug[s.regionSlug];
      if (region && regionNames.indexOf(region.name) === -1) {
        regionNames.push(region.name);
      }
      if (s.sourceType === 'import') primarySource = 'import';
    });

    if (regionNames.length > 0) {
      var regionEl = document.createElement('div');
      regionEl.className = 'grid-card-region';
      regionEl.textContent = regionNames.slice(0, 2).join(', ');
      if (regionNames.length > 2) regionEl.textContent += ' +' + (regionNames.length - 2);
      card.appendChild(regionEl);
    }

    var sourceEl = document.createElement('span');
    sourceEl.className = 'grid-card-source ' + primarySource;
    sourceEl.textContent = primarySource;
    card.appendChild(sourceEl);

    return card;
  }

  // --- Render: Detail Panel ---
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

    var html = '';
    html += '<h2 class="detail-name">' + escHtml(item.name) + '</h2>';
    html += '<div class="detail-meta">';
    html += '<span>' + escHtml(item.category) + '</span>';
    html += '<span>' + escHtml(item.culinaryGroup) + '</span>';
    html += '</div>';

    var notes = '';
    var storageTip = '';
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].notes && !notes) notes = seasons[i].notes;
      if (seasons[i].storageTip && !storageTip) storageTip = seasons[i].storageTip;
    }

    if (notes) {
      html += '<p class="detail-notes">"' + escHtml(notes) + '"</p>';
    }

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
      var entry = seen[key];
      var s = entry.season;
      var region = state.regionBySlug[s.regionSlug];
      var regionName = region ? region.name : s.regionSlug;
      var seasonArr = Array.from(entry.seasonMonths).sort(function (a, b) { return a - b; });
      var peakArr = Array.from(entry.peakMonths).sort(function (a, b) { return a - b; });

      html += '<div class="detail-season-entry">';
      html += '<div class="detail-season-header">';
      html += '<span class="detail-region-name">' + escHtml(regionName) + '</span>';
      html += '<span class="detail-source-badge ' + s.sourceType + '">' + s.sourceType + '</span>';
      html += '</div>';

      var seasonText = monthRangeText(seasonArr);
      var peakText = peakArr.length > 0 ? monthRangeText(peakArr) : 'no clear peak';
      html += '<div class="detail-season-months">Season: ' + seasonText + ' &middot; Peak: ' + peakText + '</div>';

      html += '<div class="detail-minibar">';
      for (var m = 1; m <= 12; m++) {
        var cls = 'minibar-cell';
        var style = '';
        if (entry.peakMonths.has(m)) {
          cls += ' peak';
          style = 'background-color:' + color;
        } else if (entry.seasonMonths.has(m)) {
          cls += ' in-season';
          style = 'background-color:' + color;
        }
        html += '<div class="' + cls + '"' + (style ? ' style="' + style + '"' : '') + '></div>';
      }
      html += '</div>';

      html += '</div>';
    });

    html += '</div>';

    if (storageTip) {
      html += '<div class="detail-storage">';
      html += '<div class="detail-storage-label">Storage</div>';
      html += escHtml(storageTip);
      html += '</div>';
    }

    content.innerHTML = html;
  }

  function monthRangeText(months) {
    if (months.length === 0) return '';
    if (months.length === 12) return 'Year-round';
    return MONTH_NAMES[months[0] - 1] + ' \u2013 ' + MONTH_NAMES[months[months.length - 1] - 1];
  }

  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Quick Actions ---
  function bindQuickActions() {
    var btns = document.querySelectorAll('#quick-actions .quick-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        state.quickAction = state.quickAction === action ? null : action;
        render();
      });
    });
  }

  function updateQuickActions() {
    var btns = document.querySelectorAll('#quick-actions .quick-btn');
    btns.forEach(function (btn) {
      var action = btn.getAttribute('data-action');
      btn.classList.toggle('active', state.quickAction === action);
    });
  }

  // --- Source filter chips ---
  function bindSourceFilters() {
    var btns = document.querySelectorAll('#source-filters .chip');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var source = btn.getAttribute('data-source');
        state.sourceFilter = state.sourceFilter === source ? null : source;
        render();
      });
    });
  }

  function updateSourceChips() {
    var btns = document.querySelectorAll('#source-filters .chip');
    btns.forEach(function (btn) {
      var source = btn.getAttribute('data-source');
      btn.classList.toggle('active', state.sourceFilter === source);
    });
  }

  // --- View toggle ---
  function bindViewToggle() {
    document.getElementById('view-timeline').addEventListener('click', function () {
      state.view = 'timeline';
      render();
    });
    document.getElementById('view-grid').addEventListener('click', function () {
      state.view = 'grid';
      render();
    });
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
      animTimers.push(setTimeout(function () { seg.classList.add('anim-in'); }, 100 + i * 30));
    });

    animTimers.push(setTimeout(function () {
      document.querySelector('.ring-center').classList.add('anim-in');
    }, 500));

    animTimers.push(setTimeout(function () {
      var controls = document.querySelector('.controls');
      var quickActions = document.querySelector('.quick-actions');
      if (controls) controls.classList.add('anim-in');
      if (quickActions) quickActions.classList.add('anim-in');
    }, 650));

    animTimers.push(setTimeout(function () {
      document.querySelectorAll('.timeline-row').forEach(function (row, i) {
        row.style.animationDelay = (i * 15) + 'ms';
        row.classList.add('anim-in');
      });
      animDone = true;
    }, 800));
  }

  function skipAnimation() {
    if (animDone) return;
    animTimers.forEach(clearTimeout);
    animTimers = [];
    animDone = true;
    document.querySelectorAll('.site-title, .ring-segment, .ring-center, .controls, .quick-actions, .timeline-row')
      .forEach(function (el) {
        el.classList.add('anim-in');
        el.style.animationDelay = '0ms';
      });
  }

  // --- Main Render ---
  function render() {
    renderRing();
    renderMonthStrip();
    renderCategoryChips();
    updateSourceChips();
    updateQuickActions();
    renderStats();
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

    // After first render with data, ensure rows are visible if animation already done
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
      bindDetailClose();
      render();
      playLoadAnimation();

      // Skip animation on any interaction
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
