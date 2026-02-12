// editor.js -- Level editor: admin-only UI for creating, testing, and exporting levels
// Depends on: engine.js, solver.js, storage.js, levels.js, screens.js
window.TT = window.TT || {};

(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // Block color palette (cycles through these for auto-assignment)
  // -------------------------------------------------------------------------
  const PALETTE = [
    '#5B7B9F', '#7B6B8F', '#4F7B7B', '#8F6B7B',
    '#5B6B8F', '#6B8F7B', '#7B7B6B', '#6B6B9F'
  ];

  // -------------------------------------------------------------------------
  // Editor state
  // -------------------------------------------------------------------------
  let gridWidth = 5;
  let gridHeight = 5;
  let exit = null;          // { side, position } or null
  let target = null;        // { x, y } or null
  let editorBlocks = [];    // [{ x, y, width, height, color, el }]
  let selectedBlockIndex = -1;
  let selectedTool = null;  // null | 'target' | { width, height }
  let par = 10;
  let colorIndex = 0;
  let editorDrag = null;    // { blockIndex, startGridX, startGridY, startPointerX, startPointerY, el }
  let editorDragMoved = false; // flag to suppress click after drag

  // DOM references
  let boardEl = null;
  let statusEl = null;
  let warningEl = null;
  let jsonOutputEl = null;
  let levelListEl = null;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  TT.editor = { show };

  // -------------------------------------------------------------------------
  // show -- Render the complete editor UI
  // -------------------------------------------------------------------------
  function show(skipReset) {
    if (!skipReset) resetEditorState();

    const root = document.getElementById('game-root');
    root.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'screen screen--editor screen-enter';

    // Header
    const header = document.createElement('h2');
    header.className = 'editor-header';
    header.textContent = 'Level Editor';
    screen.appendChild(header);

    // Main layout
    const layout = document.createElement('div');
    layout.className = 'editor-layout';

    // -- Left column: controls + board --
    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;';

    // Grid size controls
    leftCol.appendChild(buildGridControls());

    // Block toolbar
    leftCol.appendChild(buildToolbar());

    // Board wrapper
    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'editor-board-wrapper';
    boardEl = createEditorBoard();
    boardWrapper.appendChild(boardEl);
    leftCol.appendChild(boardWrapper);

    // Warning text
    warningEl = document.createElement('div');
    warningEl.className = 'editor-warning';
    leftCol.appendChild(warningEl);

    // Status text (solver result)
    statusEl = document.createElement('div');
    statusEl.className = 'editor-status';
    leftCol.appendChild(statusEl);

    // Par + action buttons
    leftCol.appendChild(buildParAndActions());

    layout.appendChild(leftCol);

    // -- Right column: level list + export --
    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;';

    // Level list heading
    const listHeading = document.createElement('div');
    listHeading.style.cssText = 'font-family:Silkscreen,cursive;font-size:0.9rem;';
    listHeading.textContent = 'Levels';
    rightCol.appendChild(listHeading);

    levelListEl = document.createElement('div');
    levelListEl.className = 'editor-level-list';
    rightCol.appendChild(levelListEl);
    renderLevelList();

    // Export buttons
    const exportActions = document.createElement('div');
    exportActions.className = 'editor-actions';

    const exportAllBtn = document.createElement('button');
    exportAllBtn.className = 'btn btn--small';
    exportAllBtn.textContent = 'Export All Levels';
    exportAllBtn.addEventListener('click', exportAllLevels);
    exportActions.appendChild(exportAllBtn);

    const exportCurrentBtn = document.createElement('button');
    exportCurrentBtn.className = 'btn btn--small';
    exportCurrentBtn.textContent = 'Export Current';
    exportCurrentBtn.addEventListener('click', exportCurrentLevel);
    exportActions.appendChild(exportCurrentBtn);

    rightCol.appendChild(exportActions);

    // JSON output textarea
    jsonOutputEl = document.createElement('textarea');
    jsonOutputEl.className = 'editor-json-output';
    jsonOutputEl.readOnly = true;
    jsonOutputEl.placeholder = 'JSON output will appear here...';
    rightCol.appendChild(jsonOutputEl);

    layout.appendChild(rightCol);
    screen.appendChild(layout);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'btn';
    backBtn.textContent = 'Back';
    backBtn.style.marginTop = '12px';
    backBtn.addEventListener('click', () => {
      if (TT.screens && TT.screens.showLevelSelect) {
        TT.screens.showLevelSelect();
      }
    });
    screen.appendChild(backBtn);

    root.appendChild(screen);

    // After restoring from play test, sync input values to match restored state
    if (skipReset) {
      const numInputs = screen.querySelectorAll('input[type="number"]');
      numInputs.forEach(input => {
        if (input.min === '4' && input.max === '8') {
          // Width or Height input — distinguish by label text
          const label = input.parentNode;
          if (label && label.textContent.startsWith('Width')) {
            input.value = gridWidth;
          } else if (label && label.textContent.startsWith('Height')) {
            input.value = gridHeight;
          }
        } else if (input.max === '99') {
          input.value = par;
        }
      });
      renderEditorState();
    }
  }

  // -------------------------------------------------------------------------
  // Reset editor state to defaults
  // -------------------------------------------------------------------------
  function resetEditorState() {
    gridWidth = 5;
    gridHeight = 5;
    exit = null;
    target = null;
    editorBlocks = [];
    selectedBlockIndex = -1;
    selectedTool = null;
    par = 10;
    colorIndex = 0;
  }

  // -------------------------------------------------------------------------
  // Build grid size controls
  // -------------------------------------------------------------------------
  function buildGridControls() {
    const controls = document.createElement('div');
    controls.className = 'editor-controls';

    // Width
    const widthLabel = document.createElement('label');
    widthLabel.textContent = 'Width:';
    const widthInput = document.createElement('input');
    widthInput.type = 'number';
    widthInput.min = 4;
    widthInput.max = 8;
    widthInput.value = gridWidth;
    widthInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (val >= 4 && val <= 8) {
        gridWidth = val;
        rebuildBoard();
      }
    });
    widthLabel.appendChild(widthInput);
    controls.appendChild(widthLabel);

    // Height
    const heightLabel = document.createElement('label');
    heightLabel.textContent = 'Height:';
    const heightInput = document.createElement('input');
    heightInput.type = 'number';
    heightInput.min = 4;
    heightInput.max = 8;
    heightInput.value = gridHeight;
    heightInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (val >= 4 && val <= 8) {
        gridHeight = val;
        rebuildBoard();
      }
    });
    heightLabel.appendChild(heightInput);
    controls.appendChild(heightLabel);

    return controls;
  }

  // -------------------------------------------------------------------------
  // Build block toolbar
  // -------------------------------------------------------------------------
  function buildToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';

    const tools = [
      { label: 'Target', tool: 'target' },
      { label: '1x2', tool: { width: 1, height: 2 } },
      { label: '1x3', tool: { width: 1, height: 3 } },
      { label: '2x1', tool: { width: 2, height: 1 } },
      { label: '3x1', tool: { width: 3, height: 1 } },
      { label: '2x2', tool: { width: 2, height: 2 } }
    ];

    tools.forEach(({ label, tool }) => {
      const item = document.createElement('button');
      item.className = 'editor-toolbar__item';
      item.textContent = label;
      item.dataset.tool = JSON.stringify(tool);
      item.addEventListener('click', () => {
        clearWarning();
        deselectBlock();
        if (selectedTool !== null && JSON.stringify(selectedTool) === JSON.stringify(tool)) {
          // Deselect if clicking same tool
          selectedTool = null;
          updateToolbarHighlight(toolbar);
        } else {
          selectedTool = tool;
          updateToolbarHighlight(toolbar);
        }
      });
      toolbar.appendChild(item);
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'editor-toolbar__item';
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.color = '#8F6B7B';
    deleteBtn.addEventListener('click', () => {
      if (selectedBlockIndex >= 0) {
        editorBlocks.splice(selectedBlockIndex, 1);
        selectedBlockIndex = -1;
        clearWarning();
        renderEditorState();
      } else {
        showWarning('Select a block first');
      }
    });
    toolbar.appendChild(deleteBtn);

    return toolbar;
  }

  // -------------------------------------------------------------------------
  // Update toolbar highlight based on selectedTool
  // -------------------------------------------------------------------------
  function updateToolbarHighlight(toolbar) {
    const items = toolbar.querySelectorAll('.editor-toolbar__item');
    items.forEach(item => {
      const toolStr = item.dataset.tool;
      if (toolStr && JSON.stringify(selectedTool) === toolStr) {
        item.classList.add('editor-toolbar__item--active');
      } else {
        item.classList.remove('editor-toolbar__item--active');
      }
    });
  }

  // -------------------------------------------------------------------------
  // Build par input and action buttons
  // -------------------------------------------------------------------------
  function buildParAndActions() {
    const container = document.createElement('div');
    container.className = 'editor-actions';

    // Par input
    const parLabel = document.createElement('label');
    parLabel.className = 'editor-controls';
    parLabel.textContent = 'Par:';
    const parInput = document.createElement('input');
    parInput.type = 'number';
    parInput.min = 1;
    parInput.max = 99;
    parInput.value = par;
    parInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (val >= 1) par = val;
    });
    parLabel.appendChild(parInput);
    container.appendChild(parLabel);

    // Test button
    const testBtn = document.createElement('button');
    testBtn.className = 'btn btn--small';
    testBtn.textContent = 'Test';
    testBtn.addEventListener('click', runTest);
    container.appendChild(testBtn);

    // Play Test button
    const playBtn = document.createElement('button');
    playBtn.className = 'btn btn--small';
    playBtn.textContent = 'Play Test';
    playBtn.addEventListener('click', playTest);
    container.appendChild(playBtn);

    // Add Level button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn--small';
    addBtn.textContent = 'Add Level';
    addBtn.addEventListener('click', addLevel);
    container.appendChild(addBtn);

    return container;
  }

  // -------------------------------------------------------------------------
  // Create the editor board (a .board element with click handler)
  // -------------------------------------------------------------------------
  function createEditorBoard() {
    const board = document.createElement('div');
    board.className = 'board';
    board.style.setProperty('--grid-cols', gridWidth);
    board.style.setProperty('--grid-rows', gridHeight);
    board.addEventListener('click', onBoardClick);
    return board;
  }

  // -------------------------------------------------------------------------
  // Rebuild the board (when grid size changes or state reloads)
  // -------------------------------------------------------------------------
  function rebuildBoard() {
    if (!boardEl || !boardEl.parentNode) return;
    const wrapper = boardEl.parentNode;

    // Remove old board
    wrapper.removeChild(boardEl);

    // Clear blocks that are out of bounds
    editorBlocks = editorBlocks.filter(b =>
      b.x >= 0 && b.y >= 0 &&
      b.x + b.width <= gridWidth &&
      b.y + b.height <= gridHeight
    );

    // Clear target if out of bounds
    if (target && (target.x >= gridWidth || target.y >= gridHeight)) {
      target = null;
    }

    // Clear exit if out of bounds
    if (exit) {
      if ((exit.side === 'right' || exit.side === 'left') && exit.position >= gridHeight) {
        exit = null;
      } else if ((exit.side === 'top' || exit.side === 'bottom') && exit.position >= gridWidth) {
        exit = null;
      }
    }

    selectedBlockIndex = -1;

    // Create fresh board
    boardEl = createEditorBoard();
    renderEditorState();
    wrapper.appendChild(boardEl);
  }

  // -------------------------------------------------------------------------
  // Render all editor state onto the board (exit, target, blocks)
  // -------------------------------------------------------------------------
  function renderEditorState() {
    if (!boardEl) return;

    // Clear board children (keep only the ::before pseudo)
    boardEl.innerHTML = '';
    boardEl.style.setProperty('--grid-cols', gridWidth);
    boardEl.style.setProperty('--grid-rows', gridHeight);

    // Exit indicator + gap mask
    if (exit) {
      const gapMask = document.createElement('div');
      gapMask.className = `exit-gap-mask exit-gap-mask--${exit.side}`;
      positionExitElement(gapMask, exit);
      boardEl.appendChild(gapMask);

      const indicator = document.createElement('div');
      indicator.className = `exit-indicator exit-indicator--${exit.side}`;
      positionExitElement(indicator, exit);
      boardEl.appendChild(indicator);
    }

    // Target block
    if (target) {
      const el = document.createElement('div');
      el.className = 'block block--target';
      el.style.width = 'calc(var(--cell-size) * 1)';
      el.style.height = 'calc(var(--cell-size) * 1)';
      el.style.transform =
        `translate(calc(var(--cell-size) * ${target.x}), calc(var(--cell-size) * ${target.y}))`;
      el.dataset.editorType = 'target';
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        startTargetDrag(e);
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (editorDragMoved) {
          editorDragMoved = false;
          return;
        }
        deselectBlock();
        selectedTool = null;
        clearWarning();
      });
      boardEl.appendChild(el);
    }

    // Obstacle blocks
    editorBlocks.forEach((block, i) => {
      const el = document.createElement('div');
      el.className = 'block';
      el.style.width = `calc(var(--cell-size) * ${block.width})`;
      el.style.height = `calc(var(--cell-size) * ${block.height})`;
      el.style.transform =
        `translate(calc(var(--cell-size) * ${block.x}), calc(var(--cell-size) * ${block.y}))`;
      el.style.backgroundColor = block.color;
      if (i === selectedBlockIndex) {
        el.style.outline = '2px solid var(--color-target)';
        el.style.outlineOffset = '-2px';
      }
      el.dataset.editorIndex = i;
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        startEditorDrag(i, e);
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        // Suppress click if a drag just moved the block
        if (editorDragMoved) {
          editorDragMoved = false;
          return;
        }
        selectBlock(i);
      });
      block.el = el;
      boardEl.appendChild(el);
    });
  }

  // -------------------------------------------------------------------------
  // Position exit indicator/mask (mirrors engine.js)
  // -------------------------------------------------------------------------
  function positionExitElement(el, exitData) {
    const offset = `calc(var(--cell-size) * ${exitData.position})`;
    if (exitData.side === 'right' || exitData.side === 'left') {
      el.style.top = offset;
    } else {
      el.style.left = offset;
    }
  }

  // -------------------------------------------------------------------------
  // Board click handler -- place tool or set exit
  // -------------------------------------------------------------------------
  function onBoardClick(e) {
    // Ignore clicks on existing blocks (handled by their own listeners)
    if (e.target.closest('.block')) return;

    const rect = boardEl.getBoundingClientRect();
    const cellSize = rect.width / gridWidth;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const col = Math.floor(clickX / cellSize);
    const row = Math.floor(clickY / cellSize);

    // Clamp to grid
    const c = Math.max(0, Math.min(col, gridWidth - 1));
    const r = Math.max(0, Math.min(row, gridHeight - 1));

    clearWarning();

    // Only place exit when clicking near the very edge/border of the board
    // (within 40% of a cell from the outer wall), not on any perimeter cell
    const edgeThreshold = cellSize * 0.4;
    const nearTop = clickY < edgeThreshold;
    const nearBottom = clickY > (cellSize * gridHeight) - edgeThreshold;
    const nearLeft = clickX < edgeThreshold;
    const nearRight = clickX > (cellSize * gridWidth) - edgeThreshold;
    const isEdgeClick = nearTop || nearBottom || nearLeft || nearRight;

    if (selectedTool === null && isEdgeClick) {
      placeExit(c, r, clickX, clickY, cellSize);
      return;
    }

    if (selectedTool === 'target') {
      placeTarget(c, r);
      return;
    }

    if (selectedTool !== null && typeof selectedTool === 'object') {
      placeBlock(c, r, selectedTool.width, selectedTool.height);
      return;
    }

    // Click on empty board with no tool -- deselect
    deselectBlock();
  }

  // -------------------------------------------------------------------------
  // Target block drag-to-reposition
  // -------------------------------------------------------------------------
  function startTargetDrag(e) {
    const rect = boardEl.getBoundingClientRect();
    const cellSize = rect.width / gridWidth;

    editorDrag = {
      blockIndex: -2, // sentinel for target
      startGridX: target.x,
      startGridY: target.y,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      cellSize,
      rect,
      el: e.target
    };
    editorDragMoved = false;

    const onMove = onTargetDragMove;
    const onUp = (ev) => onEditorDragEnd(ev, onMove, onUp);

    e.target.setPointerCapture(e.pointerId);
    e.target.addEventListener('pointermove', onMove);
    e.target.addEventListener('pointerup', onUp);
  }

  function onTargetDragMove(e) {
    if (!editorDrag) return;

    const { startGridX, startGridY, startPointerX, startPointerY, cellSize, el } = editorDrag;

    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;

    let newX = startGridX + Math.round(dx / cellSize);
    let newY = startGridY + Math.round(dy / cellSize);

    // Clamp to grid bounds (target is 1x1)
    newX = Math.max(0, Math.min(newX, gridWidth - 1));
    newY = Math.max(0, Math.min(newY, gridHeight - 1));

    if (newX !== target.x || newY !== target.y) {
      // Check collision with obstacle blocks (use -2 to skip target in isCellOccupied)
      if (!isCellOccupied(newX, newY, 1, 1, -2)) {
        target.x = newX;
        target.y = newY;
        el.style.transform =
          `translate(calc(var(--cell-size) * ${newX}), calc(var(--cell-size) * ${newY}))`;
        editorDragMoved = true;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Editor block drag-to-reposition
  // -------------------------------------------------------------------------
  function startEditorDrag(index, e) {
    const block = editorBlocks[index];
    const rect = boardEl.getBoundingClientRect();
    const cellSize = rect.width / gridWidth;

    editorDrag = {
      blockIndex: index,
      startGridX: block.x,
      startGridY: block.y,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      cellSize,
      rect,
      el: block.el
    };
    editorDragMoved = false;

    const onMove = onEditorDragMove;
    const onUp = (ev) => onEditorDragEnd(ev, onMove, onUp);

    e.target.setPointerCapture(e.pointerId);
    e.target.addEventListener('pointermove', onMove);
    e.target.addEventListener('pointerup', onUp);
  }

  function onEditorDragMove(e) {
    if (!editorDrag) return;

    const { blockIndex, startGridX, startGridY, startPointerX, startPointerY, cellSize, el } = editorDrag;
    const block = editorBlocks[blockIndex];

    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;

    // Compute new grid position
    let newX = startGridX + Math.round(dx / cellSize);
    let newY = startGridY + Math.round(dy / cellSize);

    // Clamp to grid bounds
    newX = Math.max(0, Math.min(newX, gridWidth - block.width));
    newY = Math.max(0, Math.min(newY, gridHeight - block.height));

    // Only update if position changed
    if (newX !== block.x || newY !== block.y) {
      // Check collision with other blocks (exclude self)
      if (!isCellOccupied(newX, newY, block.width, block.height, blockIndex)) {
        block.x = newX;
        block.y = newY;
        el.style.transform =
          `translate(calc(var(--cell-size) * ${newX}), calc(var(--cell-size) * ${newY}))`;
        editorDragMoved = true;
      }
    }
  }

  function onEditorDragEnd(e, onMove, onUp) {
    if (!editorDrag) return;

    e.target.releasePointerCapture(e.pointerId);
    e.target.removeEventListener('pointermove', onMove);
    e.target.removeEventListener('pointerup', onUp);

    const moved = editorDragMoved;
    editorDrag = null;

    // Re-render to ensure clean state if position changed
    if (moved) {
      renderEditorState();
    }
  }

  // -------------------------------------------------------------------------
  // Place exit at an edge cell
  // -------------------------------------------------------------------------
  function placeExit(col, row, clickX, clickY, cellSize) {
    // Determine which edge the click is closest to
    const distTop = row === 0 ? clickY / cellSize : Infinity;
    const distBottom = row === gridHeight - 1 ? 1 - ((clickY - row * cellSize) / cellSize) : Infinity;
    const distLeft = col === 0 ? clickX / cellSize : Infinity;
    const distRight = col === gridWidth - 1 ? 1 - ((clickX - col * cellSize) / cellSize) : Infinity;

    // Simplify: determine side from which edge the cell is on
    let side, position;
    if (col === 0 && row > 0 && row < gridHeight - 1) {
      side = 'left';
      position = row;
    } else if (col === gridWidth - 1 && row > 0 && row < gridHeight - 1) {
      side = 'right';
      position = row;
    } else if (row === 0 && col > 0 && col < gridWidth - 1) {
      side = 'top';
      position = col;
    } else if (row === gridHeight - 1 && col > 0 && col < gridWidth - 1) {
      side = 'bottom';
      position = col;
    } else {
      // Corner cell -- pick based on proximity
      const minDist = Math.min(distTop, distBottom, distLeft, distRight);
      if (minDist === distLeft) { side = 'left'; position = row; }
      else if (minDist === distRight) { side = 'right'; position = row; }
      else if (minDist === distTop) { side = 'top'; position = col; }
      else { side = 'bottom'; position = col; }
    }

    exit = { side, position };
    renderEditorState();
  }

  // -------------------------------------------------------------------------
  // Place or move target block
  // -------------------------------------------------------------------------
  function placeTarget(col, row) {
    // Check overlap with obstacles (use -2 to skip target overlap check since we're replacing it)
    if (isCellOccupied(col, row, 1, 1, -2)) {
      showWarning('Cell occupied by a block');
      return;
    }
    target = { x: col, y: row };
    selectedTool = null;
    // Clear toolbar highlight
    const toolbar = boardEl.parentNode.parentNode.querySelector('.editor-toolbar');
    if (toolbar) updateToolbarHighlight(toolbar);
    renderEditorState();
  }

  // -------------------------------------------------------------------------
  // Place obstacle block
  // -------------------------------------------------------------------------
  function placeBlock(col, row, width, height) {
    // Check bounds
    if (col + width > gridWidth || row + height > gridHeight) {
      showWarning('Block goes out of bounds');
      return;
    }

    // Check overlap with target
    if (target) {
      if (col <= target.x && target.x < col + width &&
          row <= target.y && target.y < row + height) {
        showWarning('Overlaps target block');
        return;
      }
    }

    // Check overlap with other blocks
    if (isCellOccupied(col, row, width, height, -1)) {
      showWarning('Overlaps another block');
      return;
    }

    const color = PALETTE[colorIndex % PALETTE.length];
    colorIndex++;

    editorBlocks.push({ x: col, y: row, width, height, color, el: null });
    renderEditorState();
  }

  // -------------------------------------------------------------------------
  // Check if any cell in a rectangle is occupied (excluding one block index)
  // -------------------------------------------------------------------------
  function isCellOccupied(col, row, width, height, excludeIndex) {
    // Check against other blocks
    for (let i = 0; i < editorBlocks.length; i++) {
      if (i === excludeIndex) continue;
      const b = editorBlocks[i];
      if (rectanglesOverlap(col, row, width, height, b.x, b.y, b.width, b.height)) {
        return true;
      }
    }
    // Check against target (unless we're checking for target placement itself)
    if (target && excludeIndex !== -2) {
      if (rectanglesOverlap(col, row, width, height, target.x, target.y, 1, 1)) {
        return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Rectangle overlap check
  // -------------------------------------------------------------------------
  function rectanglesOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  // -------------------------------------------------------------------------
  // Select / deselect block
  // -------------------------------------------------------------------------
  function selectBlock(index) {
    selectedTool = null;
    const toolbar = boardEl.parentNode.parentNode.querySelector('.editor-toolbar');
    if (toolbar) updateToolbarHighlight(toolbar);
    selectedBlockIndex = index;
    renderEditorState();
  }

  function deselectBlock() {
    if (selectedBlockIndex >= 0) {
      selectedBlockIndex = -1;
      renderEditorState();
    }
  }

  // -------------------------------------------------------------------------
  // Warning / status display
  // -------------------------------------------------------------------------
  function showWarning(msg) {
    if (warningEl) warningEl.textContent = msg;
  }

  function clearWarning() {
    if (warningEl) warningEl.textContent = '';
  }

  function showStatus(msg, solvable) {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.className = 'editor-status ' +
        (solvable ? 'editor-status--solvable' : 'editor-status--unsolvable');
    }
  }

  // -------------------------------------------------------------------------
  // Build level data object from current editor state
  // -------------------------------------------------------------------------
  function buildLevelData(id) {
    return {
      id: id || 1,
      name: 'Custom Level',
      gridWidth,
      gridHeight,
      par,
      exit: exit ? { side: exit.side, position: exit.position } : null,
      target: target ? { x: target.x, y: target.y } : null,
      blocks: editorBlocks.map(b => ({
        x: b.x, y: b.y, width: b.width, height: b.height, color: b.color
      }))
    };
  }

  // -------------------------------------------------------------------------
  // Validate that the level has required components
  // -------------------------------------------------------------------------
  function validateLevel() {
    if (!target) {
      showWarning('Place a target block first');
      return false;
    }
    if (!exit) {
      showWarning('Place an exit first');
      return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Test -- run solver on current level
  // -------------------------------------------------------------------------
  function runTest() {
    clearWarning();
    if (!validateLevel()) return;

    const levelData = buildLevelData(1);
    const result = TT.solver.solve(levelData);

    if (result.solvable) {
      showStatus(`SOLVABLE - Optimal: ${result.optimal} moves`, true);
    } else {
      showStatus('UNSOLVABLE', false);
    }
  }

  // -------------------------------------------------------------------------
  // Play Test -- play the level in engine, return to editor on win/menu
  // -------------------------------------------------------------------------
  function playTest() {
    clearWarning();
    if (!validateLevel()) return;

    const levelData = buildLevelData(999);
    levelData.name = 'Editor Test';

    // Save current editor state so we can restore it
    const savedState = {
      gridWidth, gridHeight, exit, target, par, colorIndex,
      blocks: editorBlocks.map(b => ({
        x: b.x, y: b.y, width: b.width, height: b.height, color: b.color
      }))
    };

    // Set up win callback to return to editor
    TT.engine.onWin = () => {
      restoreEditorState(savedState);
      show(true);
    };

    // Override the Menu button behavior by setting up a handler on screens
    // We use engine.init which builds Reset and Menu buttons
    TT.engine.init(levelData);

    // After engine init, find the Menu button and rewire it to return to editor
    requestAnimationFrame(() => {
      const btns = document.querySelectorAll('.btn-row .btn');
      btns.forEach(btn => {
        if (btn.textContent === 'Menu') {
          // Replace the click handler
          const newBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(newBtn, btn);
          newBtn.addEventListener('click', () => {
            restoreEditorState(savedState);
            show(true);
          });
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Restore editor state from saved snapshot
  // -------------------------------------------------------------------------
  function restoreEditorState(saved) {
    gridWidth = saved.gridWidth;
    gridHeight = saved.gridHeight;
    exit = saved.exit;
    target = saved.target;
    par = saved.par;
    colorIndex = saved.colorIndex;
    editorBlocks = saved.blocks.map(b => ({ ...b, el: null }));
    selectedBlockIndex = -1;
    selectedTool = null;
  }

  // -------------------------------------------------------------------------
  // Add Level -- push current editor state as a new level
  // -------------------------------------------------------------------------
  function addLevel() {
    clearWarning();
    if (!validateLevel()) return;

    // Determine next id
    const maxId = TT.LEVELS.reduce((max, l) => Math.max(max, l.id), 0);
    const newId = maxId + 1;

    const levelData = buildLevelData(newId);
    TT.LEVELS.push(levelData);
    renderLevelList();
    showStatus(`Level ${newId} added`, true);
  }

  // -------------------------------------------------------------------------
  // Export all levels as JSON
  // -------------------------------------------------------------------------
  function exportAllLevels() {
    // Strip runtime properties to produce clean JSON
    const clean = TT.LEVELS.map(l => ({
      id: l.id,
      name: l.name,
      gridWidth: l.gridWidth,
      gridHeight: l.gridHeight,
      par: l.par,
      exit: l.exit,
      target: l.target,
      blocks: l.blocks.map(b => ({
        x: b.x, y: b.y, width: b.width, height: b.height, color: b.color
      }))
    }));
    if (jsonOutputEl) {
      jsonOutputEl.value = JSON.stringify(clean, null, 2);
      jsonOutputEl.select();
    }
  }

  // -------------------------------------------------------------------------
  // Export current level as JSON
  // -------------------------------------------------------------------------
  function exportCurrentLevel() {
    clearWarning();
    if (!validateLevel()) return;

    const levelData = buildLevelData(1);
    if (jsonOutputEl) {
      jsonOutputEl.value = JSON.stringify(levelData, null, 2);
      jsonOutputEl.select();
    }
  }

  // -------------------------------------------------------------------------
  // Level list rendering with drag-and-drop reorder
  // -------------------------------------------------------------------------
  function renderLevelList() {
    if (!levelListEl) return;
    levelListEl.innerHTML = '';

    TT.LEVELS.forEach((level, i) => {
      const item = document.createElement('div');
      item.className = 'editor-level-item';
      item.draggable = true;
      item.dataset.index = i;

      const label = document.createElement('span');
      label.textContent = `Level ${level.id}: ${level.name || 'Untitled'}`;
      item.appendChild(label);

      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn--small';
      loadBtn.textContent = 'Load';
      loadBtn.style.marginLeft = '8px';
      loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadLevelIntoEditor(level);
      });
      item.appendChild(loadBtn);

      // Drag-and-drop handlers
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(i));
        item.classList.add('editor-level-item--dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('editor-level-item--dragging');
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = i;
        if (fromIndex !== toIndex && !isNaN(fromIndex)) {
          // Reorder TT.LEVELS
          const [moved] = TT.LEVELS.splice(fromIndex, 1);
          TT.LEVELS.splice(toIndex, 0, moved);
          // Reassign ids
          TT.LEVELS.forEach((l, idx) => { l.id = idx + 1; });
          renderLevelList();
        }
      });

      levelListEl.appendChild(item);
    });
  }

  // -------------------------------------------------------------------------
  // Load an existing level into the editor
  // -------------------------------------------------------------------------
  function loadLevelIntoEditor(level) {
    gridWidth = level.gridWidth;
    gridHeight = level.gridHeight;
    par = level.par;
    exit = level.exit ? { side: level.exit.side, position: level.exit.position } : null;
    target = level.target ? { x: level.target.x, y: level.target.y } : null;
    editorBlocks = (level.blocks || []).map(b => ({
      x: b.x, y: b.y, width: b.width, height: b.height, color: b.color, el: null
    }));
    selectedBlockIndex = -1;
    selectedTool = null;
    colorIndex = editorBlocks.length;

    // Update the grid size inputs
    const inputs = boardEl.parentNode.parentNode.querySelectorAll('input[type="number"]');
    if (inputs.length >= 2) {
      inputs[0].value = gridWidth;
      inputs[1].value = gridHeight;
    }

    // Update par input
    const allInputs = boardEl.parentNode.parentNode.querySelectorAll('input[type="number"]');
    allInputs.forEach(input => {
      if (input.max === '99') input.value = par;
    });

    rebuildBoard();
    clearWarning();
    if (statusEl) statusEl.textContent = '';
  }

})();
