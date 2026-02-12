// solver.js -- BFS solver: verifies solvability, returns optimal move count
// No dependencies. Attaches to window.TT namespace.
window.TT = window.TT || {};

(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  TT.solver = {
    solve,
    isLevelSolvable,
    getOptimal,
    getStarRating
  };

  // -------------------------------------------------------------------------
  // solve(levelData) -> { solvable: true, optimal: N } | { solvable: false, optimal: null }
  //
  // BFS over all reachable board states. Each state is a snapshot of every
  // block's (x,y) position. A "move" is sliding one block any number of
  // cells along its allowed axis to a single new resting position.
  // -------------------------------------------------------------------------
  function solve(levelData) {
    const initialBlocks = buildBlockList(levelData);
    const gridW = levelData.gridWidth;
    const gridH = levelData.gridHeight;
    const exit = levelData.exit;

    const startHash = hashState(initialBlocks);
    const visited = new Set();
    visited.add(startHash);

    // BFS queue: each entry is { blocks, depth }
    const queue = [{ blocks: initialBlocks, depth: 0 }];

    while (queue.length > 0) {
      const { blocks, depth } = queue.shift();

      for (let bi = 0; bi < blocks.length; bi++) {
        const block = blocks[bi];
        const moves = getValidMoves(block, blocks, bi, gridW, gridH, exit);

        for (let mi = 0; mi < moves.length; mi++) {
          const move = moves[mi];

          // Check win before creating the full state (optimization)
          if (block.isTarget && isWinPosition(move.x, move.y, exit, gridW, gridH)) {
            return { solvable: true, optimal: depth + 1 };
          }

          // Build new state with this block moved
          const newBlocks = blocks.slice();
          newBlocks[bi] = { ...block, x: move.x, y: move.y };

          const hash = hashState(newBlocks);
          if (!visited.has(hash)) {
            visited.add(hash);
            queue.push({ blocks: newBlocks, depth: depth + 1 });
          }
        }
      }
    }

    return { solvable: false, optimal: null };
  }

  // -------------------------------------------------------------------------
  // Convenience wrappers
  // -------------------------------------------------------------------------
  function isLevelSolvable(levelData) {
    return solve(levelData).solvable;
  }

  function getOptimal(levelData) {
    return solve(levelData).optimal;
  }

  // Star rating: 4 = under par, 3 = par, 2 = 1-3 over, 1 = 4+ over
  function getStarRating(moves, par) {
    if (moves < par) return 4;
    if (moves === par) return 3;
    if (moves <= par + 3) return 2;
    return 1;
  }

  // -------------------------------------------------------------------------
  // Build a flat block list from level data
  // -------------------------------------------------------------------------
  function buildBlockList(levelData) {
    const list = [];

    // Target block (always 1x1)
    list.push({
      id: 'target',
      x: levelData.target.x,
      y: levelData.target.y,
      w: 1,
      h: 1,
      isTarget: true
    });

    // Obstacle blocks
    levelData.blocks.forEach((b, i) => {
      list.push({
        id: `block-${i}`,
        x: b.x,
        y: b.y,
        w: b.width,
        h: b.height,
        isTarget: false
      });
    });

    return list;
  }

  // -------------------------------------------------------------------------
  // State hashing: sort blocks by id, concatenate "id:x,y" with | separator
  // -------------------------------------------------------------------------
  function hashState(blocks) {
    const sorted = blocks.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return sorted.map(b => `${b.id}:${b.x},${b.y}`).join('|');
  }

  // -------------------------------------------------------------------------
  // Win condition: target has moved past the grid boundary through the exit
  // -------------------------------------------------------------------------
  function isWinPosition(x, y, exit, gridW, gridH) {
    if (exit.side === 'right')  return y === exit.position && x >= gridW;
    if (exit.side === 'left')   return y === exit.position && x < 0;
    if (exit.side === 'bottom') return x === exit.position && y >= gridH;
    if (exit.side === 'top')    return x === exit.position && y < 0;
    return false;
  }

  // -------------------------------------------------------------------------
  // Occupancy helpers (mirror engine.js logic)
  // -------------------------------------------------------------------------
  function buildOccupancySet(blocks, excludeIndex) {
    const set = new Set();
    for (let i = 0; i < blocks.length; i++) {
      if (i === excludeIndex) continue;
      const b = blocks[i];
      for (let cy = b.y; cy < b.y + b.h; cy++) {
        for (let cx = b.x; cx < b.x + b.w; cx++) {
          set.add((cx << 16) | (cy & 0xFFFF));
        }
      }
    }
    return set;
  }

  function wouldCollide(occupancy, nx, ny, w, h) {
    for (let cy = ny; cy < ny + h; cy++) {
      for (let cx = nx; cx < nx + w; cx++) {
        if (occupancy.has((cx << 16) | (cy & 0xFFFF))) return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // getValidMoves -- all positions a block can reach in one slide
  //
  // Uses the same scan-then-extend pattern as engine.js computeBounds:
  //   1. Scan each direction cell by cell until hitting a wall or block
  //   2. Each intermediate+final cell along the path is a valid move
  //   3. If the block is the target, aligned with exit, and reached the
  //      grid edge, extend one cell past the boundary (the exit move)
  //
  // Axis rules (matching engine.js):
  //   w > h  -> horizontal only
  //   h > w  -> vertical only
  //   w === h -> both axes (1x1 target, 2x2 blocks)
  // -------------------------------------------------------------------------
  function getValidMoves(block, allBlocks, blockIndex, gridW, gridH, exit) {
    const occupancy = buildOccupancySet(allBlocks, blockIndex);
    const positions = [];

    const canHorizontal = block.w >= block.h;
    const canVertical   = block.h >= block.w;

    // -- Horizontal moves --
    if (canHorizontal) {
      // Track the furthest left/right the block can reach (starts at current)
      let minX = block.x;
      let maxX = block.x;

      // Scan left
      for (let nx = block.x - 1; nx >= 0; nx--) {
        if (wouldCollide(occupancy, nx, block.y, block.w, block.h)) break;
        minX = nx;
        positions.push({ x: nx, y: block.y });
      }

      // Scan right
      for (let nx = block.x + 1; nx + block.w <= gridW; nx++) {
        if (wouldCollide(occupancy, nx, block.y, block.w, block.h)) break;
        maxX = nx;
        positions.push({ x: nx, y: block.y });
      }

      // Target exit extensions (matching engine.js computeBounds)
      if (block.isTarget && isAligned(block, exit)) {
        if (exit.side === 'left' && minX === 0) {
          positions.push({ x: -1, y: block.y });
        }
        if (exit.side === 'right' && maxX + block.w === gridW) {
          positions.push({ x: gridW, y: block.y });
        }
      }
    }

    // -- Vertical moves --
    if (canVertical) {
      let minY = block.y;
      let maxY = block.y;

      // Scan up
      for (let ny = block.y - 1; ny >= 0; ny--) {
        if (wouldCollide(occupancy, block.x, ny, block.w, block.h)) break;
        minY = ny;
        positions.push({ x: block.x, y: ny });
      }

      // Scan down
      for (let ny = block.y + 1; ny + block.h <= gridH; ny++) {
        if (wouldCollide(occupancy, block.x, ny, block.w, block.h)) break;
        maxY = ny;
        positions.push({ x: block.x, y: ny });
      }

      // Target exit extensions
      if (block.isTarget && isAligned(block, exit)) {
        if (exit.side === 'top' && minY === 0) {
          positions.push({ x: block.x, y: -1 });
        }
        if (exit.side === 'bottom' && maxY + block.h === gridH) {
          positions.push({ x: block.x, y: gridH });
        }
      }
    }

    return positions;
  }

  // -------------------------------------------------------------------------
  // Check alignment: block's row/col range covers the exit position
  // (mirrors engine.js isTargetAlignedWithExit)
  // -------------------------------------------------------------------------
  function isAligned(block, exit) {
    if (exit.side === 'right' || exit.side === 'left') {
      return block.y <= exit.position && exit.position < block.y + block.h;
    }
    return block.x <= exit.position && exit.position < block.x + block.w;
  }

})();
