// ===== Constants =====
const STORAGE_KEY = "agilethis-board"; // legacy, migrated to per-project keys
const CURRENT_VERSION = 4;
const STATUSES = ["todo", "in-progress", "testing", "done", "canceled"];
const COL_COLLAPSED_KEY = "agilethis-col-collapsed"; // legacy, migrated to per-project keys
const REGISTRY_KEY = "agilethis-projects";
const LABEL_PRESETS = ["bug", "feature", "ui", "backend", "urgent"];
const BOARD_COLORS = [
  "#6366f1",
  "#06b6d4",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#a78bfa",
  "#f97316",
  "#0ea5e9",
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
  "Initiative Zero", "Project Horizon", "Alignment Plan", "Strategic Thread",
  "Optimization Track", "Vision Node", "Growth Vector", "Mission Draft",
  "Impact Loop", "Execution Path", "Control Panel", "Roadmap Alpha",
  "Core Initiative", "Project North", "Objective Field", "Target Stream",
  "Progress Stack", "Momentum Board", "Synergy Lab", "Framework One",
  "Behavior Model", "Influence Map", "Compliance Draft", "Default Future",
  "Managed Scope", "Quiet Alignment", "Constraint Lab", "Outcome Engine",
  "Incentive Grid", "Habit Design", "Guardrail Board", "Structured Freedom",
  "Guided Track", "Soft Control", "Conformity Test", "Optimization Zone",
  "Predictive Path", "Alignment Matrix", "Friction Removal", "Order System",
  "Project Catalyst", "Launch Sequence", "Beta Initiative", "Velocity Sprint",
  "Disruption Plan", "Scale Engine", "Pivot Deck", "Hypergrowth Lab",
  "Cloud Draft", "Future Stack", "Signal Project", "Feedback Loop",
  "Core Platform", "Venture Board", "Build Track", "Systems Plan",
  "Data Sprint", "Launchpad", "Ops Grid", "Scale Node",
  "Horizon Control", "Pattern Board", "Reality Draft", "Outcome Layer",
  "Directive One", "Silent Sprint", "Behavior Stack", "Insight Engine",
  "Structure Plan", "Human Layer", "Input Channel", "Control Surface",
  "Protocol Board", "Intent Grid", "Baseline Project", "Standard Model",
  "Program Default", "Project Conform", "Order Initiative", "Precision Plan",
  "The Initiative", "The Program", "The System", "The Track",
  "The Framework", "The Plan", "The Draft", "The Model",
  "The Alignment", "The Loop", "The Path", "The Build",
  "The Field", "The Engine", "The Stack", "The Node",
  "The Signal", "The Directive", "The Grid", "The Pattern",
  "Mission Board", "Execution Room", "Strategy Deck", "Action Layer",
  "Growth Room", "Delivery Track", "Product Field", "Alignment Room",
  "Impact Board", "Vision Stack"
];

function randomName(exclude = []) {
  const available = NAME_POOL.filter((name) => !exclude.includes(name));
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
  return boardColumns(board).find((column) => column.id === id);
}

function getPriorityById(id, board) {
  return boardPriorities(board).find((priority) => priority.id === id);
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

let pendingDelete = null;
let pendingImportData = null;
let collapsedColumns = new Set();
let selectedTicketIds = new Set();
let viewAllActive = false;

function generateId() {
  return "FJ-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

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
  if (getProjectRegistry()) return;

  let oldData = localStorage.getItem(STORAGE_KEY);
  const oldKey = "fakejira-board";
  if (!oldData && localStorage.getItem(oldKey)) {
    oldData = localStorage.getItem(oldKey);
    localStorage.removeItem(oldKey);
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
    localStorage.setItem(projectStorageKey(0), oldData);
    const oldCollapsed = localStorage.getItem(COL_COLLAPSED_KEY) || localStorage.getItem("fakejira-col-collapsed");
    if (oldCollapsed !== null) {
      localStorage.setItem(collapsedStorageKey(0), oldCollapsed);
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COL_COLLAPSED_KEY);
    localStorage.removeItem("fakejira-col-collapsed");
  }

  saveProjectRegistry({ nextId: 1, list: [0] });
}

function validateState(data) {
  if (!data || !Array.isArray(data.boards) || data.boards.length === 0) return null;
  if (data.activeBoardIndex < 0 || data.activeBoardIndex >= data.boards.length) {
    data.activeBoardIndex = 0;
  }
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

function cloneStateData(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeLabelPresets(labels, fallback) {
  const source = Array.isArray(labels) ? labels : fallback;
  const seen = new Set();
  const normalized = [];
  for (const label of source) {
    if (typeof label !== "string") continue;
    const value = label.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeColumnsOrPriorities(items, fallback, kind) {
  if (!Array.isArray(items) || items.length === 0) {
    return JSON.parse(JSON.stringify(fallback));
  }

  const usedIds = new Set();
  const normalized = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rawName = typeof item.name === "string" ? item.name.trim() : "";
    const rawId = typeof item.id === "string" ? item.id.trim() : "";
    let id = rawId || generateColumnId(rawName || kind);
    while (usedIds.has(id)) {
      id = generateColumnId(id);
    }
    usedIds.add(id);
    normalized.push({
      id,
      name: rawName || id,
      color: typeof item.color === "string" && item.color.trim() ? item.color : fallback[Math.min(normalized.length, fallback.length - 1)].color
    });
  }

  return normalized.length > 0 ? normalized : JSON.parse(JSON.stringify(fallback));
}

function normalizeBoardTickets(board) {
  const tickets = Array.isArray(board.tickets) ? board.tickets : [];
  const columnIds = board.columns.map((col) => col.id);
  const priorityIds = board.priorities.map((priority) => priority.id);
  const fallbackStatus = columnIds[0];
  const fallbackPriority = priorityIds[0];
  const byId = new Map();
  const orderedTickets = [];
  const now = new Date().toISOString();

  for (const rawTicket of tickets) {
    if (!rawTicket || typeof rawTicket !== "object") continue;
    let id = typeof rawTicket.id === "string" && rawTicket.id.trim() ? rawTicket.id.trim() : generateId();
    while (byId.has(id)) {
      id = generateId();
    }

    const createdAt = Date.parse(rawTicket.createdAt) ? new Date(rawTicket.createdAt).toISOString() : now;
    const updatedAt = Date.parse(rawTicket.updatedAt) ? new Date(rawTicket.updatedAt).toISOString() : createdAt;
    const ticket = {
      id,
      title: typeof rawTicket.title === "string" && rawTicket.title.trim() ? rawTicket.title.trim() : "Untitled Ticket",
      description: typeof rawTicket.description === "string" ? rawTicket.description : "",
      prompt: typeof rawTicket.prompt === "string" ? rawTicket.prompt : "",
      status: columnIds.includes(rawTicket.status) ? rawTicket.status : fallbackStatus,
      priority: priorityIds.includes(rawTicket.priority) ? rawTicket.priority : fallbackPriority,
      labels: normalizeLabelPresets(rawTicket.labels, []),
      createdAt,
      updatedAt
    };
    byId.set(ticket.id, ticket);
    orderedTickets.push(ticket);
  }

  const nextColumnOrder = {};
  const placed = new Set();
  for (const columnId of columnIds) {
    nextColumnOrder[columnId] = [];
  }

  const existingOrder = board.columnOrder && typeof board.columnOrder === "object" ? board.columnOrder : {};
  for (const columnId of columnIds) {
    const ids = Array.isArray(existingOrder[columnId]) ? existingOrder[columnId] : [];
    for (const id of ids) {
      const ticket = byId.get(id);
      if (!ticket || ticket.status !== columnId || placed.has(id)) continue;
      nextColumnOrder[columnId].push(id);
      placed.add(id);
    }
  }

  for (const ticket of orderedTickets) {
    if (placed.has(ticket.id)) continue;
    nextColumnOrder[ticket.status].push(ticket.id);
    placed.add(ticket.id);
  }

  board.tickets = orderedTickets;
  board.columnOrder = nextColumnOrder;
}

function normalizeState(data) {
  if (!data || typeof data !== "object") return null;

  let working;
  try {
    working = cloneStateData(data);
  } catch (e) {
    return null;
  }

  const migrated = migrateState(working);
  const validated = validateState(migrated);
  if (!validated) return null;

  validated.defaults.columns = normalizeColumnsOrPriorities(validated.defaults.columns, DEFAULT_COLUMNS, "column");
  validated.defaults.priorities = normalizeColumnsOrPriorities(validated.defaults.priorities, DEFAULT_PRIORITIES, "priority");
  validated.defaults.labelPresets = normalizeLabelPresets(validated.defaults.labelPresets, LABEL_PRESETS);

  validated.boards = validated.boards.map((board, index) => {
    const normalizedBoard = board && typeof board === "object" ? board : {};
    normalizedBoard.id = typeof normalizedBoard.id === "string" && normalizedBoard.id.trim() ? normalizedBoard.id : generateBoardId();
    normalizedBoard.title = typeof normalizedBoard.title === "string" && normalizedBoard.title.trim()
      ? normalizedBoard.title.trim()
      : randomName(validated.boards.map((item) => item && item.title).filter(Boolean));
    normalizedBoard.color = typeof normalizedBoard.color === "string" && normalizedBoard.color.trim()
      ? normalizedBoard.color
      : BOARD_COLORS[index % BOARD_COLORS.length];
    normalizedBoard.columns = normalizeColumnsOrPriorities(normalizedBoard.columns, validated.defaults.columns, "column");
    normalizedBoard.priorities = normalizeColumnsOrPriorities(normalizedBoard.priorities, validated.defaults.priorities, "priority");
    normalizedBoard.labelPresets = normalizeLabelPresets(normalizedBoard.labelPresets, validated.defaults.labelPresets);
    normalizeBoardTickets(normalizedBoard);
    return normalizedBoard;
  });

  if (validated.activeBoardIndex < 0 || validated.activeBoardIndex >= validated.boards.length) {
    validated.activeBoardIndex = 0;
  }

  return validated;
}

function loadBoardState() {
  migrateToProjectRegistry();
  const pid = currentProjectId();
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
      const normalized = normalizeState(parsed);
      if (normalized) return normalized;
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
