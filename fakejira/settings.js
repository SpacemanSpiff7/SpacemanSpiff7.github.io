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
  for (const sortable of settingsSortables) sortable.destroy();
  settingsSortables = [];
  settingsMode = null;
  settingsBoardIndex = null;
}

function renderSettingsDrawer() {
  const body = document.getElementById("settings-body");
  const title = document.getElementById("settings-title");
  body.innerHTML = "";
  for (const sortable of settingsSortables) sortable.destroy();
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

  columns.forEach((col, index) => {
    list.appendChild(createColumnItem(col, index, columns, target));
  });

  section.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.className = "settings-add-btn";
  addBtn.textContent = "+ Add Column";
  addBtn.addEventListener("click", () => {
    const newCol = { id: generateColumnId("column"), name: "New Column", color: "#818cf8" };
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
  const otherCols = columns.filter((_, colIndex) => colIndex !== index);

  const body = document.getElementById("settings-body");
  body.innerHTML = "";

  const dialog = document.createElement("div");
  dialog.className = "settings-section";
  dialog.innerHTML = `<h3 class="settings-section__title">Move ${ticketIds.length} ticket${ticketIds.length !== 1 ? "s" : ""}</h3>
    <p class="settings-migrate-desc">Column "${col.name}" has tickets. Choose where to move them:</p>`;

  const select = document.createElement("select");
  select.className = "settings-migrate-select";
  for (const otherCol of otherCols) {
    const opt = document.createElement("option");
    opt.value = otherCol.id;
    opt.textContent = otherCol.name;
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
    if (!target.columnOrder[destId]) target.columnOrder[destId] = [];
    for (const ticketId of ticketIds) {
      target.columnOrder[destId].push(ticketId);
      const ticket = target.tickets.find((item) => item.id === ticketId);
      if (ticket) ticket.status = destId;
    }
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
  cancelBtn.addEventListener("click", renderSettingsDrawer);
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

  priorities.forEach((prio, index) => {
    list.appendChild(createPriorityItem(prio, index, priorities, target));
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
      if (target.tickets) {
        const remaining = priorities.filter((_, prioIndex) => prioIndex !== index);
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

function renderLabelsSection(body, labelPresets) {
  const section = document.createElement("div");
  section.className = "settings-section";
  section.innerHTML = '<h3 class="settings-section__title">Label Presets</h3>';

  const chipContainer = document.createElement("div");
  chipContainer.className = "settings-labels";

  for (let i = 0; i < labelPresets.length; i++) {
    const chip = document.createElement("span");
    chip.className = "settings-label-chip";
    chip.textContent = labelPresets[i];
    const remove = document.createElement("button");
    remove.className = "settings-label-chip__remove";
    remove.innerHTML = '<svg viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="2" x2="6" y2="6"/><line x1="6" y1="2" x2="2" y2="6"/></svg>';
    remove.addEventListener("click", () => {
      labelPresets.splice(i, 1);
      saveBoardState();
      renderSettingsDrawer();
    });
    chip.appendChild(remove);
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
  document.querySelectorAll(".color-picker-popup").forEach((el) => el.remove());

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

  const projectGear = document.getElementById("btn-project-settings");
  if (projectGear) projectGear.addEventListener("click", openProjectSettings);
}

document.addEventListener("DOMContentLoaded", init);
