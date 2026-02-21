// ===== Constants =====
const STORAGE_KEY = "fakejira-board";
const CURRENT_VERSION = 3;
const STATUSES = ["todo", "in-progress", "testing", "done"];
const LABEL_PRESETS = ["bug", "feature", "ui", "backend", "urgent"];

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

function generateBoardId() {
  return "B-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

function defaultBoard(title) {
  return {
    id: generateBoardId(),
    title: title || randomName(),
    tickets: [],
    columnOrder: {
      "todo": [],
      "in-progress": [],
      "testing": [],
      "done": []
    },
    labelPresets: [...LABEL_PRESETS]
  };
}

function defaultState() {
  const projectTitle = randomName();
  const boardTitle = randomName([projectTitle]);
  return {
    version: CURRENT_VERSION,
    title: projectTitle,
    boards: [defaultBoard(boardTitle)],
    activeBoardIndex: 0
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
        columnOrder: data.columnOrder || { "todo": [], "in-progress": [], "testing": [], "done": [] },
        labelPresets: data.labelPresets || [...LABEL_PRESETS]
      }],
      activeBoardIndex: 0
    };
  }

  if (data.version !== CURRENT_VERSION) return null;
  return data;
}

function loadBoardState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateState(parsed);
      if (migrated && Array.isArray(migrated.boards) && migrated.boards.length > 0) {
        // Clamp activeBoardIndex
        if (migrated.activeBoardIndex < 0 || migrated.activeBoardIndex >= migrated.boards.length) {
          migrated.activeBoardIndex = 0;
        }
        // Validate each board's columnOrder
        for (const board of migrated.boards) {
          for (const s of STATUSES) {
            if (!board.columnOrder || !Array.isArray(board.columnOrder[s])) {
              if (!board.columnOrder) board.columnOrder = {};
              board.columnOrder[s] = [];
            }
          }
          if (!Array.isArray(board.labelPresets)) {
            board.labelPresets = [...LABEL_PRESETS];
          }
        }
        return migrated;
      }
    }
  } catch (e) {
    console.warn("Failed to load board state:", e);
  }
  return defaultState();
}

function saveBoardState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function renderBoard() {
  const board = activeBoard();
  for (const status of STATUSES) {
    const container = document.getElementById("col-" + status);
    container.innerHTML = "";

    const ids = board.columnOrder[status];
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
}

function renderTicketCard(ticket, index) {
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

  const top = document.createElement("div");
  top.className = "ticket-card__top";

  const dot = document.createElement("span");
  dot.className = "priority-dot priority-dot--" + ticket.priority;
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
  const board = activeBoard();
  for (const status of STATUSES) {
    const badge = document.querySelector(`[data-count="${status}"]`);
    if (badge) {
      const newCount = String(board.columnOrder[status].length);
      if (badge.textContent !== newCount) {
        badge.textContent = newCount;
        badge.classList.add("column__count--pop");
        setTimeout(() => badge.classList.remove("column__count--pop"), 200);
      }
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

  state.boards.forEach((board, index) => {
    const tab = document.createElement("button");
    tab.className = "board-tab" + (index === state.activeBoardIndex ? " board-tab--active" : "");
    tab.dataset.index = index;

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
}

function switchBoard(index) {
  if (index === state.activeBoardIndex) return;
  state.activeBoardIndex = index;
  saveBoardState();
  renderBoard();
  renderTabs();
}

function addBoard() {
  const existingTitles = state.boards.map(b => b.title);
  existingTitles.push(state.title);
  const newBoard = defaultBoard(randomName(existingTitles));
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

  showToast("Board deleted", {
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
    board.columnOrder[oldStatus] = board.columnOrder[oldStatus].filter(tid => tid !== id);
    if (!board.columnOrder[updates.status].includes(id)) {
      board.columnOrder[updates.status].push(id);
    }
  }

  saveBoardState();
  renderBoard();
}

function deleteTicket(id) {
  const board = activeBoard();
  const boardIndex = state.activeBoardIndex;
  const ticket = board.tickets.find(t => t.id === id);
  if (!ticket) return;

  // Store for undo
  const deletedTicket = { ...ticket };
  const deletedIndex = board.columnOrder[ticket.status].indexOf(id);

  // Remove immediately
  board.tickets = board.tickets.filter(t => t.id !== id);
  for (const status of STATUSES) {
    board.columnOrder[status] = board.columnOrder[status].filter(tid => tid !== id);
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

  showToast("Ticket deleted", {
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

function openNewModal(defaultStatus = "todo") {
  document.getElementById("modal-title").textContent = "New Ticket";
  document.getElementById("ticket-id").value = "";
  document.getElementById("ticket-title").value = "";
  document.getElementById("ticket-desc").value = "";
  document.getElementById("ticket-prompt").value = "";
  document.getElementById("modal-delete").style.display = "none";
  setStatusValue(defaultStatus);
  document.querySelector('input[name="priority"][value="medium"]').checked = true;
  renderLabelChips([]);
  resetCopyButton();
  showModal();
}

function openEditModal(id) {
  const board = activeBoard();
  const ticket = board.tickets.find(t => t.id === id);
  if (!ticket) return;

  document.getElementById("modal-title").textContent = "Edit " + ticket.id;
  document.getElementById("ticket-id").value = ticket.id;
  document.getElementById("ticket-title").value = ticket.title;
  document.getElementById("ticket-desc").value = ticket.description || "";
  document.getElementById("ticket-prompt").value = ticket.prompt || "";
  document.getElementById("modal-delete").style.display = "";
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

  for (const status of STATUSES) {
    const el = document.getElementById("col-" + status);
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
  for (const status of STATUSES) {
    const container = document.getElementById("col-" + status);
    container.querySelectorAll(".column__empty").forEach(el => el.remove());
  }

  // Rebuild columnOrder from DOM
  for (const status of STATUSES) {
    const container = document.getElementById("col-" + status);
    const cards = container.querySelectorAll(".ticket-card");
    board.columnOrder[status] = Array.from(cards).map(c => c.dataset.id);
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
  for (const status of STATUSES) {
    const container = document.getElementById("col-" + status);
    if (board.columnOrder[status].length === 0) {
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

      // Detect v1/v2 format (has tickets + columnOrder at root)
      if (data && data.tickets && data.columnOrder && (!data.version || data.version <= 2)) {
        data = migrateState(data);
        if (!data) {
          showToast("Unsupported board version");
          return;
        }
      }

      // Validate v3 format
      if (!data || !Array.isArray(data.boards) || data.boards.length === 0) {
        // Try migrating if it looks like v1/v2
        if (data && data.tickets && data.columnOrder) {
          data = migrateState(data);
          if (!data) {
            showToast("Invalid board file");
            return;
          }
        } else {
          showToast("Invalid board file");
          return;
        }
      }

      // Migrate if needed
      if (data.version !== CURRENT_VERSION) {
        data = migrateState(data);
        if (!data) {
          showToast("Unsupported board version");
          return;
        }
      }

      pendingImportData = data;
      showImportDialog();
    } catch (err) {
      showToast("Failed to import: invalid JSON");
    }
  };
  reader.readAsText(file);
}

function showImportDialog() {
  const dialog = document.getElementById("import-dialog-backdrop");
  if (dialog) {
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
  }
  pendingImportData = null;
}

function handleImportReplace() {
  if (!pendingImportData) return;
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

function handleImportAddBoards() {
  if (!pendingImportData) return;
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

  document.getElementById("import-replace").addEventListener("click", handleImportReplace);
  document.getElementById("import-add").addEventListener("click", handleImportAddBoards);
  document.getElementById("import-cancel").addEventListener("click", closeImportDialog);

  backdrop.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeImportDialog();
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

function initQuickAdd() {
  document.querySelectorAll(".quickadd-input").forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const title = input.value.trim();
        if (!title) return;
        const status = input.dataset.status;
        createTicket({ title, status });
        input.value = "";
      }
    });
  });
}

// ===== Keyboard Shortcuts =====

function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (e.key === "Escape") {
      const importDialog = document.getElementById("import-dialog-backdrop");
      if (importDialog && importDialog.classList.contains("active")) {
        closeImportDialog();
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
  const labels = { "todo": "Todo", "in-progress": "In Progress", "testing": "Testing", "done": "Done" };
  label.textContent = labels[value] || value;
  dropdown.className = "status-dropdown status-dropdown--" + value;
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
  document.getElementById("btn-new-ticket").addEventListener("click", () => openNewModal());
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

const SIDEBAR_KEY = "fakejira-sidebar";

function initSidebar() {
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  if (collapsed) document.body.classList.add("sidebar-collapsed");

  document.getElementById("btn-sidebar-toggle").addEventListener("click", toggleSidebar);
}

function toggleSidebar() {
  document.body.classList.toggle("sidebar-collapsed");
  const isCollapsed = document.body.classList.contains("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_KEY, isCollapsed ? "collapsed" : "open");
}

// ===== Column Resize =====

const COL_WIDTHS_KEY = "fakejira-col-widths";

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

// ===== Init =====

function init() {
  initEvents();
  initCopyButton();
  initQuickAdd();
  initKeyboard();
  initMissionBanner();
  initSidebar();
  initProjectTitle();
  renderTabs();
  renderBoard();
  initColumnResize();
}

document.addEventListener("DOMContentLoaded", init);
