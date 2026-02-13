// engine.js -- Game engine: grid, blocks, drag, collision, move logic, win
// Depends on: storage.js, solver.js, levels.js
window.TT = window.TT || {};

(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------
  let currentLevel = null;   // The raw level data object
  let blocks = [];           // Runtime block state: { id, x, y, width, height, color, isTarget, el }
  let initialPositions = []; // Deep copy of starting positions for reset
  let moveCount = 0;
  let won = false;

  // DOM references (set during init)
  let boardEl = null;
  let moveCounterEl = null;
  let cellSize = 0;

  // Drag state
  let drag = null; // null when not dragging

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  TT.engine = {
    init,
    reset,
    getMoveCount: () => moveCount,
    getState: () => ({
      levelId: currentLevel ? currentLevel.id : null,
      moves: moveCount,
      blocks: blocks.map(b => ({
        id: b.id, x: b.x, y: b.y,
        width: b.width, height: b.height, isTarget: b.isTarget
      })),
      won
    }),
    onWin: null
  };

  // ---------------------------------------------------------------------------
  // init -- Build the game screen for a level
  // ---------------------------------------------------------------------------
  function init(levelData) {
    currentLevel = levelData;
    moveCount = 0;
    won = false;
    drag = null;
    blocks = [];

    const root = document.getElementById('game-root');
    root.innerHTML = '';

    // -- Screen container --
    const screen = document.createElement('div');
    screen.className = 'screen screen--game screen-enter';

    // -- HUD --
    const hud = document.createElement('div');
    hud.className = 'hud';

    const levelLabel = document.createElement('span');
    levelLabel.className = 'hud__level';
    levelLabel.textContent = `Level ${levelData.id}`;

    moveCounterEl = document.createElement('span');
    moveCounterEl.className = 'move-counter';
    moveCounterEl.textContent = 'Moves: 0';

    hud.appendChild(levelLabel);
    hud.appendChild(moveCounterEl);
    screen.appendChild(hud);

    // -- Board --
    boardEl = document.createElement('div');
    boardEl.className = 'board';
    boardEl.style.setProperty('--grid-cols', levelData.gridWidth);
    boardEl.style.setProperty('--grid-rows', levelData.gridHeight);

    // Exit gap mask (punches hole in board border)
    const gapMask = document.createElement('div');
    gapMask.className = `exit-gap-mask exit-gap-mask--${levelData.exit.side}`;
    positionExitElement(gapMask, levelData.exit);
    boardEl.appendChild(gapMask);

    // Exit indicator arrow
    const exitIndicator = document.createElement('div');
    exitIndicator.className = `exit-indicator exit-indicator--${levelData.exit.side}`;
    positionExitElement(exitIndicator, levelData.exit);
    boardEl.appendChild(exitIndicator);

    // Exit zone — checkered line at the border gap
    const exitZone = document.createElement('div');
    exitZone.className = 'exit-zone exit-zone--' + levelData.exit.side;
    if (levelData.exit.side === 'right') {
      exitZone.style.top = `calc(var(--cell-size) * ${levelData.exit.position})`;
      exitZone.style.right = '-3px';
    } else if (levelData.exit.side === 'left') {
      exitZone.style.top = `calc(var(--cell-size) * ${levelData.exit.position})`;
      exitZone.style.left = '-3px';
    } else if (levelData.exit.side === 'bottom') {
      exitZone.style.left = `calc(var(--cell-size) * ${levelData.exit.position})`;
      exitZone.style.bottom = '-3px';
    } else if (levelData.exit.side === 'top') {
      exitZone.style.left = `calc(var(--cell-size) * ${levelData.exit.position})`;
      exitZone.style.top = '-3px';
    }
    boardEl.appendChild(exitZone);

    // Create target block
    const targetBlock = makeBlockState({
      id: 'target',
      x: levelData.target.x,
      y: levelData.target.y,
      width: 1,
      height: 1,
      color: null,
      isTarget: true
    });
    blocks.push(targetBlock);

    // Create obstacle blocks
    levelData.blocks.forEach((b, i) => {
      const block = makeBlockState({
        id: `block-${i}`,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        color: b.color,
        isTarget: false
      });
      blocks.push(block);
    });

    // Render all blocks as DOM elements
    blocks.forEach(b => {
      const el = createBlockElement(b);
      b.el = el;
      boardEl.appendChild(el);
    });

    // Deep copy initial positions for reset
    initialPositions = blocks.map(b => ({ id: b.id, x: b.x, y: b.y }));

    // Attach pointer events to board (delegation)
    boardEl.addEventListener('pointerdown', onPointerDown);

    screen.appendChild(boardEl);

    // -- Button row --
    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => TT.engine.reset());

    const menuBtn = document.createElement('button');
    menuBtn.className = 'btn';
    menuBtn.textContent = 'Menu';
    menuBtn.addEventListener('click', () => {
      if (TT.screens && TT.screens.showLevelSelect) {
        TT.screens.showLevelSelect();
      }
    });

    const hintBtn = document.createElement('button');
    hintBtn.className = 'btn btn-hint';
    hintBtn.textContent = '?';
    hintBtn.addEventListener('click', showHintArrows);

    btnRow.appendChild(resetBtn);
    btnRow.appendChild(menuBtn);
    btnRow.appendChild(hintBtn);
    screen.appendChild(btnRow);

    root.appendChild(screen);

    // Compute cellSize after DOM is rendered
    requestAnimationFrame(() => {
      cellSize = boardEl.clientWidth / levelData.gridWidth;
    });

    // Brief highlight animation on target block and exit indicator
    const targetEl = blocks.find(b => b.isTarget)?.el;
    if (targetEl) targetEl.classList.add('highlight-intro');
    exitIndicator.classList.add('highlight-intro');
    setTimeout(() => {
      if (targetEl) targetEl.classList.remove('highlight-intro');
      exitIndicator.classList.remove('highlight-intro');
    }, 1500);
  }

  // ---------------------------------------------------------------------------
  // reset -- Restore initial positions, zero moves
  // ---------------------------------------------------------------------------
  function reset() {
    if (!currentLevel) return;
    moveCount = 0;
    won = false;
    updateMoveDisplay();

    initialPositions.forEach(pos => {
      const block = blocks.find(b => b.id === pos.id);
      if (block) {
        block.x = pos.x;
        block.y = pos.y;
        updateBlockTransform(block);
        if (block.el) {
          block.el.classList.remove('block--exiting');
          block.el.style.opacity = '';
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Block helpers
  // ---------------------------------------------------------------------------
  function makeBlockState({ id, x, y, width, height, color, isTarget }) {
    return { id, x, y, width, height, color, isTarget, el: null };
  }

  function createBlockElement(block) {
    const el = document.createElement('div');
    el.className = block.isTarget ? 'block block--target' : 'block';
    el.dataset.blockId = block.id;
    el.style.width = `calc(var(--cell-size) * ${block.width})`;
    el.style.height = `calc(var(--cell-size) * ${block.height})`;
    el.style.transform =
      `translate(calc(var(--cell-size) * ${block.x}), calc(var(--cell-size) * ${block.y}))`;

    if (!block.isTarget && block.color) {
      el.style.backgroundColor = block.color;
    }

    return el;
  }

  function updateBlockTransform(block) {
    if (!block.el) return;
    block.el.style.transform =
      `translate(calc(var(--cell-size) * ${block.x}), calc(var(--cell-size) * ${block.y}))`;
  }

  function positionExitElement(el, exit) {
    const offset = `calc(var(--cell-size) * ${exit.position})`;
    if (exit.side === 'right' || exit.side === 'left') {
      el.style.top = offset;
    } else {
      el.style.left = offset;
    }
  }

  // ---------------------------------------------------------------------------
  // Occupancy helpers
  // ---------------------------------------------------------------------------

  // Build a set of "x,y" strings for all cells occupied by blocks except excludeId
  function buildOccupancySet(excludeId) {
    const set = new Set();
    for (const b of blocks) {
      if (b.id === excludeId) continue;
      for (let cy = b.y; cy < b.y + b.height; cy++) {
        for (let cx = b.x; cx < b.x + b.width; cx++) {
          set.add(`${cx},${cy}`);
        }
      }
    }
    return set;
  }

  // Check if placing a block at (nx, ny) with size (w, h) collides with occupied cells
  function wouldCollide(occupancy, nx, ny, w, h) {
    for (let cy = ny; cy < ny + h; cy++) {
      for (let cx = nx; cx < nx + w; cx++) {
        if (occupancy.has(`${cx},${cy}`)) return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Movement bounds calculation
  // ---------------------------------------------------------------------------
  // Returns { minX, maxX, minY, maxY } -- the range of valid grid positions
  // the block can be dragged to in one move.
  //
  // Non-target blocks are constrained within 0..gridWidth/Height.
  // The target block, if aligned with the exit, can move one cell past
  // the grid boundary to trigger the win.
  function computeBounds(block) {
    const occupancy = buildOccupancySet(block.id);
    const gw = currentLevel.gridWidth;
    const gh = currentLevel.gridHeight;
    const exit = currentLevel.exit;

    let minX = block.x;
    let maxX = block.x;
    let minY = block.y;
    let maxY = block.y;

    // -- Horizontal scanning --

    // Scan left: try x-1, x-2, ... down to 0
    for (let nx = block.x - 1; nx >= 0; nx--) {
      if (wouldCollide(occupancy, nx, block.y, block.width, block.height)) break;
      minX = nx;
    }

    // Scan right: try positions until block.right would exceed grid
    for (let nx = block.x + 1; nx + block.width <= gw; nx++) {
      if (wouldCollide(occupancy, nx, block.y, block.width, block.height)) break;
      maxX = nx;
    }

    // -- Vertical scanning --

    // Scan up
    for (let ny = block.y - 1; ny >= 0; ny--) {
      if (wouldCollide(occupancy, block.x, ny, block.width, block.height)) break;
      minY = ny;
    }

    // Scan down
    for (let ny = block.y + 1; ny + block.height <= gh; ny++) {
      if (wouldCollide(occupancy, block.x, ny, block.width, block.height)) break;
      maxY = ny;
    }

    // -- Target exit extension --
    // Allow the target to slide one cell past the grid boundary through the exit.
    // The target must be aligned with the exit (its row/col overlaps the exit position).
    if (block.isTarget) {
      const aligned = isTargetAlignedWithExit(block);
      if (aligned) {
        if (exit.side === 'right' && maxX + block.width === gw) {
          // Target is flush with right edge and path is clear -- allow exit
          maxX = gw; // one cell past right boundary
        }
        if (exit.side === 'left' && minX === 0) {
          minX = -1; // one cell past left boundary
        }
        if (exit.side === 'bottom' && maxY + block.height === gh) {
          maxY = gh;
        }
        if (exit.side === 'top' && minY === 0) {
          minY = -1;
        }
      }
    }

    return { minX, maxX, minY, maxY };
  }

  // Check if the target block's row/col range covers the exit position
  function isTargetAlignedWithExit(block) {
    const exit = currentLevel.exit;
    if (exit.side === 'right' || exit.side === 'left') {
      // Target rows [block.y .. block.y+block.height) must include exit.position
      return block.y <= exit.position && exit.position < block.y + block.height;
    }
    // Top or bottom: target columns must include exit.position
    return block.x <= exit.position && exit.position < block.x + block.width;
  }

  // ---------------------------------------------------------------------------
  // Pointer event handling (drag system)
  // ---------------------------------------------------------------------------
  function onPointerDown(e) {
    if (won || drag) return;

    // Find which block was clicked via event delegation
    const blockEl = e.target.closest('.block');
    if (!blockEl) return;

    const blockId = blockEl.dataset.blockId;
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Recompute cellSize in case of resize
    cellSize = boardEl.clientWidth / currentLevel.gridWidth;

    // Determine allowed axes based on block dimensions
    const canHorizontal = block.width >= block.height; // horizontal or square
    const canVertical = block.height >= block.width;   // vertical or square
    const isMultiAxis = canHorizontal && canVertical;  // 1x1 or 2x2

    // Compute movement bounds
    const bounds = computeBounds(block);

    drag = {
      block,
      startGridX: block.x,
      startGridY: block.y,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      minX: bounds.minX,
      maxX: bounds.maxX,
      minY: bounds.minY,
      maxY: bounds.maxY,
      canHorizontal,
      canVertical,
      isMultiAxis,
      lockedAxis: isMultiAxis ? null : (canHorizontal ? 'x' : 'y'),
      currentGridX: block.x,
      currentGridY: block.y
    };

    blockEl.classList.add('block--dragging');
    blockEl.setPointerCapture(e.pointerId);
    e.preventDefault();

    // Attach move/up on the element (pointer capture routes events to it)
    blockEl.addEventListener('pointermove', onPointerMove);
    blockEl.addEventListener('pointerup', onPointerUp);
    blockEl.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e) {
    if (!drag) return;

    const dx = e.clientX - drag.startPointerX;
    const dy = e.clientY - drag.startPointerY;

    // Convert pixel delta to fractional grid units
    const gridDx = dx / cellSize;
    const gridDy = dy / cellSize;

    // Lock axis for multi-axis blocks after ~0.3 cells of movement
    if (drag.isMultiAxis && !drag.lockedAxis) {
      const threshold = 0.3;
      if (Math.abs(gridDx) > threshold || Math.abs(gridDy) > threshold) {
        drag.lockedAxis = Math.abs(gridDx) >= Math.abs(gridDy) ? 'x' : 'y';
      } else {
        return; // Not enough movement yet
      }
    }

    let newX = drag.startGridX;
    let newY = drag.startGridY;

    if (drag.lockedAxis === 'x') {
      newX = Math.round(drag.startGridX + gridDx);
      newX = Math.max(drag.minX, Math.min(drag.maxX, newX));
    }

    if (drag.lockedAxis === 'y') {
      newY = Math.round(drag.startGridY + gridDy);
      newY = Math.max(drag.minY, Math.min(drag.maxY, newY));
    }

    drag.currentGridX = newX;
    drag.currentGridY = newY;

    // Update visual position using pixel values for smooth snapping
    drag.block.el.style.transform =
      `translate(${newX * cellSize}px, ${newY * cellSize}px)`;
  }

  function onPointerUp(e) {
    if (!drag) return;

    const block = drag.block;
    const el = block.el;

    el.classList.remove('block--dragging');
    el.releasePointerCapture(e.pointerId);

    // Remove listeners
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);

    const finalX = drag.currentGridX;
    const finalY = drag.currentGridY;

    // Did position change?
    const moved = finalX !== drag.startGridX || finalY !== drag.startGridY;

    // Update internal state
    block.x = finalX;
    block.y = finalY;

    // Restore CSS-variable-based transform for layout consistency
    updateBlockTransform(block);

    if (moved) {
      moveCount++;
      updateMoveDisplay();
      checkWin(block);
    }

    drag = null;
  }

  // ---------------------------------------------------------------------------
  // Move counter display
  // ---------------------------------------------------------------------------
  function updateMoveDisplay() {
    if (moveCounterEl) {
      moveCounterEl.textContent = `Moves: ${moveCount}`;
    }
  }

  // ---------------------------------------------------------------------------
  // Win detection
  // ---------------------------------------------------------------------------
  function checkWin(block) {
    if (!block.isTarget) return;

    const exit = currentLevel.exit;
    const gw = currentLevel.gridWidth;
    const gh = currentLevel.gridHeight;
    let isWin = false;

    // Target has exited when its position is past the grid boundary
    if (exit.side === 'right' && block.x >= gw) isWin = true;
    if (exit.side === 'left' && block.x < 0) isWin = true;
    if (exit.side === 'bottom' && block.y >= gh) isWin = true;
    if (exit.side === 'top' && block.y < 0) isWin = true;

    if (isWin) {
      won = true;
      triggerWinAnimation(block);
    }
  }

  function triggerWinAnimation(block) {
    const exit = currentLevel.exit;
    const el = block.el;

    el.classList.add('block--exiting');

    // Calculate exit destination: 2 cells past the edge for a smooth slide-off
    let exitX = block.x;
    let exitY = block.y;

    if (exit.side === 'right') exitX = currentLevel.gridWidth + 1;
    if (exit.side === 'left') exitX = -2;
    if (exit.side === 'bottom') exitY = currentLevel.gridHeight + 1;
    if (exit.side === 'top') exitY = -2;

    el.style.transform =
      `translate(calc(var(--cell-size) * ${exitX}), calc(var(--cell-size) * ${exitY}))`;

    // After exit animation completes, fire win callback
    setTimeout(() => {
      if (TT.engine.onWin) {
        TT.engine.onWin({
          levelId: currentLevel.id,
          moves: moveCount,
          par: currentLevel.par
        });
      }
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Hint arrows — briefly shows directional arrows on all blocks
  // ---------------------------------------------------------------------------
  function showHintArrows() {
    if (boardEl.querySelector('.block-hint-arrow')) return;

    blocks.forEach(block => {
      if (!block.el) return;

      const dirs = [];
      if (block.width === block.height) {
        dirs.push('left', 'right', 'top', 'bottom');
      } else if (block.width > block.height) {
        dirs.push('left', 'right');
      } else {
        dirs.push('top', 'bottom');
      }

      const arrows = { left: '\u2190', right: '\u2192', top: '\u2191', bottom: '\u2193' };
      dirs.forEach(dir => {
        const el = document.createElement('div');
        el.className = `block-hint-arrow block-hint-arrow--${dir}`;
        el.textContent = arrows[dir];
        block.el.appendChild(el);
      });
    });

    setTimeout(() => {
      boardEl.querySelectorAll('.block-hint-arrow').forEach(el => {
        el.classList.add('block-hint-arrow--fade');
      });
      setTimeout(() => {
        boardEl.querySelectorAll('.block-hint-arrow').forEach(el => el.remove());
      }, 300);
    }, 1500);
  }

  // ---------------------------------------------------------------------------
  // Auto-start (Phase 2) -- only if screens module is not loaded
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    if (!TT.screens || !TT.screens.showTitle) {
      TT.engine.init(TT.LEVELS[0]);
    }
  });

})();
