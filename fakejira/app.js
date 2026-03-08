// ===== Constants =====
const STORAGE_KEY = "agilethis-board"; // legacy, migrated to per-project keys
const CURRENT_VERSION = 4;
const STATUSES = ["todo", "in-progress", "testing", "done", "canceled"];
const COL_COLLAPSED_KEY = "agilethis-col-collapsed"; // legacy, migrated to per-project keys
const REGISTRY_KEY = "agilethis-projects";
const LABEL_PRESETS = ["bug", "feature", "ui", "backend", "urgent"];
const BOARD_COLORS = [
  "#6366f1", // indigo
  "#06b6d4", // cyan
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#a78bfa", // violet
  "#f97316", // orange
  "#0ea5e9", // sky
];

const DEFAULT_COLUMNS = [
  { id: "todo", name: "Todo", color: "#818cf8" },
  { id: "in-progress", name: "In Progress", color: "#f59e42" },
  { id: "testing", name: "Testing", color: "#a78bfa" },
  { id: "done", name: "Done", color: "#34d399" },
  { id: "canceled", name: "Canceled", color: "#71717a" },
];

const DEFAULT_PRIORITIES = [
  { id: "low", name: "Low", color: "#34d399" },
  { id: "medium", name: "Medium", color: "#fbbf24" },
  { id: "high", name: "High", color: "#fb923c" },
  { id: "critical", name: "Critical", color: "#f87171" },
];

const COLOR_PALETTE = [
  "#6366f1", "#818cf8", "#a78bfa", "#c084fc",
  "#e879f9", "#f472b6", "#f43f5e", "#fb7185",
  "#f87171", "#fb923c", "#f59e0b", "#fbbf24",
  "#facc15", "#a3e635", "#34d399", "#10b981",
  "#2dd4bf", "#22d3ee", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#71717a", "#a1a1aa",
];

// ===== Random Name Pools =====
const NAME_POOL = [
  // Subtly Corporate
  "Initiative Zero", "Project Horizon", "Alignment Plan", "Strategic Thread",
  "Optimization Track", "Vision Node", "Growth Vector", "Mission Draft",
  "Impact Loop", "Execution Path", "Control Panel", "Roadmap Alpha",
  "Core Initiative", "Project North", "Objective Field", "Target Stream",
  "Progress Stack", "Momentum Board", "Synergy Lab", "Framework One",
  // Slightly Sinister
  "Behavior Model", "Influence Map", "Compliance Draft", "Default Future",
  "Managed Scope", "Quiet Alignment", "Constraint Lab", "Outcome Engine",
  "Incentive Grid", "Habit Design", "Guardrail Board", "Structured Freedom",
  "Guided Track", "Soft Control", "Conformity Test", "Optimization Zone",
  "Predictive Path", "Alignment Matrix", "Friction Removal", "Order System",
  // Silicon Valley
  "Project Catalyst", "Launch Sequence", "Beta Initiative", "Velocity Sprint",
  "Disruption Plan", "Scale Engine", "Pivot Deck", "Hypergrowth Lab",
  "Cloud Draft", "Future Stack", "Signal Project", "Feedback Loop",
  "Core Platform", "Venture Board", "Build Track", "Systems Plan",
  "Data Sprint", "Launchpad", "Ops Grid", "Scale Node",
  // Vaguely Dystopian
  "Horizon Control", "Pattern Board", "Reality Draft", "Outcome Layer",
  "Directive One", "Silent Sprint", "Behavior Stack", "Insight Engine",
  "Structure Plan", "Human Layer", "Input Channel", "Control Surface",
  "Protocol Board", "Intent Grid", "Baseline Project", "Standard Model",
  "Program Default", "Project Conform", "Order Initiative", "Precision Plan",
  // Minimal/Cultish
  "The Initiative", "The Program", "The System", "The Track",
  "The Framework", "The Plan", "The Draft", "The Model",
  "The Alignment", "The Loop", "The Path", "The Build",
  "The Field", "The Engine", "The Stack", "The Node",
  "The Signal", "The Directive", "The Grid", "The Pattern",
  // Absurdly Corporate
  "Mission Board", "Execution Room", "Strategy Deck", "Action Layer",
  "Growth Room", "Delivery Track", "Product Field", "Alignment Room",
  "Impact Board", "Vision Stack"
];

function randomName(exclude = []) {
  const available = NAME_POOL.filter(n => !exclude.includes(n));
  const pool = available.length > 0 ? available : NAME_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===== Project Registry =====

function projectStorageKey(id) {
  return "agilethis-project-" + id;
}

function collapsedStorageKey(id) {
  return "agilethis-col-collapsed-" + id;
}

function getProjectRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) {
      const reg = JSON.parse(raw);
      if (reg && typeof reg.nextId === "number" && Array.isArray(reg.list)) {
        return reg;
      }
    }
  } catch (e) {}
  return null;
}

function saveProjectRegistry(reg) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
}

function allocateProjectId() {
  let reg = getProjectRegistry();
  if (!reg) reg = { nextId: 1, list: [0] };
  const id = reg.nextId;
  reg.nextId = id + 1;
  reg.list.push(id);
  saveProjectRegistry(reg);
  return id;
}

function currentProjectId() {
  const match = location.hash.match(/^#project\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

// ===== Column/Priority Helpers =====

function boardColumns(board) {
  const b = board || activeBoard();
  return b.columns || DEFAULT_COLUMNS;
}

function boardPriorities(board) {
  const b = board || activeBoard();
  return b.priorities || DEFAULT_PRIORITIES;
}

function getColumnById(id, board) {
  return boardColumns(board).find(c => c.id === id);
}

function getPriorityById(id, board) {
  return boardPriorities(board).find(p => p.id === id);
}

function generateColumnId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 5);
}

function defaultDefaults() {
  return {
    columns: JSON.parse(JSON.stringify(DEFAULT_COLUMNS)),
    priorities: JSON.parse(JSON.stringify(DEFAULT_PRIORITIES)),
    labelPresets: [...LABEL_PRESETS]
  };
}

// ===== Mission Statement Easter Egg =====
const MISSION_QUOTES = [
  "Building the infrastructure for a more predictable humanity.",
  "Aligning behavior with better outcomes.",
  "Designing systems that gently guide better decisions.",
  "Engineering compliance through convenience.",
  "Optimizing life's unnecessary choices away.",
  "Making freedom more efficient.",
  "Creating clarity in a world of unhelpful autonomy.",
  "Reducing variance in human potential.",
  "Where choice meets intelligent constraint.",
  "Simplifying decision-making at scale.",
  "Empowering better behavior through design.",
  "Architecting outcomes people would choose anyway.",
  "Making complexity disappear quietly.",
  "Building trust through invisible guardrails.",
  "Turning unpredictability into performance.",
  "Designing the default future.",
  "Encouraging alignment through seamless experience.",
  "Scaling responsible influence.",
  "Minimizing friction in personal transformation.",
  "Making the optimal path the only obvious one.",
  "Codifying progress.",
  "Delivering structured freedom.",
  "Aligning incentives with inevitable outcomes.",
  "Removing unnecessary uncertainty.",
  "Guiding ambition responsibly.",
  "Transforming intent into compliant action.",
  "Where insight becomes direction.",
  "Designing environments that decide for you.",
  "Engineering harmony at scale.",
  "Enabling consistent excellence.",
  "Making self-discipline obsolete.",
  "Building systems that care more efficiently than you can.",
  "Turning aspiration into automation.",
  "Scaling virtue.",
  "Optimizing personal agency.",
  "Elevating alignment.",
  "Making better choices automatic.",
  "Designing frictionless consensus.",
  "Reinforcing positive deviation.",
  "Transforming independence into interoperability.",
  "Standardizing success.",
  "Creating accountability you don't have to think about.",
  "Empowering managed autonomy.",
  "Shaping tomorrow's habits today.",
  "Delivering clarity through structure.",
  "Reducing chaos responsibly.",
  "Encouraging productive conformity.",
  "Architecting behavioral efficiency.",
  "Harmonizing ambition with system needs.",
  "Making progress unavoidable.",
  "We don't build products. We architect inevitability.",
  "Making humanity 10x more human.",
  "Powering a frictionless tomorrow.",
  "Solving the future before it happens.",
  "Where innovation becomes destiny.",
  "Coding consciousness at scale.",
  "Democratizing excellence through intelligent synergy.",
  "Engineering optimism.",
  "Creating scalable transcendence.",
  "Reinventing reality responsibly.",
  "Delivering exponential empathy through cloud-native infrastructure.",
  "Disrupting gravity.",
  "Building the operating system for civilization.",
  "Turning bold ideas into unavoidable outcomes.",
  "Elevating the human algorithm.",
  "Transforming data into destiny.",
  "Designing a smarter species.",
  "Creating impact with precision.",
  "Solving complexity permanently.",
  "Innovation, uncompromised and monetized.",
  "Engineering tomorrow's inevitabilities.",
  "Optimizing existence.",
  "Where vision compounds.",
  "Unlocking infinite scalability.",
  "Architecting the post-human interface.",
  "Human potential, containerized.",
  "Building beyond bandwidth.",
  "Monetizing momentum.",
  "Prog as a service.",
  "Making disruption sustainable.",
  "Redefining the default future.",
  "Automating possibility.",
  "Making the impossible predictable.",
  "Shipping transcendence.",
  "Building clarity at planetary scale.",
  "Intelligence, productized.",
  "Simplifying the exponential.",
  "Connecting the unconnectable.",
  "Scaling trust.",
  "Transforming friction into opportunity.",
  "Reinventing synergy for a post-analog world.",
  "Empowering humanity to pivot.",
  "Operationalizing inspiration.",
  "Engineering seamless ambition.",
  "Making growth ethical again.",
  "Turning insights into inevitabilities.",
  "Redesigning destiny through data.",
  "Aligning ambition with infrastructure.",
  "Building frictionless futures.",
  "Rethinking permanence.",
  "Elevating disruption to a discipline.",
  "Solving scale once and for all.",
  "Creating hyper-aligned ecosystems.",
  "Engineering planetary leverage.",
  "Delivering paradigm as a platform.",
  "Curating exponential experiences.",
  "Simplifying the complex future.",
  "Human-centered automation.",
  "Reinventing what's next before it's now.",
  "Building responsibly inevitable systems.",
  "Transforming ambition into architecture.",
  "Encoding a better tomorrow.",
  "Designing scalable virtue.",
  "Disrupting responsibly.",
  "Future-proofing humanity.",
  "Enabling infinite iteration.",
  "Building what's beyond next.",
  "Operationalizing boldness.",
  "Turning velocity into value.",
  "Architecting universal efficiency.",
  "Scaling the improbable.",
  "Engineering meaningful inevitability.",
  "Delivering impact without compromise.",
  "Making scale humane.",
  "Codifying greatness.",
  "Transforming bandwidth into belief.",
  "Building momentum you can monetize.",
  "Reinventing possibility daily.",
  "Empowering optimized existence.",
  "Designing ethical acceleration.",
  "Making innovation autonomous.",
  "Elevating infrastructure to inspiration.",
  "Monetizing potential at scale.",
  "Building clarity for a complex world.",
  "Simplifying global ambition.",
  "Turning data into destiny responsibly.",
  "Reimagining progress permanently.",
  "Delivering alignment at scale.",
  "Engineering the inevitable pivot.",
  "Scaling human progress.",
  "Architecting the exponential era.",
  "Turning bold into baseline.",
  "Building intelligence into everything.",
  "Transforming ecosystems through synergy.",
  "Delivering certainty in uncertain times.",
  "Empowering scalable purpose.",
  "Designing the future responsibly and profitably.",
  "Solving tomorrow today.",
  "Engineering the next normal.",
  "Making destiny programmable.",
];

let missionInterval = null;

// ===== State =====

let pendingDelete = null; // for undo
let pendingImportData = null; // for import dialog
let collapsedColumns = new Set();
let selectedTicketIds = new Set();
let viewAllActive = false;

function generateBoardId() {
  return "B-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

function defaultBoard(title, color, defaults) {
  const defs = defaults || (typeof state !== "undefined" && state.defaults) || defaultDefaults();
  const cols = JSON.parse(JSON.stringify(defs.columns || DEFAULT_COLUMNS));
  const columnOrder = {};
  for (const col of cols) columnOrder[col.id] = [];
  return {
    id: generateBoardId(),
    title: title || randomName(),
    color: color || BOARD_COLORS[0],
    tickets: [],
    columns: cols,
    priorities: JSON.parse(JSON.stringify(defs.priorities || DEFAULT_PRIORITIES)),
    columnOrder,
    labelPresets: [...(defs.labelPresets || LABEL_PRESETS)]
  };
}

function defaultState() {
  const projectTitle = randomName();
  const boardTitle = randomName([projectTitle]);
  const defs = defaultDefaults();
  return {
    version: CURRENT_VERSION,
    title: projectTitle,
    boards: [defaultBoard(boardTitle, undefined, defs)],
    activeBoardIndex: 0,
    defaults: defs
  };
}

function activeBoard() {
  return state.boards[state.activeBoardIndex];
}

function migrateState(data) {
  if (!data) return null;

  if (data.version === 1) {
    for (const ticket of data.tickets) {
      if (typeof ticket.prompt === "undefined") {
        ticket.prompt = "";
      }
    }
    data.version = 2;
  }

  if (data.version === 2) {
    const projectTitle = randomName();
    const boardTitle = randomName([projectTitle]);
    data = {
      version: 3,
      title: projectTitle,
      boards: [{
        id: generateBoardId(),
        title: boardTitle,
        tickets: data.tickets || [],
        columnOrder: data.columnOrder || { "todo": [], "in-progress": [], "testing": [], "done": [], "canceled": [] },
        labelPresets: data.labelPresets || [...LABEL_PRESETS]
      }],
      activeBoardIndex: 0
    };
  }

  if (data.version === 3) {
    // Migrate v3 → v4: add columns, priorities, defaults
    for (const board of data.boards) {
      if (!board.columns) {
        board.columns = JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
      }
      if (!board.priorities) {
        board.priorities = JSON.parse(JSON.stringify(DEFAULT_PRIORITIES));
      }
      if (!board.color) {
        board.color = BOARD_COLORS[0];
      }
      // Ensure columnOrder has entries for all columns
      for (const col of board.columns) {
        if (!board.columnOrder[col.id]) {
          board.columnOrder[col.id] = [];
        }
      }
    }
    if (!data.defaults) {
      data.defaults = defaultDefaults();
    }
    data.version = 4;
  }

  if (data.version !== CURRENT_VERSION) return null;
  return data;
}

function migrateToProjectRegistry() {
  // Already migrated?
  if (getProjectRegistry()) return;

  // Check for old keys: agilethis-board or fakejira-board
  let oldData = localStorage.getItem(STORAGE_KEY);
  const oldKey = "fakejira-board";
  if (!oldData && localStorage.getItem(oldKey)) {
    oldData = localStorage.getItem(oldKey);
    localStorage.removeItem(oldKey);
    // Migrate auxiliary fakejira keys
    const keyMigrations = [
      ["fakejira-sidebar", "agilethis-sidebar"],
      ["fakejira-sidebar-width", "agilethis-sidebar-width"],
      ["fakejira-col-widths", "agilethis-col-widths"],
    ];
    for (const [oldK, newK] of keyMigrations) {
      const val = localStorage.getItem(oldK);
      if (val !== null) {
        localStorage.setItem(newK, val);
        localStorage.removeItem(oldK);
      }
    }
  }

  if (oldData) {
    // Copy data to project-0
    localStorage.setItem(projectStorageKey(0), oldData);
    // Migrate collapsed columns
    const oldCollapsed = localStorage.getItem(COL_COLLAPSED_KEY) || localStorage.getItem("fakejira-col-collapsed");
    if (oldCollapsed !== null) {
      localStorage.setItem(collapsedStorageKey(0), oldCollapsed);
    }
    // Clean up old keys
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COL_COLLAPSED_KEY);
    localStorage.removeItem("fakejira-col-collapsed");
  }

  // Create registry
  const reg = { nextId: 1, list: [0] };
  saveProjectRegistry(reg);
}

function validateState(data) {
  if (!data || !Array.isArray(data.boards) || data.boards.length === 0) return null;
  // Clamp activeBoardIndex
  if (data.activeBoardIndex < 0 || data.activeBoardIndex >= data.boards.length) {
    data.activeBoardIndex = 0;
  }
  // Validate each board
  data.boards.forEach((board, i) => {
    if (!board.columns) board.columns = JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
    if (!board.priorities) board.priorities = JSON.parse(JSON.stringify(DEFAULT_PRIORITIES));
    for (const col of board.columns) {
      if (!board.columnOrder || !Array.isArray(board.columnOrder[col.id])) {
        if (!board.columnOrder) board.columnOrder = {};
        board.columnOrder[col.id] = [];
      }
    }
    if (!Array.isArray(board.labelPresets)) {
      board.labelPresets = [...LABEL_PRESETS];
    }
    if (!board.color) {
      board.color = BOARD_COLORS[i % BOARD_COLORS.length];
    }
  });
  if (!data.defaults) data.defaults = defaultDefaults();
  return data;
}

function loadBoardState() {
  migrateToProjectRegistry();
  const pid = currentProjectId();
  // Ensure this project exists in registry
  const reg = getProjectRegistry();
  if (reg && !reg.list.includes(pid)) {
    reg.list.push(pid);
    if (pid >= reg.nextId) reg.nextId = pid + 1;
    saveProjectRegistry(reg);
  }
  try {
    const raw = localStorage.getItem(projectStorageKey(pid));
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateState(parsed);
      const validated = validateState(migrated);
      if (validated) return validated;
    }
  } catch (e) {
    console.warn("Failed to load board state:", e);
  }
  return defaultState();
}

function saveBoardState() {
  localStorage.setItem(projectStorageKey(currentProjectId()), JSON.stringify(state));
}

let state = loadBoardState();

// ===== ID Generation =====

function generateId() {
  return "FJ-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// ===== SVG Icons =====

const ICONS = {
  empty: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 3"><rect x="4" y="4" width="24" height="24" rx="3"/></svg>',
  prompt: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 7 9 4 12"/><line x1="9" y1="12" x2="13" y2="12"/></svg>'
};

// ===== Rendering =====

function renderColumns() {
  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  // Remove existing columns and resize handles (keep bulk-bar)
  boardEl.querySelectorAll(".column, .column-resize-handle").forEach(el => el.remove());

  const cols = viewAllActive ? (state.defaults ? state.defaults.columns : DEFAULT_COLUMNS) : boardColumns();

  for (const col of cols) {
    const isLast = col.id === "canceled" || col === cols[cols.length - 1];
    const colDiv = document.createElement("div");
    colDiv.className = "column" + (isLast && col.id === "canceled" ? " column--collapsible" : "");
    colDiv.dataset.status = col.id;

    const header = document.createElement("div");
    header.className = "column__header" + (isLast && col.id === "canceled" ? " column__header--toggle" : "");
    if (isLast && col.id === "canceled") header.dataset.toggleStatus = col.id;

    const headerLeft = document.createElement("div");
    headerLeft.className = "column__header-left";

    const dot = document.createElement("span");
    dot.className = "status-dot";
    dot.style.setProperty("--dot-color", col.color);
    headerLeft.appendChild(dot);

    const h2 = document.createElement("h2");
    h2.textContent = col.name;
    if (col.id === "canceled") h2.style.color = col.color;
    headerLeft.appendChild(h2);

    header.appendChild(headerLeft);

    if (isLast && col.id === "canceled") {
      const count = document.createElement("span");
      count.className = "column__count";
      count.dataset.count = col.id;
      count.textContent = "0";
      headerLeft.appendChild(count);

      const headerRight = document.createElement("div");
      headerRight.className = "column__header-right";
      headerRight.innerHTML = '<svg class="column__chevron" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l4 4 4-4"/></svg>';
      header.appendChild(headerRight);
    } else {
      const count = document.createElement("span");
      count.className = "column__count";
      count.dataset.count = col.id;
      count.textContent = "0";
      header.appendChild(count);
    }

    colDiv.appendChild(header);

    const cards = document.createElement("div");
    cards.className = "column__cards";
    cards.id = "col-" + col.id;
    colDiv.appendChild(cards);

    const quickadd = document.createElement("div");
    quickadd.className = "column__quickadd";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "quickadd-input";
    input.dataset.status = col.id;
    input.placeholder = "+ Add to " + col.name + "...";
    quickadd.appendChild(input);
    colDiv.appendChild(quickadd);

    boardEl.appendChild(colDiv);
  }
}

function renderBoard() {
  const boardEl = document.getElementById("board");

  renderColumns();
  bindQuickAdd();
  bindCollapsibleHeaders();

  if (viewAllActive) {
    if (boardEl) boardEl.style.removeProperty("--active-board-color");
    const cols = state.defaults ? state.defaults.columns : DEFAULT_COLUMNS;

    for (const col of cols) {
      const container = document.getElementById("col-" + col.id);
      if (!container) continue;
      container.innerHTML = "";

      let cardIndex = 0;
      let hasCards = false;
      for (let bi = 0; bi < state.boards.length; bi++) {
        const board = state.boards[bi];
        const boardColor = board.color || BOARD_COLORS[bi % BOARD_COLORS.length];
        const ids = board.columnOrder[col.id] || [];
        for (const id of ids) {
          const ticket = board.tickets.find(t => t.id === id);
          if (!ticket) continue;
          const card = renderTicketCard(ticket, cardIndex++, board);
          card.style.setProperty("--active-board-color", boardColor);
          card.dataset.boardIndex = bi;
          container.appendChild(card);
          hasCards = true;
        }
      }

      if (!hasCards) {
        const empty = document.createElement("div");
        empty.className = "column__empty";
        empty.innerHTML = ICONS.empty + '<span>No tickets</span>';
        container.appendChild(empty);
      }
    }

    renderColumnCounts();
    applyCollapsedState();
    refreshResizeHandles();
    return;
  }

  const board = activeBoard();
  if (boardEl) {
    boardEl.style.setProperty("--active-board-color", board.color || BOARD_COLORS[0]);
  }

  // Orphan check: move tickets with unknown statuses to first column
  const colIds = new Set(board.columns.map(c => c.id));
  const firstColId = board.columns[0].id;
  for (const ticket of board.tickets) {
    if (!colIds.has(ticket.status)) {
      // Remove from old columnOrder if it exists
      for (const key of Object.keys(board.columnOrder)) {
        board.columnOrder[key] = board.columnOrder[key].filter(tid => tid !== ticket.id);
      }
      ticket.status = firstColId;
      if (!board.columnOrder[firstColId]) board.columnOrder[firstColId] = [];
      board.columnOrder[firstColId].push(ticket.id);
    }
  }

  for (const col of board.columns) {
    const container = document.getElementById("col-" + col.id);
    if (!container) continue;
    container.innerHTML = "";

    const ids = board.columnOrder[col.id] || [];
    if (ids.length === 0) {
      const empty = document.createElement("div");
      empty.className = "column__empty";
      empty.innerHTML = ICONS.empty
        + '<span>No tickets</span>'
        + '<span class="column__empty-hint">Quick-add below or press N</span>';
      container.appendChild(empty);
    } else {
      ids.forEach((id, index) => {
        const ticket = board.tickets.find(t => t.id === id);
        if (ticket) {
          container.appendChild(renderTicketCard(ticket, index));
        }
      });
    }
  }
  renderColumnCounts();
  initSortable();
  applyCollapsedState();
  renderColumnSelectAllCheckboxes();
  updateSelectionUI();
  refreshResizeHandles();
}

function renderTicketCard(ticket, index, forBoard) {
  const card = document.createElement("div");
  card.className = "ticket-card";
  if (ticket.prompt) {
    card.classList.add("ticket-card--has-prompt");
  }
  card.dataset.id = ticket.id;
  card.style.animationDelay = (index * 30) + "ms";
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", ticket.title + ", " + ticket.priority + " priority");

  if (selectedTicketIds.has(ticket.id)) {
    card.classList.add("ticket-card--selected");
  }

  const top = document.createElement("div");
  top.className = "ticket-card__top";

  // Checkbox slides in from the left on hover; dot stays visible to its right
  const checkWrap = document.createElement("label");
  checkWrap.className = "ticket-card__checkbox-wrap";
  checkWrap.addEventListener("click", e => e.stopPropagation());

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "ticket-card__checkbox";
  checkbox.checked = selectedTicketIds.has(ticket.id);
  checkbox.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleTicketSelection(ticket.id);
  });

  const tickBox = document.createElement("span");
  tickBox.className = "tick-box";
  tickBox.innerHTML = '<svg viewBox="0 0 10 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 3.5 6.5 9 1"/></svg>';

  checkWrap.appendChild(checkbox);
  checkWrap.appendChild(tickBox);
  top.appendChild(checkWrap);

  const dot = document.createElement("span");
  dot.className = "priority-dot";
  const prio = getPriorityById(ticket.priority, forBoard);
  if (prio) {
    dot.style.background = prio.color;
    if (prio.id === "critical") dot.style.boxShadow = "0 0 6px " + prio.color + "66";
  } else {
    dot.style.background = "#fbbf24";
  }
  top.appendChild(dot);

  const title = document.createElement("span");
  title.className = "ticket-card__title";
  title.textContent = ticket.title;
  title.title = ticket.title;
  top.appendChild(title);

  const del = document.createElement("button");
  del.className = "ticket-card__delete";
  del.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';
  del.setAttribute("aria-label", "Delete " + ticket.id);
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTicket(ticket.id);
  });
  top.appendChild(del);

  card.appendChild(top);

  if (ticket.description) {
    const desc = document.createElement("div");
    desc.className = "ticket-card__desc";
    desc.textContent = ticket.description;
    card.appendChild(desc);
  }

  if (ticket.prompt || (ticket.labels && ticket.labels.length > 0)) {
    const meta = document.createElement("div");
    meta.className = "ticket-card__meta";

    if (ticket.prompt) {
      const indicator = document.createElement("span");
      indicator.className = "ticket-card__prompt-indicator";
      indicator.innerHTML = ICONS.prompt + ' Prompt';
      meta.appendChild(indicator);
    }

    if (ticket.labels && ticket.labels.length > 0) {
      for (const label of ticket.labels) {
        const chip = document.createElement("span");
        chip.className = "label-chip";
        chip.textContent = label;
        meta.appendChild(chip);
      }
    }

    card.appendChild(meta);
  }

  const footer = document.createElement("div");
  footer.className = "ticket-card__footer";

  const idSpan = document.createElement("span");
  idSpan.className = "ticket-card__id";
  idSpan.textContent = ticket.id;
  footer.appendChild(idSpan);

  const dateSpan = document.createElement("span");
  dateSpan.className = "ticket-card__date";
  dateSpan.textContent = formatDate(ticket.createdAt);
  footer.appendChild(dateSpan);

  card.appendChild(footer);

  card.addEventListener("click", () => openEditModal(ticket.id));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEditModal(ticket.id);
    }
  });

  return card;
}

function renderColumnCounts() {
  const cols = viewAllActive ? (state.defaults ? state.defaults.columns : DEFAULT_COLUMNS) : boardColumns();
  for (const col of cols) {
    const badge = document.querySelector(`[data-count="${col.id}"]`);
    if (!badge) continue;

    let count;
    if (viewAllActive) {
      count = state.boards.reduce((sum, b) => sum + (b.columnOrder[col.id] || []).length, 0);
    } else {
      count = (activeBoard().columnOrder[col.id] || []).length;
    }

    const newCount = String(count);
    if (badge.textContent !== newCount) {
      badge.textContent = newCount;
      badge.classList.add("column__count--pop");
      setTimeout(() => badge.classList.remove("column__count--pop"), 200);
    }
  }
}

function formatDate(iso) {
  const d = new Date(iso);
  const month = d.toLocaleString("default", { month: "short" });
  return month + " " + d.getDate();
}

// ===== Board Tabs =====

function renderTabs() {
  const container = document.getElementById("board-tabs");
  if (!container) return;
  container.innerHTML = "";

  // Update View All button active state
  const viewAllBtn = document.getElementById("btn-view-all");
  if (viewAllBtn) {
    viewAllBtn.classList.toggle("sidebar__view-all--active", viewAllActive);
  }

  state.boards.forEach((board, index) => {
    const tab = document.createElement("button");
    tab.className = "board-tab" + (!viewAllActive && index === state.activeBoardIndex ? " board-tab--active" : "");
    tab.dataset.index = index;
    tab.style.setProperty("--board-color", board.color || BOARD_COLORS[index % BOARD_COLORS.length]);

    const dragHandle = document.createElement("span");
    dragHandle.className = "board-tab__drag";
    dragHandle.innerHTML = '<svg viewBox="0 0 6 14" fill="currentColor"><circle cx="2" cy="2" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="2" cy="12" r="1"/><circle cx="4" cy="2" r="1"/><circle cx="4" cy="7" r="1"/><circle cx="4" cy="12" r="1"/></svg>';
    dragHandle.setAttribute("aria-hidden", "true");
    tab.appendChild(dragHandle);

    const titleSpan = document.createElement("span");
    titleSpan.className = "board-tab__title";
    titleSpan.textContent = board.title;
    tab.appendChild(titleSpan);

    if (state.boards.length > 1) {
      const delBtn = document.createElement("span");
      delBtn.className = "board-tab__delete";
      delBtn.innerHTML = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/></svg>';
      delBtn.setAttribute("aria-label", "Delete board " + board.title);
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteBoard(index);
      });
      tab.appendChild(delBtn);
    }

    const gearBtn = document.createElement("span");
    gearBtn.className = "board-tab__gear";
    gearBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M13.3 10a1.1 1.1 0 00.22 1.21l.04.04a1.33 1.33 0 11-1.88 1.88l-.04-.04a1.1 1.1 0 00-1.21-.22 1.1 1.1 0 00-.67 1.01v.12a1.33 1.33 0 11-2.67 0v-.06a1.1 1.1 0 00-.72-1.01 1.1 1.1 0 00-1.21.22l-.04.04a1.33 1.33 0 11-1.88-1.88l.04-.04a1.1 1.1 0 00.22-1.21 1.1 1.1 0 00-1.01-.67h-.12a1.33 1.33 0 110-2.67h.06a1.1 1.1 0 001.01-.72 1.1 1.1 0 00-.22-1.21l-.04-.04A1.33 1.33 0 115 3.21l.04.04a1.1 1.1 0 001.21.22h.05a1.1 1.1 0 00.67-1.01v-.12a1.33 1.33 0 112.67 0v.06a1.1 1.1 0 00.67 1.01 1.1 1.1 0 001.21-.22l.04-.04a1.33 1.33 0 111.88 1.88l-.04.04a1.1 1.1 0 00-.22 1.21v.05a1.1 1.1 0 001.01.67h.12a1.33 1.33 0 110 2.67h-.06a1.1 1.1 0 00-1.01.67z"/></svg>';
    gearBtn.setAttribute("aria-label", "Board settings");
    gearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openBoardSettings(index);
    });
    tab.appendChild(gearBtn);

    tab.addEventListener("click", () => switchBoard(index));
    tab.addEventListener("dblclick", (e) => {
      e.preventDefault();
      startRenameBoard(index, titleSpan);
    });

    container.appendChild(tab);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "board-tab board-tab--add";
  addBtn.innerHTML = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="7" y1="3" x2="7" y2="11"/><line x1="3" y1="7" x2="11" y2="7"/></svg> Add Board';
  addBtn.setAttribute("aria-label", "Add new board");
  addBtn.addEventListener("click", addBoard);
  container.appendChild(addBtn);

  initBoardSortable();
}

function switchBoard(index) {
  if (!viewAllActive && index === state.activeBoardIndex) return;
  clearSelection();
  if (viewAllActive) exitViewAll();
  state.activeBoardIndex = index;
  saveBoardState();
  renderBoard();
  renderTabs();
}

function addBoard() {
  if (viewAllActive) exitViewAll();
  const existingTitles = state.boards.map(b => b.title);
  existingTitles.push(state.title);
  const colorIndex = state.boards.length;
  const newBoard = defaultBoard(randomName(existingTitles), BOARD_COLORS[colorIndex % BOARD_COLORS.length], state.defaults);
  state.boards.push(newBoard);
  state.activeBoardIndex = state.boards.length - 1;
  saveBoardState();
  renderBoard();
  renderTabs();
  showToast("Board added");
}

function deleteBoard(index) {
  if (state.boards.length <= 1) return;

  const deletedBoard = state.boards[index];
  const deletedIndex = index;
  const wasActive = state.activeBoardIndex;

  state.boards.splice(index, 1);
  if (state.activeBoardIndex >= state.boards.length) {
    state.activeBoardIndex = state.boards.length - 1;
  } else if (state.activeBoardIndex > index) {
    state.activeBoardIndex--;
  }

  saveBoardState();
  renderBoard();
  renderTabs();

  showToast("Deleted \u201c" + deletedBoard.title + "\u201d", {
    undo: () => {
      state.boards.splice(deletedIndex, 0, deletedBoard);
      state.activeBoardIndex = wasActive;
      if (state.activeBoardIndex >= state.boards.length) {
        state.activeBoardIndex = state.boards.length - 1;
      }
      saveBoardState();
      renderBoard();
      renderTabs();
      showToast("Board restored");
    }
  });
}

function startRenameBoard(index, titleSpan) {
  const board = state.boards[index];
  const input = document.createElement("input");
  input.type = "text";
  input.className = "board-tab__rename";
  input.value = board.title;

  const finish = () => {
    const newTitle = input.value.trim();
    board.title = newTitle || randomName(state.boards.map(b => b.title).concat(state.title));
    saveBoardState();
    renderTabs();
  };

  input.addEventListener("blur", finish);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    }
    if (e.key === "Escape") {
      input.value = board.title;
      input.blur();
    }
  });

  titleSpan.replaceWith(input);
  input.focus();
  input.select();
}

// ===== Project Title =====

function syncVerticalTitle() {
  const span = document.getElementById("project-title-vertical");
  if (span) span.textContent = state.title;
  document.title = state.title ? `${state.title} - Agile This` : "Agile This";
}

function initProjectTitle() {
  const input = document.getElementById("project-title");
  if (!input) return;
  input.value = state.title;
  syncVerticalTitle();

  const save = () => {
    const newTitle = input.value.trim();
    state.title = newTitle || randomName(state.boards.map(b => b.title));
    input.value = state.title;
    syncVerticalTitle();
    saveBoardState();
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    }
  });
}

function updateProjectTitleUI() {
  const input = document.getElementById("project-title");
  if (input) input.value = state.title;
  syncVerticalTitle();
}

// ===== CRUD =====

function createTicket({ title, description = "", status = "todo", priority = "medium", labels = [], prompt = "" }) {
  const board = activeBoard();
  const now = new Date().toISOString();
  const ticket = {
    id: generateId(),
    title,
    description,
    prompt,
    status,
    priority,
    labels,
    createdAt: now,
    updatedAt: now
  };
  board.tickets.push(ticket);
  if (!board.columnOrder[status]) board.columnOrder[status] = [];
  board.columnOrder[status].push(ticket.id);
  saveBoardState();
  renderBoard();

  // Highlight the new card briefly
  requestAnimationFrame(() => {
    const newCard = document.querySelector(`[data-id="${ticket.id}"]`);
    if (newCard) {
      newCard.classList.add("ticket-card--just-created");
      setTimeout(() => newCard.classList.remove("ticket-card--just-created"), 600);
    }
  });

  return ticket;
}

function updateTicket(id, updates) {
  const board = activeBoard();
  const ticket = board.tickets.find(t => t.id === id);
  if (!ticket) return;

  const oldStatus = ticket.status;

  Object.assign(ticket, updates, { updatedAt: new Date().toISOString() });

  if (updates.status && updates.status !== oldStatus) {
    if (board.columnOrder[oldStatus]) {
      board.columnOrder[oldStatus] = board.columnOrder[oldStatus].filter(tid => tid !== id);
    }
    if (!board.columnOrder[updates.status]) board.columnOrder[updates.status] = [];
    if (!board.columnOrder[updates.status].includes(id)) {
      board.columnOrder[updates.status].push(id);
    }
  }

  saveBoardState();
  renderBoard();
}

function deleteTicket(id) {
  // In View All mode, find which board owns this ticket
  if (viewAllActive) {
    const boardIdx = state.boards.findIndex(b => b.tickets.some(t => t.id === id));
    if (boardIdx !== -1) state.activeBoardIndex = boardIdx;
  }

  const board = activeBoard();
  const boardIndex = state.activeBoardIndex;
  const ticket = board.tickets.find(t => t.id === id);
  if (!ticket) return;

  // Store for undo
  const deletedTicket = { ...ticket };
  const deletedIndex = board.columnOrder[ticket.status].indexOf(id);

  // Remove immediately
  board.tickets = board.tickets.filter(t => t.id !== id);
  for (const col of boardColumns()) {
    if (board.columnOrder[col.id]) {
      board.columnOrder[col.id] = board.columnOrder[col.id].filter(tid => tid !== id);
    }
  }

  saveBoardState();
  renderBoard();

  // Cancel any previous pending delete timeout
  if (pendingDelete) {
    clearTimeout(pendingDelete.timeout);
    pendingDelete = null;
  }

  // Show undo toast
  const undoTimeout = setTimeout(() => {
    pendingDelete = null;
  }, 5000);

  pendingDelete = {
    ticket: deletedTicket,
    index: deletedIndex,
    boardIndex: boardIndex,
    timeout: undoTimeout
  };

  const ticketLabel = deletedTicket.title.length > 28
    ? deletedTicket.title.slice(0, 27) + "\u2026"
    : deletedTicket.title;
  showToast("Deleted \u201c" + ticketLabel + "\u201d", {
    undo: () => {
      clearTimeout(undoTimeout);
      // Restore ticket to the specific board it was deleted from
      const targetBoard = state.boards[pendingDelete.boardIndex];
      if (targetBoard) {
        targetBoard.tickets.push(pendingDelete.ticket);
        const col = targetBoard.columnOrder[pendingDelete.ticket.status];
        const idx = Math.min(pendingDelete.index, col.length);
        col.splice(idx, 0, pendingDelete.ticket.id);
      }
      pendingDelete = null;
      saveBoardState();
      renderBoard();
      showToast("Ticket restored");
    }
  });
}

// ===== Modal =====

function populateStatusDropdown() {
  const menu = document.getElementById("status-menu");
  menu.innerHTML = "";
  const cols = boardColumns();
  for (const col of cols) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "status-dropdown__option";
    btn.dataset.value = col.id;
    btn.setAttribute("role", "option");
    const dot = document.createElement("span");
    dot.className = "status-dropdown__opt-dot";
    dot.style.setProperty("--dot-color", col.color);
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(" " + col.name));
    menu.appendChild(btn);
  }
}

function populatePriorityPills() {
  const container = document.getElementById("priority-pills");
  container.innerHTML = "";
  const prios = boardPriorities();
  for (const prio of prios) {
    const label = document.createElement("label");
    label.className = "priority-pill";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "priority";
    radio.value = prio.id;
    const inner = document.createElement("span");
    inner.className = "priority-pill__inner";
    const dot = document.createElement("span");
    dot.className = "priority-dot";
    dot.style.background = prio.color;
    inner.appendChild(dot);
    inner.appendChild(document.createTextNode(" " + (prio.name.length > 4 ? prio.name.substring(0, 4) : prio.name)));
    label.appendChild(radio);
    label.appendChild(inner);
    container.appendChild(label);
  }
}

function openNewModal(defaultStatus) {
  clearSelection();
  const cols = boardColumns();
  const firstStatus = defaultStatus || cols[0].id;
  document.getElementById("modal-title").textContent = "New Ticket";
  document.getElementById("ticket-id").value = "";
  document.getElementById("ticket-title").value = "";
  document.getElementById("ticket-desc").value = "";
  document.getElementById("ticket-prompt").value = "";
  document.getElementById("modal-delete").style.display = "none";
  populateStatusDropdown();
  populatePriorityPills();
  setStatusValue(firstStatus);
  // Default priority: second in list (or first if only one)
  const prios = boardPriorities();
  const defaultPrio = prios.length > 1 ? prios[1].id : prios[0].id;
  const radio = document.querySelector(`input[name="priority"][value="${defaultPrio}"]`);
  if (radio) radio.checked = true;
  renderLabelChips([]);
  resetCopyButton();
  showModal();
}

function openEditModal(id) {
  clearSelection();

  // In View All mode, find which board owns this ticket
  if (viewAllActive) {
    const boardIdx = state.boards.findIndex(b => b.tickets.some(t => t.id === id));
    if (boardIdx !== -1) state.activeBoardIndex = boardIdx;
  }

  const board = activeBoard();
  const ticket = board.tickets.find(t => t.id === id);
  if (!ticket) return;

  document.getElementById("modal-title").textContent = "Edit " + ticket.id;
  document.getElementById("ticket-id").value = ticket.id;
  document.getElementById("ticket-title").value = ticket.title;
  document.getElementById("ticket-desc").value = ticket.description || "";
  document.getElementById("ticket-prompt").value = ticket.prompt || "";
  document.getElementById("modal-delete").style.display = "";
  populateStatusDropdown();
  populatePriorityPills();
  setStatusValue(ticket.status);

  const radio = document.querySelector(`input[name="priority"][value="${ticket.priority}"]`);
  if (radio) radio.checked = true;

  renderLabelChips(ticket.labels || []);
  resetCopyButton();
  showModal();
}

function renderLabelChips(selectedLabels) {
  const board = activeBoard();
  const container = document.getElementById("label-chips");
  container.innerHTML = "";
  for (const label of board.labelPresets) {
    const chip = document.createElement("span");
    chip.className = "label-chip label-chip--selectable";
    chip.textContent = label;
    chip.setAttribute("role", "checkbox");
    chip.setAttribute("tabindex", "0");

    if (selectedLabels.includes(label)) {
      chip.classList.add("selected");
      chip.setAttribute("aria-checked", "true");
    } else {
      chip.setAttribute("aria-checked", "false");
    }

    const toggle = () => {
      chip.classList.toggle("selected");
      chip.setAttribute("aria-checked", chip.classList.contains("selected"));
    };
    chip.addEventListener("click", toggle);
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    container.appendChild(chip);
  }
}

function getSelectedLabels() {
  return Array.from(document.querySelectorAll("#label-chips .selected"))
    .map(el => el.textContent);
}

function showModal() {
  document.getElementById("modal-backdrop").classList.add("active");
  document.getElementById("board").setAttribute("inert", "");
  document.querySelector(".header").setAttribute("inert", "");
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.setAttribute("inert", "");
  document.body.style.overflow = "hidden";
  document.getElementById("ticket-title").focus();
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("active");
  document.getElementById("board").removeAttribute("inert");
  document.querySelector(".header").removeAttribute("inert");
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.removeAttribute("inert");
  document.body.style.overflow = "";
  closeStatusDropdown();
}

function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("ticket-id").value;
  const title = document.getElementById("ticket-title").value.trim();
  const description = document.getElementById("ticket-desc").value.trim();
  const prompt = document.getElementById("ticket-prompt").value.trim();
  const status = getStatusValue();
  const priority = document.querySelector('input[name="priority"]:checked').value;
  const labels = getSelectedLabels();

  if (!title) return;

  if (id) {
    updateTicket(id, { title, description, prompt, status, priority, labels });
    showToast("Ticket updated");
  } else {
    createTicket({ title, description, prompt, status, priority, labels });
    showToast("Ticket created");
  }

  closeModal();
  if (viewAllActive) renderBoard();
}

// ===== Copy Prompt =====

function initCopyButton() {
  document.getElementById("btn-copy-prompt").addEventListener("click", handleCopyPrompt);
}

function handleCopyPrompt() {
  const textarea = document.getElementById("ticket-prompt");
  const text = textarea.value.trim();

  if (!text) {
    showToast("No prompt to copy");
    return;
  }

  copyToClipboard(text).then(() => {
    const btn = document.getElementById("btn-copy-prompt");
    const label = document.getElementById("copy-prompt-text");
    btn.classList.add("copied");
    label.textContent = "Copied!";
    setTimeout(() => resetCopyButton(), 1500);
  }).catch(() => {
    showToast("Failed to copy");
  });
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  return new Promise((resolve, reject) => {
    document.execCommand("copy") ? resolve() : reject();
    ta.remove();
  });
}

function resetCopyButton() {
  const btn = document.getElementById("btn-copy-prompt");
  const label = document.getElementById("copy-prompt-text");
  btn.classList.remove("copied");
  label.textContent = "Copy";
}

// ===== Board Tab Drag Reorder =====

let boardSortable = null;

function initBoardSortable() {
  if (boardSortable) boardSortable.destroy();
  const container = document.getElementById("board-tabs");
  if (!container) return;
  boardSortable = new Sortable(container, {
    animation: 150,
    handle: ".board-tab__drag",
    draggable: ".board-tab:not(.board-tab--add)",
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    onEnd(evt) {
      if (evt.oldIndex === evt.newIndex) return;
      const activeB = state.boards[state.activeBoardIndex];
      const moved = state.boards.splice(evt.oldIndex, 1)[0];
      state.boards.splice(evt.newIndex, 0, moved);
      state.activeBoardIndex = state.boards.indexOf(activeB);
      saveBoardState();
      renderTabs();
    }
  });
}

// ===== Drag & Drop =====

let sortableInstances = [];

let dragState = {
  sourceColumn: null,
  currentColumn: null,
  precisionMode: false,
  hoverTimer: null,
};
const PRECISION_DELAY = 600;

function resetDragState() {
  clearTimeout(dragState.hoverTimer);
  document.querySelectorAll(".column__cards").forEach(el => {
    el.classList.remove("drop-target-bottom", "precision-active");
  });
  dragState.sourceColumn = null;
  dragState.currentColumn = null;
  dragState.precisionMode = false;
  dragState.hoverTimer = null;
}

function initSortable() {
  for (const s of sortableInstances) s.destroy();
  sortableInstances = [];

  const cols = boardColumns();
  for (const col of cols) {
    const el = document.getElementById("col-" + col.id);
    if (!el) continue;
    const instance = new Sortable(el, {
      group: "kanban",
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      draggable: ".ticket-card",
      filter: ".column__empty",
      onStart: function(evt) {
        resetDragState();
        dragState.sourceColumn = evt.from.id;
        dragState.currentColumn = evt.from.id;
      },
      onMove: function(evt) {
        const targetCol = evt.to.id;
        const isCrossColumn = targetCol !== dragState.sourceColumn;

        if (!isCrossColumn) {
          // Same-column reorder: clear cross-column state, allow normal behavior
          clearTimeout(dragState.hoverTimer);
          dragState.hoverTimer = null;
          dragState.precisionMode = false;
          document.querySelectorAll(".column__cards").forEach(el => {
            el.classList.remove("drop-target-bottom", "precision-active");
          });
          dragState.currentColumn = targetCol;
          return true;
        }

        // Cross-column: if entering a new column, reset timer
        if (targetCol !== dragState.currentColumn) {
          clearTimeout(dragState.hoverTimer);
          dragState.precisionMode = false;
          document.querySelectorAll(".column__cards").forEach(el => {
            el.classList.remove("drop-target-bottom", "precision-active");
          });
          dragState.currentColumn = targetCol;

          // Show bottom drop indicator
          evt.to.classList.add("drop-target-bottom");

          // Start precision mode timer
          dragState.hoverTimer = setTimeout(() => {
            dragState.precisionMode = true;
            evt.to.classList.remove("drop-target-bottom");
            evt.to.classList.add("precision-active");
          }, PRECISION_DELAY);
        }

        // Always allow the move -- we reposition in onEnd if needed
        return true;
      },
      onEnd: handleDragEnd,
    });
    sortableInstances.push(instance);
  }
}

function handleDragEnd(evt) {
  const board = activeBoard();
  const isCrossColumn = evt.from.id !== evt.to.id;

  // For cross-column quick drops (no precision mode), move item to bottom
  if (isCrossColumn && !dragState.precisionMode) {
    evt.to.appendChild(evt.item);
  }

  // Clean up drag state
  resetDragState();

  // Remove leftover empty-state placeholders
  const cols = boardColumns();
  for (const col of cols) {
    const container = document.getElementById("col-" + col.id);
    if (!container) continue;
    container.querySelectorAll(".column__empty").forEach(el => el.remove());
  }

  // Rebuild columnOrder from DOM
  for (const col of cols) {
    const container = document.getElementById("col-" + col.id);
    if (!container) continue;
    const cards = container.querySelectorAll(".ticket-card");
    board.columnOrder[col.id] = Array.from(cards).map(c => c.dataset.id);
  }

  // Update ticket status if moved to a different column
  const ticketId = evt.item.dataset.id;
  const newStatus = evt.to.id.replace("col-", "");
  const ticket = board.tickets.find(t => t.id === ticketId);
  const movedToNewCol = ticket && ticket.status !== newStatus;

  if (movedToNewCol) {
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
  }

  saveBoardState();

  // Re-add empty states to now-empty columns
  for (const col of cols) {
    const container = document.getElementById("col-" + col.id);
    if (!container) continue;
    if ((board.columnOrder[col.id] || []).length === 0) {
      const empty = document.createElement("div");
      empty.className = "column__empty";
      empty.innerHTML = ICONS.empty
        + '<span>No tickets</span>'
        + '<span class="column__empty-hint">Quick-add below or press N</span>';
      container.appendChild(empty);
    }
  }

  renderColumnCounts();
}

// ===== Export / Import =====

function exportBoard() {
  const json = JSON.stringify(state);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const sanitized = state.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  a.download = "agile-this-" + (sanitized || "project") + "-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Project exported");
}

function importBoard(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let data = JSON.parse(e.target.result);

      // Normalize: bare array of tickets -> v1 wrapper
      if (Array.isArray(data)) {
        if (data.length === 0 || typeof data[0] !== "object" || !data[0].title) {
          showToast("Import failed: array does not contain valid tickets (need title field)");
          return;
        }
        data = { version: 1, tickets: data };
      }

      if (!data || typeof data !== "object") {
        showToast("Import failed: file is not a JSON object or array");
        return;
      }

      // Detect v1/v2 format: has tickets at root (columnOrder is optional)
      if (Array.isArray(data.tickets) && (!data.version || data.version <= 2)) {
        const srcVersion = data.version || 1;
        data = migrateState(data);
        if (!data) {
          showToast("Import failed: could not migrate v" + srcVersion + " format");
          return;
        }
      }

      // Validate v3 format
      if (!Array.isArray(data.boards) || data.boards.length === 0) {
        // Try one more migration pass if it has tickets
        if (Array.isArray(data.tickets)) {
          data = migrateState(data);
          if (!data || !Array.isArray(data.boards)) {
            showToast("Import failed: file has tickets but could not be converted to a board");
            return;
          }
        } else {
          const keys = Object.keys(data).join(", ");
          showToast("Import failed: expected boards or tickets, found: " + (keys || "empty object"));
          return;
        }
      }

      // Migrate if needed
      if (data.version !== CURRENT_VERSION) {
        const srcVersion = data.version;
        data = migrateState(data);
        if (!data) {
          showToast("Import failed: unsupported version (v" + srcVersion + ")");
          return;
        }
      }

      pendingImportData = data;
      showImportDialog();
    } catch (err) {
      showToast("Import failed: " + (err.message || "invalid JSON"));
    }
  };
  reader.readAsText(file);
}

function hasAnyTickets() {
  return state.boards.some(b => b.tickets.length > 0);
}

function startNewProject() {
  clearSelection();
  if (viewAllActive) exitViewAll();
  state = defaultState();
  saveBoardState();
  loadCollapsedColumns();
  renderBoard();
  renderTabs();
  applyCollapsedState();
  updateProjectTitleUI();
  showToast("Project cleared");
}

function showImportDialog() {
  const dialog = document.getElementById("import-dialog-backdrop");
  if (dialog) {
    // Reset to step 1
    document.getElementById("import-step-1").hidden = false;
    document.getElementById("import-step-2").hidden = true;
    dialog.classList.add("active");
    document.getElementById("board").setAttribute("inert", "");
    document.querySelector(".header").setAttribute("inert", "");
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
  }
}

function closeImportDialog() {
  const dialog = document.getElementById("import-dialog-backdrop");
  if (dialog) {
    dialog.classList.remove("active");
    document.getElementById("board").removeAttribute("inert");
    document.querySelector(".header").removeAttribute("inert");
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.removeAttribute("inert");
    document.body.style.overflow = "";
    // Reset step for next open
    document.getElementById("import-step-1").hidden = false;
    document.getElementById("import-step-2").hidden = true;
  }
  pendingImportData = null;
}

function handleImportAddToBoard() {
  if (!pendingImportData) return;
  clearSelection();
  const oldState = JSON.parse(JSON.stringify(state));
  const board = activeBoard();
  let count = 0;
  for (const importedBoard of pendingImportData.boards) {
    for (const ticket of importedBoard.tickets) {
      const newId = generateId();
      const newTicket = { ...ticket, id: newId };
      board.tickets.push(newTicket);
      const colIds = new Set(board.columns.map(c => c.id));
      const col = newTicket.status && colIds.has(newTicket.status) ? newTicket.status : board.columns[0].id;
      if (!board.columnOrder[col]) board.columnOrder[col] = [];
      board.columnOrder[col].push(newId);
      count++;
    }
  }
  pendingImportData = null;
  closeImportDialog();
  saveBoardState();
  renderBoard();
  showToast(count + " ticket" + (count !== 1 ? "s" : "") + " added", {
    undo: () => {
      state = oldState;
      saveBoardState();
      renderBoard();
      renderTabs();
      showToast("Import undone");
    }
  });
}

function doImportReplace() {
  if (!pendingImportData) return;
  clearSelection();
  if (viewAllActive) exitViewAll();
  const oldState = JSON.parse(JSON.stringify(state));
  state = pendingImportData;
  pendingImportData = null;
  closeImportDialog();
  saveBoardState();
  renderBoard();
  renderTabs();
  updateProjectTitleUI();
  showToast("Project replaced", {
    undo: () => {
      state = oldState;
      saveBoardState();
      renderBoard();
      renderTabs();
      updateProjectTitleUI();
      showToast("Import undone");
    }
  });
}

function handleImportNewProject() {
  if (!pendingImportData) return;
  if (hasAnyTickets()) {
    document.getElementById("import-step-1").hidden = true;
    document.getElementById("import-step-2").hidden = false;
  } else {
    doImportReplace();
  }
}

function handleImportSaveAndReplace() {
  exportBoard();
  doImportReplace();
}

function handleImportSkipSave() {
  doImportReplace();
}

function handleImportStepBack() {
  document.getElementById("import-step-1").hidden = false;
  document.getElementById("import-step-2").hidden = true;
}

function handleImportAddBoards() {
  if (!pendingImportData) return;
  clearSelection();
  const oldState = JSON.parse(JSON.stringify(state));
  const importedBoards = pendingImportData.boards;

  // Regenerate board IDs to avoid collisions
  const existingTitles = state.boards.map(b => b.title).concat(state.title);
  for (const board of importedBoards) {
    board.id = generateBoardId();
    // Avoid duplicate titles within the project
    if (existingTitles.includes(board.title)) {
      board.title = randomName(existingTitles);
    }
    existingTitles.push(board.title);
    state.boards.push(board);
  }

  pendingImportData = null;
  closeImportDialog();
  saveBoardState();
  renderTabs();
  showToast(importedBoards.length + " board" + (importedBoards.length > 1 ? "s" : "") + " added", {
    undo: () => {
      state = oldState;
      saveBoardState();
      renderBoard();
      renderTabs();
      showToast("Import undone");
    }
  });
}

function initImportDialog() {
  const backdrop = document.getElementById("import-dialog-backdrop");
  if (!backdrop) return;

  document.getElementById("import-add-to-board").addEventListener("click", handleImportAddToBoard);
  document.getElementById("import-add").addEventListener("click", handleImportAddBoards);
  document.getElementById("import-replace").addEventListener("click", handleImportNewProject);
  document.getElementById("import-save-and-replace").addEventListener("click", handleImportSaveAndReplace);
  document.getElementById("import-skip-save").addEventListener("click", handleImportSkipSave);
  document.getElementById("import-step-back").addEventListener("click", handleImportStepBack);
  document.getElementById("import-cancel").addEventListener("click", closeImportDialog);

  backdrop.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeImportDialog();
  });
}

function showNewProjectModal() {
  const modal = document.getElementById("new-project-modal-backdrop");
  if (modal) {
    modal.classList.add("active");
    document.getElementById("board").setAttribute("inert", "");
    document.querySelector(".header").setAttribute("inert", "");
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
  }
}

function closeNewProjectModal() {
  const modal = document.getElementById("new-project-modal-backdrop");
  if (modal) {
    modal.classList.remove("active");
    document.getElementById("board").removeAttribute("inert");
    document.querySelector(".header").removeAttribute("inert");
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.removeAttribute("inert");
    document.body.style.overflow = "";
  }
}

function initNewDropdown() {
  const dropdown = document.getElementById("new-dropdown");
  const btn = document.getElementById("btn-new");
  const menu = document.getElementById("new-dropdown-menu");
  if (!dropdown || !btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // Wire up menu items
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-action]");
    if (!item) return;
    dropdown.classList.remove("open");
    const action = item.dataset.action;

    if (action === "ticket") {
      openNewModal();
    } else if (action === "project-window") {
      const id = allocateProjectId();
      window.open(location.pathname + "#project/" + id, "_blank");
    } else if (action === "duplicate") {
      const id = allocateProjectId();
      // Deep-copy current state with new board IDs
      const copy = JSON.parse(JSON.stringify(state));
      copy.boards.forEach(b => { b.id = generateBoardId(); });
      copy.title = copy.title + " (copy)";
      localStorage.setItem(projectStorageKey(id), JSON.stringify(copy));
      window.open(location.pathname + "#project/" + id, "_blank");
    } else if (action === "project-clear") {
      if (hasAnyTickets()) {
        showNewProjectModal();
      } else {
        startNewProject();
      }
    }
  });

  // Save prompt modal wiring
  document.getElementById("new-project-save-new").addEventListener("click", () => {
    exportBoard();
    closeNewProjectModal();
    startNewProject();
  });

  document.getElementById("new-project-skip-save").addEventListener("click", () => {
    closeNewProjectModal();
    startNewProject();
  });

  document.getElementById("new-project-cancel").addEventListener("click", closeNewProjectModal);

  document.getElementById("new-project-modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeNewProjectModal();
  });
}

// ===== Toast =====

function showToast(message, options = {}) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";

  const textNode = document.createElement("span");
  textNode.textContent = message;
  toast.appendChild(textNode);

  if (options.undo) {
    const undoBtn = document.createElement("button");
    undoBtn.className = "toast__undo";
    undoBtn.textContent = "Undo";
    undoBtn.addEventListener("click", () => {
      options.undo();
      toast.remove();
    });
    toast.appendChild(undoBtn);
  }

  container.appendChild(toast);

  const duration = options.undo ? 5000 : 2500;
  setTimeout(() => {
    toast.classList.add("toast--out");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// ===== Quick Add =====

function bindQuickAdd() {
  // Uses event delegation — no need to rebind per input
}

function initQuickAdd() {
  document.getElementById("board").addEventListener("keydown", (e) => {
    if (e.target.classList.contains("quickadd-input") && e.key === "Enter") {
      const input = e.target;
      const title = input.value.trim();
      if (!title) return;
      const status = input.dataset.status;
      createTicket({ title, status });
      input.value = "";
    }
  });
}

// ===== Keyboard Shortcuts =====

function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (e.key === "Escape") {
      const newDropdown = document.getElementById("new-dropdown");
      if (newDropdown && newDropdown.classList.contains("open")) {
        newDropdown.classList.remove("open");
        return;
      }
      const settingsDrawer = document.getElementById("settings-drawer");
      if (settingsDrawer && settingsDrawer.classList.contains("active")) {
        closeSettingsDrawer();
        renderBoard();
        return;
      }
      const newProjectModal = document.getElementById("new-project-modal-backdrop");
      if (newProjectModal && newProjectModal.classList.contains("active")) {
        closeNewProjectModal();
        return;
      }
      const importDialog = document.getElementById("import-dialog-backdrop");
      if (importDialog && importDialog.classList.contains("active")) {
        closeImportDialog();
        return;
      }
      const modalBackdrop = document.getElementById("modal-backdrop");
      if (modalBackdrop && modalBackdrop.classList.contains("active")) {
        closeModal();
        return;
      }
      // No modal open — clear bulk selection
      if (selectedTicketIds.size > 0) {
        clearSelection();
        return;
      }
      closeModal();
      return;
    }

    if (isInput) return;

    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      openNewModal();
      return;
    }

  });
}

// ===== Custom Status Dropdown =====

let currentStatus = "todo";

function getStatusValue() {
  return currentStatus;
}

function setStatusValue(value) {
  currentStatus = value;
  const dropdown = document.getElementById("status-dropdown");
  const label = document.getElementById("status-label");
  const col = getColumnById(value);
  label.textContent = col ? col.name : value;
  // Apply dynamic color to trigger
  const trigger = dropdown.querySelector(".status-dropdown__trigger");
  if (col) {
    trigger.style.borderColor = col.color + "40";
    trigger.style.background = col.color + "14";
    trigger.style.color = col.color;
  }
  // Update aria-selected on options
  dropdown.querySelectorAll(".status-dropdown__option").forEach(opt => {
    opt.setAttribute("aria-selected", opt.dataset.value === value ? "true" : "false");
  });
}

function initStatusDropdown() {
  const trigger = document.getElementById("status-trigger");
  const dropdown = document.getElementById("status-dropdown");
  const menu = document.getElementById("status-menu");

  trigger.addEventListener("click", () => {
    const isOpen = dropdown.classList.contains("open");
    if (isOpen) {
      closeStatusDropdown();
    } else {
      dropdown.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      // Focus the currently selected option
      const selected = menu.querySelector(`[data-value="${currentStatus}"]`);
      if (selected) selected.focus();
    }
  });

  // Option clicks
  menu.addEventListener("click", (e) => {
    const option = e.target.closest(".status-dropdown__option");
    if (!option) return;
    setStatusValue(option.dataset.value);
    closeStatusDropdown();
  });

  // Keyboard nav
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dropdown.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      const selected = menu.querySelector(`[data-value="${currentStatus}"]`);
      if (selected) selected.focus();
    }
  });

  menu.addEventListener("keydown", (e) => {
    const options = Array.from(menu.querySelectorAll(".status-dropdown__option"));
    const current = document.activeElement;
    const idx = options.indexOf(current);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = options[(idx + 1) % options.length];
      next.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = options[(idx - 1 + options.length) % options.length];
      prev.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (current.dataset.value) {
        setStatusValue(current.dataset.value);
        closeStatusDropdown();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeStatusDropdown();
    }
  });

  // Click outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      closeStatusDropdown();
    }
  });
}

function closeStatusDropdown() {
  const dropdown = document.getElementById("status-dropdown");
  const trigger = document.getElementById("status-trigger");
  dropdown.classList.remove("open");
  trigger.setAttribute("aria-expanded", "false");
}

// ===== Event Listeners =====

function initEvents() {
  document.getElementById("btn-export").addEventListener("click", exportBoard);
  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("file-import").click();
  });
  document.getElementById("file-import").addEventListener("change", (e) => {
    if (e.target.files[0]) {
      importBoard(e.target.files[0]);
      e.target.value = "";
    }
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById("ticket-form").addEventListener("submit", handleFormSubmit);

  document.getElementById("modal-delete").addEventListener("click", () => {
    const id = document.getElementById("ticket-id").value;
    if (id) {
      closeModal();
      deleteTicket(id);
    }
  });

  initStatusDropdown();
  initImportDialog();
  initNewDropdown();
}

// ===== Mission Banner =====

function initMissionBanner() {
  const title = document.querySelector(".header__title");
  const banner = document.getElementById("mission-banner");
  const quoteEl = document.getElementById("mission-quote");

  title.addEventListener("click", () => {
    const isActive = banner.classList.toggle("mission-banner--active");

    if (isActive) {
      showRandomQuote(quoteEl);
      missionInterval = setInterval(() => {
        quoteEl.style.opacity = "0";
        setTimeout(() => {
          showRandomQuote(quoteEl);
          quoteEl.style.opacity = "1";
        }, 600);
      }, 5000);
    } else {
      clearInterval(missionInterval);
      missionInterval = null;
    }
  });
}

function showRandomQuote(el) {
  el.textContent = MISSION_QUOTES[Math.floor(Math.random() * MISSION_QUOTES.length)];
  el.style.opacity = "1";
}

// ===== Sidebar =====

const SIDEBAR_KEY = "agilethis-sidebar";

function initSidebar() {
  const saved = localStorage.getItem(SIDEBAR_KEY);
  if (saved === "collapsed" || (saved === null && window.innerWidth <= 640)) {
    document.body.classList.add("sidebar-collapsed");
  }

  document.getElementById("btn-sidebar-toggle").addEventListener("click", toggleSidebar);

  const backdrop = document.getElementById("sidebar-backdrop");
  if (backdrop) backdrop.addEventListener("click", toggleSidebar);
}

function toggleSidebar() {
  document.body.classList.toggle("sidebar-collapsed");
  const isCollapsed = document.body.classList.contains("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_KEY, isCollapsed ? "collapsed" : "open");
}

// ===== Sidebar Resize =====

const SIDEBAR_WIDTH_KEY = "agilethis-sidebar-width";
const SIDEBAR_MIN_W = 160;
const SIDEBAR_MAX_W = 400;

function initSidebarResize() {
  const handle = document.getElementById("sidebar-resize-handle");
  if (!handle) return;

  // Load saved width
  const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  if (savedWidth) {
    const w = parseInt(savedWidth, 10);
    if (w >= SIDEBAR_MIN_W && w <= SIDEBAR_MAX_W) {
      document.documentElement.style.setProperty("--sidebar-width", w + "px");
    }
  }

  handle.addEventListener("mousedown", startSidebarResize);
  handle.addEventListener("touchstart", startSidebarResize, { passive: false });
  handle.addEventListener("dblclick", resetSidebarWidth);
}

function startSidebarResize(e) {
  e.preventDefault();
  const handle = document.getElementById("sidebar-resize-handle");
  handle.classList.add("sidebar__resize-handle--active");
  document.body.classList.add("sidebar-resizing");

  const startX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
  const sidebar = document.getElementById("sidebar");
  const startWidth = sidebar.getBoundingClientRect().width;

  function onMove(ev) {
    const clientX = ev.type === "touchmove" ? ev.touches[0].clientX : ev.clientX;
    const delta = clientX - startX;
    const newWidth = Math.max(SIDEBAR_MIN_W, Math.min(startWidth + delta, SIDEBAR_MAX_W));
    document.documentElement.style.setProperty("--sidebar-width", newWidth + "px");
  }

  function onEnd() {
    handle.classList.remove("sidebar__resize-handle--active");
    document.body.classList.remove("sidebar-resizing");
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onEnd);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    // Save
    const finalWidth = document.getElementById("sidebar").getBoundingClientRect().width;
    localStorage.setItem(SIDEBAR_WIDTH_KEY, Math.round(finalWidth));
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onEnd);
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);
}

function resetSidebarWidth() {
  document.documentElement.style.removeProperty("--sidebar-width");
  localStorage.removeItem(SIDEBAR_WIDTH_KEY);
}

// ===== Column Resize =====

const COL_WIDTHS_KEY = "agilethis-col-widths";

function initColumnResize() {
  const board = document.getElementById("board");
  const columns = board.querySelectorAll(".column");

  // Load saved widths
  loadColumnWidths(columns);

  // Insert resize handles between columns
  insertResizeHandles(board, columns);
}

function loadColumnWidths(columns) {
  try {
    const saved = localStorage.getItem(COL_WIDTHS_KEY);
    if (saved) {
      const widths = JSON.parse(saved);
      columns.forEach((col, i) => {
        if (widths[i]) {
          col.style.flex = "0 0 " + widths[i] + "px";
          col.style.minWidth = "200px";
        }
      });
    }
  } catch (e) { /* ignore */ }
}

function saveColumnWidths() {
  const columns = document.querySelectorAll("#board > .column");
  const widths = Array.from(columns).map(col => col.getBoundingClientRect().width);
  localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths));
}

function insertResizeHandles(board, columns) {
  // Remove existing handles first
  board.querySelectorAll(".column-resize-handle").forEach(h => h.remove());

  for (let i = 0; i < columns.length - 1; i++) {
    const handle = document.createElement("div");
    handle.className = "column-resize-handle";
    handle.dataset.index = i;
    columns[i].after(handle);

    handle.addEventListener("mousedown", (e) => startColumnResize(e, i));
    handle.addEventListener("touchstart", (e) => startColumnResize(e, i), { passive: false });
    handle.addEventListener("dblclick", resetColumnWidths);
  }
}

function startColumnResize(e, index) {
  e.preventDefault();
  const board = document.getElementById("board");
  const columns = board.querySelectorAll(".column");
  const leftCol = columns[index];
  const rightCol = columns[index + 1];
  if (!leftCol || !rightCol) return;

  const handle = board.querySelectorAll(".column-resize-handle")[index];
  handle.classList.add("column-resize-handle--active");
  document.body.classList.add("col-resizing");

  const startX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
  const leftWidth = leftCol.getBoundingClientRect().width;
  const rightWidth = rightCol.getBoundingClientRect().width;
  const minW = 200;

  // Set all columns to fixed flex so they don't reflow during drag
  columns.forEach(col => {
    const w = col.getBoundingClientRect().width;
    col.style.flex = "0 0 " + w + "px";
    col.style.minWidth = minW + "px";
  });

  function onMove(ev) {
    const clientX = ev.type === "touchmove" ? ev.touches[0].clientX : ev.clientX;
    const delta = clientX - startX;
    const newLeft = Math.max(minW, Math.min(leftWidth + delta, leftWidth + rightWidth - minW));
    const newRight = leftWidth + rightWidth - newLeft;
    leftCol.style.flex = "0 0 " + newLeft + "px";
    rightCol.style.flex = "0 0 " + newRight + "px";
  }

  function onEnd() {
    handle.classList.remove("column-resize-handle--active");
    document.body.classList.remove("col-resizing");
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onEnd);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    saveColumnWidths();
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onEnd);
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);
}

function resetColumnWidths() {
  const columns = document.querySelectorAll("#board > .column");
  columns.forEach(col => {
    col.style.flex = "";
    col.style.minWidth = "";
  });
  localStorage.removeItem(COL_WIDTHS_KEY);
}

// Re-insert handles after board re-renders
function refreshResizeHandles() {
  const board = document.getElementById("board");
  const columns = board.querySelectorAll(".column");
  loadColumnWidths(columns);
  insertResizeHandles(board, columns);
}

// ===== View All =====

function toggleViewAll() {
  viewAllActive = true;
  clearSelection();
  renderBoard();
  renderTabs();
}

function exitViewAll() {
  viewAllActive = false;
  renderBoard();
  renderTabs();
}

// ===== Init =====

function init() {
  // Normalize hash on first load
  if (!location.hash.match(/^#project\/\d+$/)) {
    history.replaceState(null, "", "#project/" + currentProjectId());
  }

  loadCollapsedColumns(); // must run before first renderBoard
  initEvents();
  initCopyButton();
  initQuickAdd();
  initKeyboard();
  initMissionBanner();
  initSidebar();
  initSidebarResize();
  initProjectTitle();
  renderTabs();
  renderBoard();
  initCollapsibleColumns();
  initBulkBar();
  initBoardClickToDeselect();
  initSettingsDrawer();
  initRouting();

  // View All button
  const viewAllBtn = document.getElementById("btn-view-all");
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", () => {
      if (viewAllActive) {
        exitViewAll();
      } else {
        toggleViewAll();
      }
    });
  }
}

function initRouting() {
  window.addEventListener("hashchange", () => {
    // Save current project before switching
    saveBoardState();
    // Load the new project
    clearSelection();
    if (viewAllActive) exitViewAll();
    state = loadBoardState();
    loadCollapsedColumns();
    renderTabs();
    renderBoard();
    applyCollapsedState();
    updateProjectTitleUI();
  });
}

// ===== Collapsible Columns =====

function loadCollapsedColumns() {
  try {
    const saved = localStorage.getItem(collapsedStorageKey(currentProjectId()));
    if (saved !== null) {
      collapsedColumns = new Set(JSON.parse(saved));
    } else {
      collapsedColumns = new Set(["canceled"]);
    }
  } catch (e) {
    collapsedColumns = new Set(["canceled"]);
  }
}

function saveCollapsedColumns() {
  localStorage.setItem(collapsedStorageKey(currentProjectId()), JSON.stringify(Array.from(collapsedColumns)));
}

function applyCollapsedState() {
  const cols = viewAllActive ? (state.defaults ? state.defaults.columns : DEFAULT_COLUMNS) : boardColumns();
  for (const c of cols) {
    const col = document.querySelector(`.column[data-status="${c.id}"]`);
    if (!col) continue;
    if (collapsedColumns.has(c.id)) {
      col.classList.add("column--collapsed");
    } else {
      col.classList.remove("column--collapsed");
    }
  }
}

function toggleColumnCollapse(status) {
  const col = document.querySelector(`.column[data-status="${status}"]`);
  if (!col) return;
  if (collapsedColumns.has(status)) {
    collapsedColumns.delete(status);
    col.classList.remove("column--collapsed");
  } else {
    collapsedColumns.add(status);
    col.classList.add("column--collapsed");
  }
  saveCollapsedColumns();
}

function bindCollapsibleHeaders() {
  // Uses event delegation — no need to rebind per header
}

function initCollapsibleColumns() {
  loadCollapsedColumns();
  applyCollapsedState();
  document.getElementById("board").addEventListener("click", (e) => {
    const header = e.target.closest(".column__header--toggle");
    if (!header) return;
    const status = header.dataset.toggleStatus;
    if (status) toggleColumnCollapse(status);
  });
}

// ===== Bulk Selection =====

function toggleTicketSelection(id) {
  if (selectedTicketIds.has(id)) {
    selectedTicketIds.delete(id);
  } else {
    selectedTicketIds.add(id);
  }
  updateSelectionUI();
}

function clearSelection() {
  selectedTicketIds.clear();
  updateSelectionUI();
}

function getColumnSelectionState(status) {
  const board = activeBoard();
  const ticketIds = board.columnOrder[status] || [];
  const allSelected = ticketIds.length > 0 && ticketIds.every(id => selectedTicketIds.has(id));
  const someSelected = ticketIds.some(id => selectedTicketIds.has(id));
  return { allSelected, someSelected };
}

function toggleColumnSelection(status, selectAll) {
  const board = activeBoard();
  const ticketIds = board.columnOrder[status] || [];
  if (selectAll) {
    ticketIds.forEach(id => selectedTicketIds.add(id));
  } else {
    ticketIds.forEach(id => selectedTicketIds.delete(id));
  }
  updateSelectionUI();
}

function renderColumnSelectAllCheckboxes() {
  const board = activeBoard();
  for (const c of boardColumns()) {
    const status = c.id;
    const col = document.querySelector(`.column[data-status="${status}"]`);
    if (!col) continue;
    const headerLeft = col.querySelector(".column__header-left");
    if (!headerLeft) continue;

    // Remove old
    const old = headerLeft.querySelector(".column__select-all-wrap");
    if (old) old.remove();

    const ticketIds = board.columnOrder[status] || [];
    const { allSelected, someSelected } = getColumnSelectionState(status);

    const wrap = document.createElement("label");
    wrap.className = "column__select-all-wrap";
    wrap.title = "Select all in column";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "column__select-all-cb";
    checkbox.checked = allSelected;
    checkbox.indeterminate = !allSelected && someSelected;

    checkbox.addEventListener("change", (e) => {
      e.stopPropagation();
      toggleColumnSelection(status, checkbox.checked);
    });
    checkbox.addEventListener("click", e => e.stopPropagation());
    wrap.addEventListener("click", e => e.stopPropagation());

    const tick = document.createElement("span");
    tick.className = "tick-box";
    tick.innerHTML = '<svg viewBox="0 0 10 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 3.5 6.5 9 1"/></svg>';

    wrap.appendChild(checkbox);
    wrap.appendChild(tick);
    headerLeft.prepend(wrap);
  }
}

function updateSelectionUI() {
  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  // Update each card's selected state
  document.querySelectorAll(".ticket-card").forEach(card => {
    const id = card.dataset.id;
    const isSelected = selectedTicketIds.has(id);
    card.classList.toggle("ticket-card--selected", isSelected);
    const cb = card.querySelector(".ticket-card__checkbox");
    if (cb) cb.checked = isSelected;
  });

  // Toggle selection-active on board
  boardEl.classList.toggle("selection-active", selectedTicketIds.size > 0);

  // Update column select-all checkboxes (update existing without full re-render)
  const selCols = viewAllActive ? (state.defaults ? state.defaults.columns : DEFAULT_COLUMNS) : boardColumns();
  for (const c of selCols) {
    const status = c.id;
    const col = document.querySelector(`.column[data-status="${status}"]`);
    if (!col) continue;
    const headerLeft = col.querySelector(".column__header-left");
    if (!headerLeft) continue;
    const cb = headerLeft.querySelector(".column__select-all-cb");
    if (!cb) continue;
    const { allSelected, someSelected } = getColumnSelectionState(status);
    cb.checked = allSelected;
    cb.indeterminate = !allSelected && someSelected;
  }

  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById("bulk-bar");
  if (!bar) return;
  const count = selectedTicketIds.size;
  bar.classList.toggle("bulk-bar--visible", count > 0);
  const countEl = document.getElementById("bulk-count");
  if (countEl) countEl.textContent = count + " selected";
}

function populateBulkStatusMenu() {
  const menu = document.getElementById("bulk-status-menu");
  if (!menu) return;
  menu.innerHTML = "";
  for (const col of boardColumns()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bulk-dropdown__option";
    btn.dataset.bulkAction = "status";
    btn.dataset.value = col.id;
    btn.textContent = col.name;
    menu.appendChild(btn);
  }
}

function populateBulkPriorityMenu() {
  const menu = document.getElementById("bulk-priority-menu");
  if (!menu) return;
  menu.innerHTML = "";
  for (const prio of boardPriorities()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bulk-dropdown__option";
    btn.dataset.bulkAction = "priority";
    btn.dataset.value = prio.id;
    btn.textContent = prio.name;
    menu.appendChild(btn);
  }
}

function populateBulkAddLabelMenu() {
  const board = activeBoard();
  const menu = document.getElementById("bulk-add-label-menu");
  if (!menu) return;
  menu.innerHTML = "";
  for (const label of board.labelPresets) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bulk-dropdown__option";
    btn.dataset.bulkAction = "add-label";
    btn.dataset.value = label;
    btn.textContent = label;
    menu.appendChild(btn);
  }
}

function populateBulkRemoveLabelMenu() {
  const board = activeBoard();
  const menu = document.getElementById("bulk-remove-label-menu");
  if (!menu) return;
  menu.innerHTML = "";

  const labels = new Set();
  for (const id of selectedTicketIds) {
    const ticket = board.tickets.find(t => t.id === id);
    if (ticket && ticket.labels) {
      ticket.labels.forEach(l => labels.add(l));
    }
  }

  if (labels.size === 0) {
    const empty = document.createElement("span");
    empty.className = "bulk-dropdown__empty";
    empty.textContent = "No labels";
    menu.appendChild(empty);
    return;
  }

  for (const label of labels) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bulk-dropdown__option";
    btn.dataset.bulkAction = "remove-label";
    btn.dataset.value = label;
    btn.textContent = label;
    menu.appendChild(btn);
  }
}

function executeBulkAction(action, value) {
  const board = activeBoard();
  const ids = Array.from(selectedTicketIds);
  if (ids.length === 0) return;

  if (action === "status") {
    for (const id of ids) {
      const ticket = board.tickets.find(t => t.id === id);
      if (!ticket) continue;
      const oldStatus = ticket.status;
      if (oldStatus === value) continue;
      if (board.columnOrder[oldStatus]) {
        board.columnOrder[oldStatus] = board.columnOrder[oldStatus].filter(tid => tid !== id);
      }
      if (!board.columnOrder[value]) board.columnOrder[value] = [];
      if (!board.columnOrder[value].includes(id)) {
        board.columnOrder[value].push(id);
      }
      ticket.status = value;
      ticket.updatedAt = new Date().toISOString();
    }
  } else if (action === "priority") {
    for (const id of ids) {
      const ticket = board.tickets.find(t => t.id === id);
      if (!ticket) continue;
      ticket.priority = value;
      ticket.updatedAt = new Date().toISOString();
    }
  } else if (action === "add-label") {
    for (const id of ids) {
      const ticket = board.tickets.find(t => t.id === id);
      if (!ticket) continue;
      if (!ticket.labels) ticket.labels = [];
      if (!ticket.labels.includes(value)) {
        ticket.labels.push(value);
      }
      ticket.updatedAt = new Date().toISOString();
    }
  } else if (action === "remove-label") {
    for (const id of ids) {
      const ticket = board.tickets.find(t => t.id === id);
      if (!ticket) continue;
      ticket.labels = (ticket.labels || []).filter(l => l !== value);
      ticket.updatedAt = new Date().toISOString();
    }
  }

  saveBoardState();
  renderBoard();
  showToast(ids.length + " ticket" + (ids.length !== 1 ? "s" : "") + " updated");
}

function initBulkBar() {
  const clearBtn = document.getElementById("bulk-clear");
  if (clearBtn) clearBtn.addEventListener("click", clearSelection);

  // Wire dropdown triggers
  document.querySelectorAll("[data-bulk-trigger]").forEach(trigger => {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const type = trigger.dataset.bulkTrigger;
      const dropdown = trigger.closest(".bulk-dropdown");
      const isOpen = dropdown.classList.contains("open");

      // Close all dropdowns
      document.querySelectorAll(".bulk-dropdown.open").forEach(d => d.classList.remove("open"));

      if (!isOpen) {
        if (type === "status") populateBulkStatusMenu();
        if (type === "priority") populateBulkPriorityMenu();
        if (type === "add-label") populateBulkAddLabelMenu();
        if (type === "remove-label") populateBulkRemoveLabelMenu();
        dropdown.classList.add("open");
      }
    });
  });

  // Wire option clicks via delegation on the bulk-bar actions area
  document.getElementById("bulk-bar").addEventListener("click", (e) => {
    const option = e.target.closest(".bulk-dropdown__option");
    if (!option) return;
    const action = option.dataset.bulkAction;
    const value = option.dataset.value;
    if (action && value) {
      document.querySelectorAll(".bulk-dropdown.open").forEach(d => d.classList.remove("open"));
      executeBulkAction(action, value);
    }
  });

  // Close bulk dropdowns on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".bulk-dropdown") && !e.target.closest(".bulk-bar")) {
      document.querySelectorAll(".bulk-dropdown.open").forEach(d => d.classList.remove("open"));
    }
  });
}

function initBoardClickToDeselect() {
  document.getElementById("board").addEventListener("click", (e) => {
    if (
      !e.target.closest(".ticket-card") &&
      !e.target.closest(".bulk-bar") &&
      !e.target.closest(".column__header")
    ) {
      clearSelection();
    }
  });
}

// ===== Settings Drawer =====

let settingsMode = null; // "board" or "project"
let settingsBoardIndex = null;
let settingsSortables = [];

function openBoardSettings(boardIndex) {
  settingsMode = "board";
  settingsBoardIndex = boardIndex;
  renderSettingsDrawer();
  const backdrop = document.getElementById("settings-backdrop");
  const drawer = document.getElementById("settings-drawer");
  backdrop.classList.add("active");
  drawer.classList.add("active");
}

function openProjectSettings() {
  settingsMode = "project";
  settingsBoardIndex = null;
  renderSettingsDrawer();
  const backdrop = document.getElementById("settings-backdrop");
  const drawer = document.getElementById("settings-drawer");
  backdrop.classList.add("active");
  drawer.classList.add("active");
}

function closeSettingsDrawer() {
  const backdrop = document.getElementById("settings-backdrop");
  const drawer = document.getElementById("settings-drawer");
  backdrop.classList.remove("active");
  drawer.classList.remove("active");
  for (const s of settingsSortables) s.destroy();
  settingsSortables = [];
  settingsMode = null;
  settingsBoardIndex = null;
}

function getSettingsTarget() {
  if (settingsMode === "board") {
    return state.boards[settingsBoardIndex];
  }
  return state.defaults;
}

function renderSettingsDrawer() {
  const body = document.getElementById("settings-body");
  const title = document.getElementById("settings-title");
  body.innerHTML = "";
  for (const s of settingsSortables) s.destroy();
  settingsSortables = [];

  if (settingsMode === "board") {
    const board = state.boards[settingsBoardIndex];
    title.textContent = "Board Settings";
    renderColumnsSection(body, board.columns, board);
    renderPrioritiesSection(body, board.priorities, board);
    renderLabelsSection(body, board.labelPresets, board);
    renderBoardColorSection(body, board);
  } else {
    title.textContent = "Project Defaults";
    renderColumnsSection(body, state.defaults.columns, state.defaults);
    renderPrioritiesSection(body, state.defaults.priorities, state.defaults);
    renderLabelsSection(body, state.defaults.labelPresets, state.defaults);
  }
}

function renderColumnsSection(body, columns, target) {
  const section = document.createElement("div");
  section.className = "settings-section";
  section.innerHTML = '<h3 class="settings-section__title">Columns</h3>';

  const list = document.createElement("div");
  list.className = "settings-list";
  list.id = "settings-columns-list";

  columns.forEach((col, i) => {
    list.appendChild(createColumnItem(col, i, columns, target));
  });

  section.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.className = "settings-add-btn";
  addBtn.textContent = "+ Add Column";
  addBtn.addEventListener("click", () => {
    const newCol = { id: generateColumnId("column"), name: "New Column", color: "#818cf8" };
    // Insert before last column (canceled)
    const insertAt = columns.length > 0 ? columns.length - 1 : 0;
    columns.splice(insertAt, 0, newCol);
    if (target.columnOrder) {
      target.columnOrder[newCol.id] = [];
    }
    saveBoardState();
    renderSettingsDrawer();
  });
  section.appendChild(addBtn);
  body.appendChild(section);

  // Make middle columns sortable
  const sortable = new Sortable(list, {
    animation: 150,
    handle: ".settings-item__drag",
    draggable: ".settings-item:not(.settings-item--locked)",
    ghostClass: "sortable-ghost",
    onEnd(evt) {
      if (evt.oldIndex === evt.newIndex) return;
      const moved = columns.splice(evt.oldIndex, 1)[0];
      columns.splice(evt.newIndex, 0, moved);
      saveBoardState();
      renderSettingsDrawer();
    }
  });
  settingsSortables.push(sortable);
}

function createColumnItem(col, index, columns, target) {
  const isFirst = index === 0;
  const isLast = index === columns.length - 1;
  const isLocked = isFirst || isLast;

  const item = document.createElement("div");
  item.className = "settings-item" + (isLocked ? " settings-item--locked" : "");

  const drag = document.createElement("span");
  drag.className = "settings-item__drag";
  drag.innerHTML = '<svg viewBox="0 0 6 14" fill="currentColor"><circle cx="2" cy="2" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="2" cy="12" r="1"/><circle cx="4" cy="2" r="1"/><circle cx="4" cy="7" r="1"/><circle cx="4" cy="12" r="1"/></svg>';
  if (isLocked) drag.style.opacity = "0.2";
  item.appendChild(drag);

  const swatch = document.createElement("button");
  swatch.className = "settings-item__swatch";
  swatch.style.background = col.color;
  swatch.addEventListener("click", () => {
    showColorPicker(swatch, col.color, (newColor) => {
      col.color = newColor;
      swatch.style.background = newColor;
      saveBoardState();
    });
  });
  item.appendChild(swatch);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "settings-item__name";
  nameInput.value = col.name;
  if (isLast && col.id === "canceled") {
    nameInput.disabled = true;
    nameInput.title = "Canceled column name is fixed";
  }
  nameInput.addEventListener("blur", () => {
    const newName = nameInput.value.trim();
    if (newName && newName !== col.name) {
      col.name = newName;
      saveBoardState();
    } else {
      nameInput.value = col.name;
    }
  });
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") nameInput.blur();
  });
  item.appendChild(nameInput);

  if (!isLocked) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "settings-item__remove";
    removeBtn.innerHTML = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/></svg>';
    removeBtn.addEventListener("click", () => {
      removeColumn(col, index, columns, target);
    });
    item.appendChild(removeBtn);
  }

  return item;
}

function removeColumn(col, index, columns, target) {
  // If this is a board and the column has tickets, ask where to move them
  if (target.tickets) {
    const ticketIds = target.columnOrder[col.id] || [];
    if (ticketIds.length > 0) {
      showColumnMoveDialog(col, index, columns, target);
      return;
    }
  }

  columns.splice(index, 1);
  if (target.columnOrder) {
    delete target.columnOrder[col.id];
  }
  saveBoardState();
  renderSettingsDrawer();
}

function showColumnMoveDialog(col, index, columns, target) {
  const ticketIds = target.columnOrder[col.id] || [];
  const otherCols = columns.filter((c, i) => i !== index);

  // Replace the settings body content with a migration dialog
  const body = document.getElementById("settings-body");
  body.innerHTML = "";

  const dialog = document.createElement("div");
  dialog.className = "settings-section";
  dialog.innerHTML = `<h3 class="settings-section__title">Move ${ticketIds.length} ticket${ticketIds.length !== 1 ? "s" : ""}</h3>
    <p class="settings-migrate-desc">Column "${col.name}" has tickets. Choose where to move them:</p>`;

  const select = document.createElement("select");
  select.className = "settings-migrate-select";
  for (const oc of otherCols) {
    const opt = document.createElement("option");
    opt.value = oc.id;
    opt.textContent = oc.name;
    select.appendChild(opt);
  }
  dialog.appendChild(select);

  const actions = document.createElement("div");
  actions.className = "settings-migrate-actions";

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn btn--primary";
  confirmBtn.textContent = "Move & Remove";
  confirmBtn.addEventListener("click", () => {
    const destId = select.value;
    // Move tickets
    if (!target.columnOrder[destId]) target.columnOrder[destId] = [];
    for (const tid of ticketIds) {
      target.columnOrder[destId].push(tid);
      const ticket = target.tickets.find(t => t.id === tid);
      if (ticket) ticket.status = destId;
    }
    // Remove column
    columns.splice(index, 1);
    delete target.columnOrder[col.id];
    saveBoardState();
    renderBoard();
    renderSettingsDrawer();
  });
  actions.appendChild(confirmBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn--ghost";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => renderSettingsDrawer());
  actions.appendChild(cancelBtn);

  dialog.appendChild(actions);
  body.appendChild(dialog);
}

function renderPrioritiesSection(body, priorities, target) {
  const section = document.createElement("div");
  section.className = "settings-section";
  section.innerHTML = '<h3 class="settings-section__title">Priorities</h3>';

  const list = document.createElement("div");
  list.className = "settings-list";
  list.id = "settings-priorities-list";

  priorities.forEach((prio, i) => {
    list.appendChild(createPriorityItem(prio, i, priorities, target));
  });

  section.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.className = "settings-add-btn";
  addBtn.textContent = "+ Add Priority";
  addBtn.addEventListener("click", () => {
    const newPrio = { id: "p-" + Math.random().toString(36).substring(2, 5), name: "New Priority", color: "#818cf8" };
    priorities.push(newPrio);
    saveBoardState();
    renderSettingsDrawer();
  });
  section.appendChild(addBtn);
  body.appendChild(section);

  const sortable = new Sortable(list, {
    animation: 150,
    handle: ".settings-item__drag",
    ghostClass: "sortable-ghost",
    onEnd(evt) {
      if (evt.oldIndex === evt.newIndex) return;
      const moved = priorities.splice(evt.oldIndex, 1)[0];
      priorities.splice(evt.newIndex, 0, moved);
      saveBoardState();
      renderSettingsDrawer();
    }
  });
  settingsSortables.push(sortable);
}

function createPriorityItem(prio, index, priorities, target) {
  const item = document.createElement("div");
  item.className = "settings-item";

  const drag = document.createElement("span");
  drag.className = "settings-item__drag";
  drag.innerHTML = '<svg viewBox="0 0 6 14" fill="currentColor"><circle cx="2" cy="2" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="2" cy="12" r="1"/><circle cx="4" cy="2" r="1"/><circle cx="4" cy="7" r="1"/><circle cx="4" cy="12" r="1"/></svg>';
  item.appendChild(drag);

  const swatch = document.createElement("button");
  swatch.className = "settings-item__swatch";
  swatch.style.background = prio.color;
  swatch.addEventListener("click", () => {
    showColorPicker(swatch, prio.color, (newColor) => {
      prio.color = newColor;
      swatch.style.background = newColor;
      saveBoardState();
    });
  });
  item.appendChild(swatch);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "settings-item__name";
  nameInput.value = prio.name;
  nameInput.addEventListener("blur", () => {
    const newName = nameInput.value.trim();
    if (newName && newName !== prio.name) {
      prio.name = newName;
      saveBoardState();
    } else {
      nameInput.value = prio.name;
    }
  });
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") nameInput.blur();
  });
  item.appendChild(nameInput);

  if (priorities.length > 1) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "settings-item__remove";
    removeBtn.innerHTML = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/></svg>';
    removeBtn.addEventListener("click", () => {
      // If board, update tickets using this priority to first remaining
      if (target.tickets) {
        const remaining = priorities.filter((_, i) => i !== index);
        const fallback = remaining[0].id;
        for (const ticket of target.tickets) {
          if (ticket.priority === prio.id) ticket.priority = fallback;
        }
      }
      priorities.splice(index, 1);
      saveBoardState();
      renderSettingsDrawer();
    });
    item.appendChild(removeBtn);
  }

  return item;
}

function renderLabelsSection(body, labelPresets, target) {
  const section = document.createElement("div");
  section.className = "settings-section";
  section.innerHTML = '<h3 class="settings-section__title">Label Presets</h3>';

  const chipContainer = document.createElement("div");
  chipContainer.className = "settings-labels";

  for (let i = 0; i < labelPresets.length; i++) {
    const chip = document.createElement("span");
    chip.className = "settings-label-chip";
    chip.textContent = labelPresets[i];
    const x = document.createElement("button");
    x.className = "settings-label-chip__remove";
    x.innerHTML = '<svg viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="2" x2="6" y2="6"/><line x1="6" y1="2" x2="2" y2="6"/></svg>';
    x.addEventListener("click", () => {
      labelPresets.splice(i, 1);
      saveBoardState();
      renderSettingsDrawer();
    });
    chip.appendChild(x);
    chipContainer.appendChild(chip);
  }

  const addInput = document.createElement("input");
  addInput.type = "text";
  addInput.className = "settings-label-input";
  addInput.placeholder = "Add label...";
  addInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = addInput.value.trim();
      if (val && !labelPresets.includes(val)) {
        labelPresets.push(val);
        saveBoardState();
        renderSettingsDrawer();
      }
    }
  });
  chipContainer.appendChild(addInput);

  section.appendChild(chipContainer);
  body.appendChild(section);
}

function renderBoardColorSection(body, board) {
  const section = document.createElement("div");
  section.className = "settings-section";
  section.innerHTML = '<h3 class="settings-section__title">Board Color</h3>';

  const palette = document.createElement("div");
  palette.className = "color-palette";

  for (const color of COLOR_PALETTE) {
    const swatch = document.createElement("button");
    swatch.className = "color-swatch" + (board.color === color ? " color-swatch--active" : "");
    swatch.style.background = color;
    swatch.addEventListener("click", () => {
      board.color = color;
      saveBoardState();
      renderBoard();
      renderTabs();
      renderSettingsDrawer();
    });
    palette.appendChild(swatch);
  }

  section.appendChild(palette);
  body.appendChild(section);
}

function showColorPicker(anchor, currentColor, onChange) {
  // Remove any existing picker
  document.querySelectorAll(".color-picker-popup").forEach(el => el.remove());

  const popup = document.createElement("div");
  popup.className = "color-picker-popup";

  for (const color of COLOR_PALETTE) {
    const swatch = document.createElement("button");
    swatch.className = "color-swatch" + (color === currentColor ? " color-swatch--active" : "");
    swatch.style.background = color;
    swatch.addEventListener("click", () => {
      onChange(color);
      popup.remove();
    });
    popup.appendChild(swatch);
  }

  anchor.parentElement.style.position = "relative";
  anchor.parentElement.appendChild(popup);

  // Close on outside click
  const closeHandler = (e) => {
    if (!popup.contains(e.target) && e.target !== anchor) {
      popup.remove();
      document.removeEventListener("click", closeHandler);
    }
  };
  setTimeout(() => document.addEventListener("click", closeHandler), 0);
}

function initSettingsDrawer() {
  const backdrop = document.getElementById("settings-backdrop");
  const closeBtn = document.getElementById("settings-close");

  const closeAndRefresh = () => {
    closeSettingsDrawer();
    renderBoard();
    renderTabs();
  };
  if (backdrop) backdrop.addEventListener("click", closeAndRefresh);
  if (closeBtn) closeBtn.addEventListener("click", closeAndRefresh);

  // Project defaults gear
  const projectGear = document.getElementById("btn-project-settings");
  if (projectGear) projectGear.addEventListener("click", openProjectSettings);
}

document.addEventListener("DOMContentLoaded", init);
