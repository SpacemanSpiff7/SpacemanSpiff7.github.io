// ===== Constants =====
const STORAGE_KEY = "fakejira-board";
const CURRENT_VERSION = 2;
const STATUSES = ["todo", "in-progress", "testing", "done"];
const LABEL_PRESETS = ["bug", "feature", "ui", "backend", "urgent"];

// ===== State =====

let pendingDelete = null; // for undo

function defaultState() {
  return {
    version: CURRENT_VERSION,
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

  if (data.version !== CURRENT_VERSION) return null;
  return data;
}

function loadBoardState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateState(parsed);
      if (migrated && migrated.columnOrder) {
        for (const s of STATUSES) {
          if (!Array.isArray(migrated.columnOrder[s])) {
            migrated.columnOrder[s] = [];
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
  for (const status of STATUSES) {
    const container = document.getElementById("col-" + status);
    container.innerHTML = "";

    const ids = state.columnOrder[status];
    if (ids.length === 0) {
      const empty = document.createElement("div");
      empty.className = "column__empty";
      empty.innerHTML = ICONS.empty
        + '<span>No tickets</span>'
        + '<span class="column__empty-hint">Quick-add below or press N</span>';
      container.appendChild(empty);
    } else {
      ids.forEach((id, index) => {
        const ticket = state.tickets.find(t => t.id === id);
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
  for (const status of STATUSES) {
    const badge = document.querySelector(`[data-count="${status}"]`);
    if (badge) {
      const newCount = String(state.columnOrder[status].length);
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

// ===== CRUD =====

function createTicket({ title, description = "", status = "todo", priority = "medium", labels = [], prompt = "" }) {
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
  state.tickets.push(ticket);
  state.columnOrder[status].push(ticket.id);
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
  const ticket = state.tickets.find(t => t.id === id);
  if (!ticket) return;

  const oldStatus = ticket.status;

  Object.assign(ticket, updates, { updatedAt: new Date().toISOString() });

  if (updates.status && updates.status !== oldStatus) {
    state.columnOrder[oldStatus] = state.columnOrder[oldStatus].filter(tid => tid !== id);
    if (!state.columnOrder[updates.status].includes(id)) {
      state.columnOrder[updates.status].push(id);
    }
  }

  saveBoardState();
  renderBoard();
}

function deleteTicket(id) {
  const ticket = state.tickets.find(t => t.id === id);
  if (!ticket) return;

  // Store for undo
  const deletedTicket = { ...ticket };
  const deletedIndex = state.columnOrder[ticket.status].indexOf(id);

  // Remove immediately
  state.tickets = state.tickets.filter(t => t.id !== id);
  for (const status of STATUSES) {
    state.columnOrder[status] = state.columnOrder[status].filter(tid => tid !== id);
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
    timeout: undoTimeout
  };

  showToast("Ticket deleted", {
    undo: () => {
      clearTimeout(undoTimeout);
      // Restore ticket
      state.tickets.push(pendingDelete.ticket);
      const col = state.columnOrder[pendingDelete.ticket.status];
      const idx = Math.min(pendingDelete.index, col.length);
      col.splice(idx, 0, pendingDelete.ticket.id);
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
  setStatusValue(defaultStatus);
  document.querySelector('input[name="priority"][value="medium"]').checked = true;
  renderLabelChips([]);
  resetCopyButton();
  showModal();
}

function openEditModal(id) {
  const ticket = state.tickets.find(t => t.id === id);
  if (!ticket) return;

  document.getElementById("modal-title").textContent = "Edit " + ticket.id;
  document.getElementById("ticket-id").value = ticket.id;
  document.getElementById("ticket-title").value = ticket.title;
  document.getElementById("ticket-desc").value = ticket.description || "";
  document.getElementById("ticket-prompt").value = ticket.prompt || "";
  setStatusValue(ticket.status);

  const radio = document.querySelector(`input[name="priority"][value="${ticket.priority}"]`);
  if (radio) radio.checked = true;

  renderLabelChips(ticket.labels || []);
  resetCopyButton();
  showModal();
}

function renderLabelChips(selectedLabels) {
  const container = document.getElementById("label-chips");
  container.innerHTML = "";
  for (const label of state.labelPresets) {
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
  document.body.style.overflow = "hidden";
  document.getElementById("ticket-title").focus();
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("active");
  document.getElementById("board").removeAttribute("inert");
  document.querySelector(".header").removeAttribute("inert");
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
      onEnd: handleDragEnd,
    });
    sortableInstances.push(instance);
  }
}

function handleDragEnd(evt) {
  // Remove leftover empty-state placeholders
  for (const status of STATUSES) {
    const container = document.getElementById("col-" + status);
    container.querySelectorAll(".column__empty").forEach(el => el.remove());
  }

  // Rebuild columnOrder from DOM
  for (const status of STATUSES) {
    const container = document.getElementById("col-" + status);
    const cards = container.querySelectorAll(".ticket-card");
    state.columnOrder[status] = Array.from(cards).map(c => c.dataset.id);
  }

  // Update ticket status if moved to a different column
  const ticketId = evt.item.dataset.id;
  const newStatus = evt.to.id.replace("col-", "");
  const ticket = state.tickets.find(t => t.id === ticketId);
  if (ticket && ticket.status !== newStatus) {
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
  }

  saveBoardState();

  // Re-add empty states to now-empty columns
  for (const status of STATUSES) {
    const container = document.getElementById("col-" + status);
    if (state.columnOrder[status].length === 0) {
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
  a.download = "agile-this-board-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Board exported");
}

function importBoard(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || !data.tickets || !data.columnOrder) {
        showToast("Invalid board file");
        return;
      }
      const migrated = migrateState(data);
      if (!migrated) {
        showToast("Unsupported board version");
        return;
      }
      // Show undo-style confirmation
      const oldState = JSON.parse(JSON.stringify(state));
      state = migrated;
      saveBoardState();
      renderBoard();
      showToast("Board imported", {
        undo: () => {
          state = oldState;
          saveBoardState();
          renderBoard();
          showToast("Import undone");
        }
      });
    } catch (err) {
      showToast("Failed to import: invalid JSON");
    }
  };
  reader.readAsText(file);
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
  initStatusDropdown();
}

// ===== Init =====

function init() {
  initEvents();
  initCopyButton();
  initQuickAdd();
  initKeyboard();
  renderBoard();
}

document.addEventListener("DOMContentLoaded", init);
