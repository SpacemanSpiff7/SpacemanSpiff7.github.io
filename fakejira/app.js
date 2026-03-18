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
      if (settingsMode === "board" && settingsBoardIndex === index) {
        closeSettingsDrawer();
        renderBoard();
        renderTabs();
      } else {
        openBoardSettings(index);
      }
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
  if (typeof sa === 'function') sa('board_create');
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
  if (typeof sa === 'function') sa('ticket_create', { status: status });
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
  const ticket = board.tickets.find(t => t.id === id);
  if (!ticket) return;

  const canceledCol = boardColumns().find(c => c.id === "canceled");
  const canceledId = canceledCol ? canceledCol.id : boardColumns()[boardColumns().length - 1].id;

  // If not in canceled column, move there instead of deleting
  if (ticket.status !== canceledId) {
    moveTicketToColumn(id, canceledId);
    const ticketLabel = ticket.title.length > 28
      ? ticket.title.slice(0, 27) + "\u2026"
      : ticket.title;
    showToast("Moved \u201c" + ticketLabel + "\u201d to Canceled");
    return;
  }

  // Already in canceled — confirm permanent deletion
  showConfirmDialog({
    title: "Delete ticket?",
    message: "\"" + ticket.title + "\" will be permanently deleted.",
    confirmLabel: "Delete",
    onConfirm: () => permanentlyDeleteTicket(id)
  });
}

function moveTicketToColumn(id, targetStatus) {
  const board = activeBoard();
  const ticket = board.tickets.find(t => t.id === id);
  if (!ticket) return;

  const oldStatus = ticket.status;
  if (oldStatus === targetStatus) return;

  // Remove from old column
  if (board.columnOrder[oldStatus]) {
    board.columnOrder[oldStatus] = board.columnOrder[oldStatus].filter(tid => tid !== id);
  }

  // Add to target column
  if (!board.columnOrder[targetStatus]) board.columnOrder[targetStatus] = [];
  board.columnOrder[targetStatus].push(id);

  ticket.status = targetStatus;
  ticket.updatedAt = new Date().toISOString();

  saveBoardState();
  renderBoard();
}

function permanentlyDeleteTicket(id) {
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

// ===== Confirm Dialog =====

function showConfirmDialog({ title, message, confirmLabel, onConfirm }) {
  // Remove any existing confirm dialog
  const existing = document.getElementById("confirm-dialog-backdrop");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop confirm-backdrop";
  backdrop.id = "confirm-dialog-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "confirm-title");

  const h2 = document.createElement("h2");
  h2.id = "confirm-title";
  h2.textContent = title;
  dialog.appendChild(h2);

  const p = document.createElement("p");
  p.className = "confirm-dialog__message";
  p.textContent = message;
  dialog.appendChild(p);

  const actions = document.createElement("div");
  actions.className = "confirm-dialog__actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn--ghost";
  cancelBtn.textContent = "Cancel";

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "btn btn--danger";
  confirmBtn.textContent = confirmLabel || "Confirm";

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  dialog.appendChild(actions);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  // Force reflow then show
  backdrop.offsetHeight;
  backdrop.classList.add("confirm-backdrop--visible");

  let isClosed = false;
  function cleanup() {
    document.removeEventListener("keydown", onKey);
  }

  function close() {
    if (isClosed) return;
    isClosed = true;
    cleanup();
    backdrop.classList.remove("confirm-backdrop--visible");
    backdrop.addEventListener("transitionend", () => backdrop.remove(), { once: true });
    // Fallback removal
    setTimeout(() => { if (backdrop.parentNode) backdrop.remove(); }, 300);
  }

  cancelBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  confirmBtn.addEventListener("click", () => {
    close();
    onConfirm();
  });

  // Focus confirm button for keyboard access
  confirmBtn.focus();

  // Escape to cancel
  function onKey(e) {
    if (e.key === "Escape") {
      close();
    }
  }
  document.addEventListener("keydown", onKey);
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
  targetColumn: null,
  trackingActive: false,
  precisionActive: false,
  hoverTimer: null,
};
const PRECISION_DELAY = 450;

function clearPrecisionTimer() {
  if (!dragState.hoverTimer) return;
  clearTimeout(dragState.hoverTimer);
  dragState.hoverTimer = null;
}

function clearDropTargetHighlights() {
  document.querySelectorAll(".column--drop-target").forEach((column) => {
    column.classList.remove("column--drop-target");
  });
  document.querySelectorAll(".column__cards").forEach((cards) => {
    cards.classList.remove("drop-target-bottom", "precision-active");
    delete cards.dataset.dropLabel;
  });
}

function setActiveDropTarget(cardsEl, options = {}) {
  const { precision = false } = options;
  clearDropTargetHighlights();
  if (!cardsEl) return;
  const column = cardsEl.closest(".column");
  if (!column) return;
  const status = column.dataset.status;
  const columnConfig = boardColumns().find((col) => col.id === status);
  if (!columnConfig) return;
  column.classList.add("column--drop-target");
  if (precision) {
    cardsEl.classList.add("precision-active");
  }
  cardsEl.dataset.dropLabel = "Move to " + columnConfig.name;
  dragState.targetColumn = cardsEl.id;
}

function getColumnCardsFromNode(node) {
  const column = node && node.closest ? node.closest(".column") : null;
  if (!column || !column.dataset.status) return null;
  if ("col-" + column.dataset.status === dragState.sourceColumn) return null;
  return column.querySelector(".column__cards");
}

function getEventClientPoint(evt) {
  const original = evt && evt.originalEvent ? evt.originalEvent : evt;
  if (!original) return null;
  if (original.changedTouches && original.changedTouches.length > 0) {
    return {
      x: original.changedTouches[0].clientX,
      y: original.changedTouches[0].clientY
    };
  }
  if (typeof original.clientX === "number" && typeof original.clientY === "number") {
    return {
      x: original.clientX,
      y: original.clientY
    };
  }
  return null;
}

function getReleaseTargetInfo(evt) {
  const point = getEventClientPoint(evt);
  if (!point) return null;
  const el = document.elementFromPoint(point.x, point.y);
  if (!el) return null;
  const column = el.closest(".column");
  if (!column) return null;
  const cards = column.querySelector(".column__cards");
  if (!cards) return null;
  return {
    column,
    cards,
    insideCards: !!el.closest(".column__cards")
  };
}

function restoreDraggedItemToSource(evt) {
  const sourceCards = Array.from(evt.from.querySelectorAll(".ticket-card"));
  if (evt.oldIndex >= sourceCards.length) {
    evt.from.appendChild(evt.item);
    return;
  }
  evt.from.insertBefore(evt.item, sourceCards[evt.oldIndex]);
}

function handleGlobalDragPointerMove(event) {
  if (!dragState.trackingActive) return;
  const point = getEventClientPoint(event);
  if (!point) return;
  const el = document.elementFromPoint(point.x, point.y);
  const cards = getColumnCardsFromNode(el);
  if (!cards) {
    clearPrecisionTimer();
    dragState.precisionActive = false;
    clearDropTargetHighlights();
    dragState.targetColumn = null;
    return;
  }
  const isInsideCards = !!(el && el.closest(".column__cards"));
  if (dragState.targetColumn !== cards.id) {
    clearPrecisionTimer();
    dragState.precisionActive = false;
    if (isInsideCards) {
      dragState.hoverTimer = setTimeout(() => {
        dragState.precisionActive = true;
        setActiveDropTarget(cards, { precision: true });
      }, PRECISION_DELAY);
    }
  }

  if (!isInsideCards) {
    clearPrecisionTimer();
    dragState.precisionActive = false;
  } else if (!dragState.precisionActive && !dragState.hoverTimer) {
    dragState.hoverTimer = setTimeout(() => {
      dragState.precisionActive = true;
      setActiveDropTarget(cards, { precision: true });
    }, PRECISION_DELAY);
  }

  setActiveDropTarget(cards, { precision: dragState.precisionActive });
}

function startDragTracking() {
  dragState.trackingActive = true;
  document.addEventListener("mousemove", handleGlobalDragPointerMove);
  document.addEventListener("touchmove", handleGlobalDragPointerMove, { passive: true });
}

function stopDragTracking() {
  dragState.trackingActive = false;
  document.removeEventListener("mousemove", handleGlobalDragPointerMove);
  document.removeEventListener("touchmove", handleGlobalDragPointerMove);
}

function resetDragState() {
  stopDragTracking();
  clearPrecisionTimer();
  clearDropTargetHighlights();
  dragState.sourceColumn = null;
  dragState.currentColumn = null;
  dragState.targetColumn = null;
  dragState.trackingActive = false;
  dragState.precisionActive = false;
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
        startDragTracking();
      },
      onMove: function(evt) {
        const targetCol = evt.to.id;
        const isCrossColumn = targetCol !== dragState.sourceColumn;

        if (!isCrossColumn) {
          clearDropTargetHighlights();
          dragState.currentColumn = targetCol;
          return true;
        }

        if (targetCol !== dragState.currentColumn) {
          dragState.currentColumn = targetCol;
        }

        const directTarget = getColumnCardsFromNode(evt.related || evt.to);
        if (directTarget) {
          setActiveDropTarget(directTarget, { precision: dragState.precisionActive });
        } else {
          setActiveDropTarget(evt.to, { precision: dragState.precisionActive });
        }
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
  const releaseTarget = isCrossColumn ? getReleaseTargetInfo(evt) : null;
  const keepPrecisePlacement = releaseTarget
    && releaseTarget.insideCards
    && dragState.precisionActive
    && dragState.targetColumn === releaseTarget.cards.id;

  if (isCrossColumn) {
    if (!releaseTarget || releaseTarget.cards.id === dragState.sourceColumn) {
      restoreDraggedItemToSource(evt);
    } else if (!keepPrecisePlacement) {
      releaseTarget.cards.appendChild(evt.item);
    }
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
    const oldStatus = ticket.status;
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
    if (typeof sa === 'function') sa('ticket_move', { from_column: oldStatus, to_column: newStatus });
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
  if (typeof sa === 'function') sa('board_export', { ticket_count: activeBoard().tickets.length });
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

      if (!Array.isArray(data.boards) || data.boards.length === 0) {
        if (!Array.isArray(data.tickets)) {
          const keys = Object.keys(data).join(", ");
          showToast("Import failed: expected boards or tickets, found: " + (keys || "empty object"));
          return;
        }
      }

      const normalized = normalizeState(data);
      if (!normalized) {
        const srcVersion = typeof data.version === "number" ? "v" + data.version : "unknown format";
        const versionHint = typeof data.version === "number" && data.version > CURRENT_VERSION
          ? ". This build may be cached or out of date."
          : "";
        showToast("Import failed: unsupported or invalid project data (" + srcVersion + ")" + versionHint);
        return;
      }

      pendingImportData = normalized;
      showImportDialog();
    } catch (err) {
      const message = err && err.name === "SyntaxError"
        ? "invalid JSON"
        : describeImportError(err);
      showToast("Import failed: " + message);
    }
  };
  reader.readAsText(file);
}

function describeImportError(err) {
  if (!err) return "unknown error";
  if (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return "browser storage is full";
  }
  if (err.name === "SecurityError") {
    return "browser storage is unavailable in this browser context";
  }
  return err.message || "unknown error";
}

function rollbackImportState(oldState) {
  state = oldState;
  try {
    saveBoardState();
  } catch (rollbackErr) {
    console.error("Failed to roll back import state:", rollbackErr);
  }
  try {
    renderBoard();
    renderTabs();
    updateProjectTitleUI();
  } catch (renderErr) {
    console.error("Failed to re-render after import rollback:", renderErr);
  }
}

function showImportActionError(action, err) {
  console.error("Import failed while " + action + ":", err);
  showToast("Import failed while " + action + ": " + describeImportError(err));
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
  const oldState = cloneStateData(state);
  const board = activeBoard();
  const colIds = new Set(board.columns.map(c => c.id));
  const prioIds = new Set(board.priorities.map(p => p.id));
  let count = 0;
  try {
    for (const importedBoard of pendingImportData.boards) {
      for (const ticket of importedBoard.tickets) {
        const newId = generateId();
        const newTicket = { ...ticket, id: newId };
        newTicket.status = colIds.has(newTicket.status) ? newTicket.status : board.columns[0].id;
        newTicket.priority = prioIds.has(newTicket.priority) ? newTicket.priority : board.priorities[0].id;
        board.tickets.push(newTicket);
        if (!board.columnOrder[newTicket.status]) board.columnOrder[newTicket.status] = [];
        board.columnOrder[newTicket.status].push(newId);
        count++;
      }
    }

    saveBoardState();
    renderBoard();
    renderTabs();
    closeImportDialog();
  } catch (err) {
    rollbackImportState(oldState);
    showImportActionError("adding imported tickets", err);
    return;
  }

  if (typeof sa === 'function') sa('board_import', { import_mode: 'add_to_board' });
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
  const oldState = cloneStateData(state);
  try {
    state = pendingImportData;
    saveBoardState();
    renderBoard();
    renderTabs();
    updateProjectTitleUI();
    closeImportDialog();
  } catch (err) {
    rollbackImportState(oldState);
    showImportActionError("replacing the current project", err);
    return;
  }

  if (typeof sa === 'function') sa('board_import', { import_mode: 'new_project' });
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
  const oldState = cloneStateData(state);
  const importedBoards = pendingImportData.boards;

  // Regenerate board IDs to avoid collisions
  const existingTitles = state.boards.map(b => b.title).concat(state.title);
  try {
    for (const board of importedBoards) {
      board.id = generateBoardId();
      // Avoid duplicate titles within the project
      if (existingTitles.includes(board.title)) {
        board.title = randomName(existingTitles);
      }
      existingTitles.push(board.title);
      state.boards.push(board);
    }

    saveBoardState();
    renderTabs();
    renderBoard();
    closeImportDialog();
  } catch (err) {
    rollbackImportState(oldState);
    showImportActionError("adding imported boards", err);
    return;
  }

  if (typeof sa === 'function') sa('board_import', { import_mode: 'add_boards' });
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
      const copy = cloneStateData(state);
      copy.boards.forEach(b => { b.id = generateBoardId(); });
      copy.title = copy.title + " (copy)";
      const normalizedCopy = normalizeState(copy);
      if (!normalizedCopy) {
        showToast("Project copy failed");
        return;
      }
      localStorage.setItem(projectStorageKey(id), JSON.stringify(normalizedCopy));
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

  if (window.innerWidth > 640) {
    initLedTicker(title);
  } else {
    initMobileBanner(title);
  }
}

function initMobileBanner(titleEl) {
  const banner = document.getElementById("mission-banner");
  const quoteEl = document.getElementById("mission-quote");

  titleEl.addEventListener("click", () => {
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

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initLedTicker(titleEl) {
  // Build DOM -- append to titleEl so left:100% positions right of title
  const drawer = document.createElement("div");
  drawer.className = "led-ticker-drawer";
  const board = document.createElement("div");
  board.className = "led-ticker-board";
  const text = document.createElement("span");
  text.className = "led-ticker-text";
  board.appendChild(text);
  drawer.appendChild(board);
  titleEl.appendChild(drawer);

  // Measure widest quote to size the board
  const measure = document.createElement("span");
  measure.className = "led-ticker-text";
  measure.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;";
  board.appendChild(measure);
  let maxWidth = 0;
  for (const q of MISSION_QUOTES) {
    measure.textContent = q;
    const w = measure.offsetWidth;
    if (w > maxWidth) maxWidth = w;
  }
  measure.remove();

  // Size to widest quote + padding, but don't overlap header action buttons
  const naturalWidth = maxWidth + 140;
  function calcBoardWidth() {
    const actions = document.querySelector(".header__actions");
    const titleRect = titleEl.getBoundingClientRect();
    const actionsLeft = actions ? actions.getBoundingClientRect().left : titleRect.right + naturalWidth;
    const available = actionsLeft - titleRect.right - 36;
    return Math.max(100, Math.min(naturalWidth, available));
  }
  let boardWidth = calcBoardWidth();
  board.style.width = boardWidth + "px";
  drawer.style.setProperty("--board-width", boardWidth + "px");

  window.addEventListener("resize", () => {
    boardWidth = calcBoardWidth();
    board.style.width = boardWidth + "px";
    drawer.style.setProperty("--board-width", boardWidth + "px");
  });

  // State
  let isOpen = false;
  let transitioning = false;
  let shuffledQuotes = [];
  let quoteIndex = 0;
  let timeoutIds = [];

  function clearAllTimeouts() {
    timeoutIds.forEach(id => clearTimeout(id));
    timeoutIds = [];
  }

  function schedule(fn, delay) {
    const id = setTimeout(fn, delay);
    timeoutIds.push(id);
    return id;
  }

  function showQuote() {
    if (!isOpen) return;
    const quote = shuffledQuotes[quoteIndex];
    text.textContent = quote;

    requestAnimationFrame(() => {
      const textWidth = text.offsetWidth;
      const centeredX = (boardWidth - textWidth) / 2;

      // Start off-screen right
      text.style.transition = "none";
      text.style.transform = "translateX(" + boardWidth + "px)";

      // Force reflow
      text.offsetHeight;

      // Scroll to center
      text.style.transition = "transform 2400ms linear";
      text.style.transform = "translateX(" + centeredX + "px)";

      // Pause at center, then flash, then exit left
      schedule(() => {
        if (!isOpen) return;
        text.classList.add("led-ticker-text--flash");
        schedule(() => {
          text.classList.remove("led-ticker-text--flash");

          schedule(() => {
            if (!isOpen) return;
            text.style.transition = "transform 2400ms linear";
            text.style.transform = "translateX(" + (-textWidth - 20) + "px)";

            schedule(() => {
              if (!isOpen) return;
              quoteIndex++;
              if (quoteIndex >= shuffledQuotes.length) {
                shuffledQuotes = shuffleArray(MISSION_QUOTES);
                quoteIndex = 0;
              }
              showQuote();
            }, 2500);
          }, 150);
        }, 150);
      }, 3900);
    });
  }

  // Visibility change: pause/resume
  document.addEventListener("visibilitychange", () => {
    if (!isOpen) return;
    if (document.hidden) {
      clearAllTimeouts();
    } else {
      schedule(() => showQuote(), 300);
    }
  });

  titleEl.addEventListener("click", () => {
    if (transitioning) return;

    if (!isOpen) {
      isOpen = true;
      transitioning = true;
      drawer.classList.add("led-ticker-drawer--open");

      shuffledQuotes = shuffleArray(MISSION_QUOTES);
      quoteIndex = 0;

      schedule(() => {
        transitioning = false;
        showQuote();
      }, 500);
    } else {
      isOpen = false;
      transitioning = true;
      clearAllTimeouts();
      drawer.classList.remove("led-ticker-drawer--open");

      schedule(() => {
        transitioning = false;
        text.style.transition = "none";
        text.style.transform = "translateX(100%)";
        text.textContent = "";
      }, 500);
    }
  });
}

// ===== Sidebar =====

const THEME_KEY = "agilethis-theme";
const SIDEBAR_KEY = "agilethis-sidebar";

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch (e) {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }
}

function syncThemeToggle(theme) {
  const button = document.getElementById("btn-theme-toggle");
  const label = document.getElementById("theme-toggle-label");
  if (!button || !label) return;

  const isLight = theme === "light";
  const action = isLight ? "Switch to dark mode" : "Switch to light mode";
  button.setAttribute("aria-pressed", String(isLight));
  button.setAttribute("aria-label", action);
  button.title = action;
  label.textContent = isLight ? "Dark" : "Light";
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (e) {}
  syncThemeToggle(nextTheme);
}

function toggleTheme() {
  applyTheme(getStoredTheme() === "light" ? "dark" : "light");
}

function initTheme() {
  applyTheme(getStoredTheme());

  const button = document.getElementById("btn-theme-toggle");
  if (button) {
    button.addEventListener("click", toggleTheme);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === THEME_KEY) {
      applyTheme(event.newValue === "light" ? "light" : "dark");
    }
  });
}

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

  initTheme();
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

function executeBulkDelete() {
  const board = activeBoard();
  const ids = Array.from(selectedTicketIds);
  if (ids.length === 0) return;

  const canceledCol = boardColumns().find(c => c.id === "canceled");
  const canceledId = canceledCol ? canceledCol.id : boardColumns()[boardColumns().length - 1].id;

  // Split into tickets already in canceled vs not
  const inCanceled = [];
  const notInCanceled = [];
  for (const id of ids) {
    const ticket = board.tickets.find(t => t.id === id);
    if (!ticket) continue;
    if (ticket.status === canceledId) {
      inCanceled.push(id);
    } else {
      notInCanceled.push(id);
    }
  }

  // Move non-canceled tickets to canceled
  if (notInCanceled.length > 0) {
    for (const id of notInCanceled) {
      const ticket = board.tickets.find(t => t.id === id);
      if (!ticket) continue;
      const oldStatus = ticket.status;
      if (board.columnOrder[oldStatus]) {
        board.columnOrder[oldStatus] = board.columnOrder[oldStatus].filter(tid => tid !== id);
      }
      if (!board.columnOrder[canceledId]) board.columnOrder[canceledId] = [];
      board.columnOrder[canceledId].push(id);
      ticket.status = canceledId;
      ticket.updatedAt = new Date().toISOString();
    }
    saveBoardState();
    clearSelection();
    renderBoard();
    showToast(notInCanceled.length + " ticket" + (notInCanceled.length !== 1 ? "s" : "") + " moved to Canceled");
  }

  // Permanently delete canceled tickets (with confirmation)
  if (inCanceled.length > 0) {
    const suffix = inCanceled.length === 1 ? "" : "s";
    showConfirmDialog({
      title: "Delete " + inCanceled.length + " ticket" + suffix + "?",
      message: inCanceled.length === 1
        ? "This ticket will be permanently deleted."
        : inCanceled.length + " tickets will be permanently deleted.",
      confirmLabel: "Delete",
      onConfirm: () => {
        for (const id of inCanceled) {
          permanentlyDeleteTicket(id);
        }
        clearSelection();
        showToast(inCanceled.length + " ticket" + suffix + " deleted");
      }
    });
  }
}

function initBulkBar() {
  const clearBtn = document.getElementById("bulk-clear");
  if (clearBtn) clearBtn.addEventListener("click", clearSelection);

  const deleteBtn = document.getElementById("bulk-delete");
  if (deleteBtn) deleteBtn.addEventListener("click", executeBulkDelete);

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
