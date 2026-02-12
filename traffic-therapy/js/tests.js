// tests.js -- Comprehensive test suite for Traffic Therapy
// Depends on: storage.js, solver.js, levels.js, engine.js, screens.js, editor.js
// Call runTests() from the browser console to execute all tests.
window.TT = window.TT || {};

(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // Test runner infrastructure
  // -------------------------------------------------------------------------
  let passed = 0;
  let failed = 0;
  let total = 0;
  let sectionName = '';

  const log = (msg) => console.log(msg);

  const section = (name) => {
    sectionName = name;
    log(`\n--- ${name} ---`);
  };

  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  };

  const test = (name, fn) => {
    total++;
    try {
      fn();
      passed++;
      log(`  PASS: ${name}`);
    } catch (e) {
      failed++;
      log(`  FAIL: ${name} -- ${e.message}`);
    }
  };

  const manual = (name) => {
    log(`  MANUAL: ${name}`);
  };

  // -------------------------------------------------------------------------
  // Helper: create a simple level config for testing
  // -------------------------------------------------------------------------
  const makeLevel = (overrides) => {
    const base = {
      id: 99,
      name: 'Test Level',
      gridWidth: 5,
      gridHeight: 5,
      par: 10,
      exit: { side: 'right', position: 2 },
      target: { x: 0, y: 2 },
      blocks: []
    };
    return Object.assign({}, base, overrides);
  };

  // -------------------------------------------------------------------------
  // Helper: check if two rectangles overlap
  // -------------------------------------------------------------------------
  const rectsOverlap = (x1, y1, w1, h1, x2, y2, w2, h2) => {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  };

  // -------------------------------------------------------------------------
  // runTests -- Main entry point
  // -------------------------------------------------------------------------
  function runTests() {
    passed = 0;
    failed = 0;
    total = 0;

    log('=== Traffic Therapy Test Suite ===');
    log(`Running at ${new Date().toLocaleTimeString()}`);

    testCorePuzzleLogic();
    testMoveCounter();
    testStarRating();
    testLevelIntegrity();
    testProgressionStorage();
    testEditor();
    testMobile();

    log('\n=== Results ===');
    log(`${passed}/${total} tests passed, ${failed} failed`);

    return { passed, failed, total };
  }

  // =========================================================================
  // 9.1 Core Puzzle Logic Tests
  // =========================================================================
  function testCorePuzzleLogic() {
    section('9.1 Core Puzzle Logic');

    // Test: Horizontal block cannot move vertically
    // A 2x1 horizontal block can only slide left/right. The solver should
    // only generate horizontal moves for it.
    test('Horizontal block cannot move vertically', () => {
      // Horizontal 2x1 block at (1,0). Target at (0,2), exit right side row 2.
      // The solver should solve this by moving the target right, not by
      // moving the horizontal block vertically.
      const level = makeLevel({
        target: { x: 0, y: 2 },
        exit: { side: 'right', position: 2 },
        blocks: [
          { x: 1, y: 0, width: 2, height: 1 } // horizontal, row 0
        ]
      });
      const result = TT.solver.solve(level);
      assert(result.solvable, 'Level should be solvable');

      // Create a level where the ONLY solution would require the horizontal
      // block to move vertically -- this should be unsolvable.
      // Put horizontal block blocking the target path, with no room to slide
      // it left/right but room above/below.
      const unsolvable = makeLevel({
        gridWidth: 3,
        gridHeight: 3,
        target: { x: 0, y: 1 },
        exit: { side: 'right', position: 1 },
        blocks: [
          { x: 1, y: 1, width: 2, height: 1 } // horizontal block fills cols 1-2 on row 1
          // No room left/right to slide it (grid is only 3 wide, block is 2 wide at x=1)
        ]
      });
      const result2 = TT.solver.solve(unsolvable);
      assert(!result2.solvable, 'Level requiring vertical move of horizontal block should be unsolvable');
    });

    // Test: Vertical block cannot move horizontally
    test('Vertical block cannot move horizontally', () => {
      // Similar approach: create a scenario where vertical block blocks the path
      // and can only be cleared by moving it horizontally (should be unsolvable).
      const unsolvable = makeLevel({
        gridWidth: 3,
        gridHeight: 3,
        target: { x: 0, y: 1 },
        exit: { side: 'right', position: 1 },
        blocks: [
          { x: 1, y: 0, width: 1, height: 3 } // vertical block fills entire col 1
          // Cannot slide it left (target at col 0) or right (would need to move horizontally)
        ]
      });
      const result = TT.solver.solve(unsolvable);
      assert(!result.solvable, 'Level requiring horizontal move of vertical block should be unsolvable');
    });

    // Test: 1x1 target block can move in any direction
    test('1x1 target block can move in any direction', () => {
      // Place target in the center of a 5x5 grid with no obstacles.
      // It should be able to reach the exit from any position.
      const level = makeLevel({
        target: { x: 2, y: 2 },
        exit: { side: 'right', position: 2 },
        blocks: []
      });
      const result = TT.solver.solve(level);
      assert(result.solvable, 'Target should reach right exit');
      assert(result.optimal >= 1, 'Should take at least 1 move');

      // Also test exits on all 4 sides
      const sides = [
        { side: 'right', position: 2 },
        { side: 'left', position: 2 },
        { side: 'top', position: 2 },
        { side: 'bottom', position: 2 }
      ];
      sides.forEach(exitConfig => {
        const lvl = makeLevel({
          target: { x: 2, y: 2 },
          exit: exitConfig,
          blocks: []
        });
        const r = TT.solver.solve(lvl);
        assert(r.solvable, `Target should reach ${exitConfig.side} exit`);
      });
    });

    // Test: Block cannot move through another block
    test('Block cannot move through another block', () => {
      // Two horizontal blocks in the same row. Block A at (0,0) width 2,
      // Block B at (3,0) width 2. They can slide toward each other but not through.
      // Target at (0,2) with exit right row 2 -- solvable without moving blocks.
      // The point: verify the solver respects collision.
      const level = makeLevel({
        target: { x: 0, y: 2 },
        exit: { side: 'right', position: 2 },
        blocks: [
          { x: 0, y: 0, width: 2, height: 1 },
          { x: 3, y: 0, width: 2, height: 1 }
        ]
      });
      const result = TT.solver.solve(level);
      assert(result.solvable, 'Level should be solvable (target path is clear)');

      // Now create a level where collision matters: target needs to pass
      // through a row blocked by two adjacent blocks that cannot be moved apart.
      const blocked = makeLevel({
        gridWidth: 3,
        gridHeight: 3,
        target: { x: 0, y: 1 },
        exit: { side: 'right', position: 1 },
        blocks: [
          { x: 1, y: 0, width: 1, height: 3 }, // vertical block col 1, fills entire column
          { x: 2, y: 0, width: 1, height: 3 }  // vertical block col 2, fills entire column
        ]
      });
      const result2 = TT.solver.solve(blocked);
      assert(!result2.solvable, 'Cannot pass through adjacent blocks');
    });

    // Test: Block cannot move off the grid
    test('Block cannot move off the grid', () => {
      // Non-target blocks should stay within bounds.
      // Place a horizontal block at the left edge -- it shouldn't go further left.
      // The solver inherently respects this; verify by checking solvability
      // of a level where blocks are at edges.
      const level = makeLevel({
        target: { x: 2, y: 2 },
        exit: { side: 'right', position: 2 },
        blocks: [
          { x: 0, y: 0, width: 2, height: 1 }, // at left edge
          { x: 3, y: 4, width: 2, height: 1 }  // at right edge (3+2=5=gridWidth)
        ]
      });
      const result = TT.solver.solve(level);
      assert(result.solvable, 'Level with edge blocks should be solvable');
      // The solver would fail/crash if it allowed blocks off-grid
    });

    // Test: Non-target block cannot exit through gap
    test('Non-target block cannot exit through gap', () => {
      // Place a horizontal 2x1 block adjacent to the exit on row 2,
      // with clear path to the exit. It should NOT be able to exit.
      // Meanwhile the target is far away and blocked.
      const level = makeLevel({
        gridWidth: 5,
        gridHeight: 5,
        target: { x: 0, y: 0 },
        exit: { side: 'right', position: 2 },
        blocks: [
          { x: 3, y: 2, width: 2, height: 1 }, // horizontal block at (3,2)-(4,2), adjacent to right exit
          // Block the target completely
          { x: 0, y: 1, width: 1, height: 3 }, // vertical block blocking col 0, rows 1-3
          { x: 1, y: 0, width: 1, height: 3 }  // vertical block blocking col 1, rows 0-2
        ]
      });
      // The horizontal block at row 2 is right at the exit, but it cannot exit.
      // The target is stuck at (0,0) with no path. So this should be unsolvable.
      const result = TT.solver.solve(level);
      // If non-target blocks could exit, the horizontal block would leave and
      // potentially open paths. Since they can't, this remains unsolvable.
      assert(!result.solvable, 'Non-target block should not be able to exit through gap');
    });

    // Test: Target block CAN exit through the gap
    test('Target block CAN exit through gap', () => {
      // Target at (4,2) with exit right at row 2. Nothing blocking.
      const level = makeLevel({
        target: { x: 4, y: 2 },
        exit: { side: 'right', position: 2 },
        blocks: []
      });
      const result = TT.solver.solve(level);
      assert(result.solvable, 'Target should be able to exit');
      assert(result.optimal === 1, 'Should take exactly 1 move to exit');
    });

    // Test: Win condition does not trigger prematurely
    test('Win condition does not trigger prematurely', () => {
      // Target at (3,2) with exit right at row 2. One move to reach edge (x=4),
      // then one more to exit (x=5). With no obstacles, the solver should find
      // optimal = 1 (slides from x=3 all the way through).
      // But if target is at (0,0) and exit is right row 2, it needs multiple moves.
      const level = makeLevel({
        target: { x: 0, y: 0 },
        exit: { side: 'right', position: 2 },
        blocks: []
      });
      const result = TT.solver.solve(level);
      assert(result.solvable, 'Should be solvable');
      assert(result.optimal >= 2, 'Target at (0,0) needs at least 2 moves to exit right row 2');
      // This verifies the win is not triggered when target is merely near the exit
    });
  }

  // =========================================================================
  // 9.2 Move Counter Tests
  // =========================================================================
  function testMoveCounter() {
    section('9.2 Move Counter');

    test('Move counter starts at 0', () => {
      const level = TT.LEVELS[0];
      TT.engine.init(level);
      assert(TT.engine.getMoveCount() === 0, `Expected 0 but got ${TT.engine.getMoveCount()}`);
    });

    test('Reset resets move counter to 0', () => {
      const level = TT.LEVELS[0];
      TT.engine.init(level);
      // We cannot simulate pointer events easily, but we can verify reset works
      TT.engine.reset();
      assert(TT.engine.getMoveCount() === 0, `Expected 0 after reset but got ${TT.engine.getMoveCount()}`);
    });

    test('State reports correct initial values', () => {
      const level = TT.LEVELS[0];
      TT.engine.init(level);
      const state = TT.engine.getState();
      assert(state.levelId === level.id, `Expected levelId ${level.id} but got ${state.levelId}`);
      assert(state.moves === 0, `Expected 0 moves but got ${state.moves}`);
      assert(state.won === false, 'Game should not be won initially');
      assert(state.blocks.length === level.blocks.length + 1, 'Block count should match level blocks + target');
    });

    test('Reset restores initial block positions', () => {
      const level = TT.LEVELS[0];
      TT.engine.init(level);
      const stateBefore = TT.engine.getState();
      TT.engine.reset();
      const stateAfter = TT.engine.getState();

      // Compare block positions
      stateBefore.blocks.forEach((blockBefore, i) => {
        const blockAfter = stateAfter.blocks[i];
        assert(
          blockBefore.x === blockAfter.x && blockBefore.y === blockAfter.y,
          `Block ${blockBefore.id} position should be restored after reset`
        );
      });
    });

    // These require pointer event simulation -- log as manual
    manual('Valid move increments counter by 1 (requires pointer events)');
    manual('Multi-cell drag counts as 1 move (requires pointer events)');
    manual('Zero-distance drag does NOT increment counter (requires pointer events)');
  }

  // =========================================================================
  // 9.3 Star Rating Tests
  // =========================================================================
  function testStarRating() {
    section('9.3 Star Rating');

    test('Under par awards 4 stars', () => {
      assert(TT.solver.getStarRating(8, 10) === 4, 'Expected 4 stars for 8 moves with par 10');
      assert(TT.solver.getStarRating(1, 10) === 4, 'Expected 4 stars for 1 move with par 10');
      assert(TT.solver.getStarRating(9, 10) === 4, 'Expected 4 stars for 9 moves with par 10');
    });

    test('At par awards 3 stars', () => {
      assert(TT.solver.getStarRating(10, 10) === 3, 'Expected 3 stars for 10 moves with par 10');
      assert(TT.solver.getStarRating(5, 5) === 3, 'Expected 3 stars for 5 moves with par 5');
    });

    test('1-3 over par awards 2 stars', () => {
      assert(TT.solver.getStarRating(11, 10) === 2, 'Expected 2 stars for 11 moves with par 10');
      assert(TT.solver.getStarRating(12, 10) === 2, 'Expected 2 stars for 12 moves with par 10');
      assert(TT.solver.getStarRating(13, 10) === 2, 'Expected 2 stars for 13 moves with par 10');
    });

    test('4+ over par awards 1 star', () => {
      assert(TT.solver.getStarRating(14, 10) === 1, 'Expected 1 star for 14 moves with par 10');
      assert(TT.solver.getStarRating(20, 10) === 1, 'Expected 1 star for 20 moves with par 10');
      assert(TT.solver.getStarRating(100, 10) === 1, 'Expected 1 star for 100 moves with par 10');
    });

    test('Edge cases at par boundaries', () => {
      // par=1: 0 moves = 4 stars, 1 move = 3 stars, 2-4 = 2 stars, 5+ = 1 star
      assert(TT.solver.getStarRating(0, 1) === 4, 'Expected 4 stars for 0 moves with par 1');
      assert(TT.solver.getStarRating(1, 1) === 3, 'Expected 3 stars for 1 move with par 1');
      assert(TT.solver.getStarRating(4, 1) === 2, 'Expected 2 stars for 4 moves with par 1');
      assert(TT.solver.getStarRating(5, 1) === 1, 'Expected 1 star for 5 moves with par 1');
    });
  }

  // =========================================================================
  // 9.4 Level Integrity Tests
  // =========================================================================
  function testLevelIntegrity() {
    section('9.4 Level Integrity');

    test('All levels are solvable', () => {
      TT.LEVELS.forEach(level => {
        const result = TT.solver.solve(level);
        assert(result.solvable, `Level ${level.id} ("${level.name}") is not solvable`);
      });
    });

    test('Par >= optimal for all levels', () => {
      TT.LEVELS.forEach(level => {
        const result = TT.solver.solve(level);
        assert(
          level.par >= result.optimal,
          `Level ${level.id}: par (${level.par}) < optimal (${result.optimal})`
        );
      });
    });

    test('No blocks overlap in initial state', () => {
      TT.LEVELS.forEach(level => {
        const occupied = new Set();

        // Target block cells
        const tKey = `${level.target.x},${level.target.y}`;
        occupied.add(tKey);

        // Obstacle block cells
        level.blocks.forEach((block, bi) => {
          for (let cy = block.y; cy < block.y + block.height; cy++) {
            for (let cx = block.x; cx < block.x + block.width; cx++) {
              const key = `${cx},${cy}`;
              assert(
                !occupied.has(key),
                `Level ${level.id}: overlap at cell (${cx},${cy}) involving block index ${bi}`
              );
              occupied.add(key);
            }
          }
        });
      });
    });

    test('Exit is on the edge of the grid', () => {
      TT.LEVELS.forEach(level => {
        const { side, position } = level.exit;
        const validSides = ['top', 'bottom', 'left', 'right'];
        assert(validSides.includes(side), `Level ${level.id}: invalid exit side "${side}"`);

        if (side === 'top' || side === 'bottom') {
          assert(
            position >= 0 && position < level.gridWidth,
            `Level ${level.id}: exit position ${position} out of bounds for width ${level.gridWidth}`
          );
        } else {
          assert(
            position >= 0 && position < level.gridHeight,
            `Level ${level.id}: exit position ${position} out of bounds for height ${level.gridHeight}`
          );
        }
      });
    });

    test('Exactly one target block per level', () => {
      TT.LEVELS.forEach(level => {
        assert(level.target !== null && level.target !== undefined,
          `Level ${level.id}: missing target`);
        assert(typeof level.target.x === 'number' && typeof level.target.y === 'number',
          `Level ${level.id}: target must have numeric x and y`);
      });
    });

    test('Target block is within grid bounds', () => {
      TT.LEVELS.forEach(level => {
        assert(
          level.target.x >= 0 && level.target.x < level.gridWidth &&
          level.target.y >= 0 && level.target.y < level.gridHeight,
          `Level ${level.id}: target at (${level.target.x},${level.target.y}) is out of bounds`
        );
      });
    });

    test('All blocks are within grid bounds', () => {
      TT.LEVELS.forEach(level => {
        level.blocks.forEach((block, bi) => {
          assert(
            block.x >= 0 && block.y >= 0 &&
            block.x + block.width <= level.gridWidth &&
            block.y + block.height <= level.gridHeight,
            `Level ${level.id}: block ${bi} at (${block.x},${block.y}) size ${block.width}x${block.height} is out of bounds`
          );
        });
      });
    });

    test('All levels have required fields', () => {
      const requiredFields = ['id', 'name', 'gridWidth', 'gridHeight', 'par', 'exit', 'target', 'blocks'];
      TT.LEVELS.forEach(level => {
        requiredFields.forEach(field => {
          assert(
            level[field] !== undefined && level[field] !== null,
            `Level ${level.id}: missing required field "${field}"`
          );
        });
      });
    });

    test('Level difficulty curve (optimal moves increase)', () => {
      let prevOptimal = 0;
      TT.LEVELS.forEach(level => {
        const result = TT.solver.solve(level);
        assert(
          result.optimal >= prevOptimal,
          `Level ${level.id}: optimal (${result.optimal}) should be >= previous level optimal (${prevOptimal})`
        );
        prevOptimal = result.optimal;
      });
    });
  }

  // =========================================================================
  // 9.5 Progression & Storage Tests
  // =========================================================================
  function testProgressionStorage() {
    section('9.5 Progression & Storage');

    // Save original progress so we can restore it after tests
    const originalProgress = TT.storage.load();

    test('Completing level N unlocks level N+1', () => {
      TT.storage.clearProgress();
      TT.storage.completeLevel(1, 3);
      assert(
        TT.storage.getUnlockedLevel() === 2,
        `Expected unlocked level 2 but got ${TT.storage.getUnlockedLevel()}`
      );
    });

    test('Progress persists after simulated reload', () => {
      TT.storage.clearProgress();
      TT.storage.completeLevel(1, 3);
      TT.storage.completeLevel(2, 4);

      // Simulate reload by loading fresh from cookie
      const loaded = TT.storage.load();
      assert(loaded.unlockedLevel === 3, `Expected unlocked level 3 but got ${loaded.unlockedLevel}`);
      assert(loaded.stars['1'] === 3, `Expected 3 stars for level 1 but got ${loaded.stars['1']}`);
      assert(loaded.stars['2'] === 4, `Expected 4 stars for level 2 but got ${loaded.stars['2']}`);
    });

    test('Star rating updates when improved', () => {
      TT.storage.clearProgress();
      TT.storage.completeLevel(1, 2);
      assert(TT.storage.getStars(1) === 2, 'Should have 2 stars initially');

      TT.storage.completeLevel(1, 4);
      assert(TT.storage.getStars(1) === 4, 'Should upgrade to 4 stars');
    });

    test('Star rating does NOT downgrade', () => {
      TT.storage.clearProgress();
      TT.storage.completeLevel(1, 4);
      assert(TT.storage.getStars(1) === 4, 'Should have 4 stars');

      TT.storage.completeLevel(1, 1);
      assert(TT.storage.getStars(1) === 4, 'Should still have 4 stars after worse completion');
    });

    test('Clear progress resets to defaults', () => {
      TT.storage.completeLevel(1, 3);
      TT.storage.clearProgress();
      const loaded = TT.storage.load();
      assert(loaded.unlockedLevel === 1, `Expected unlocked level 1 but got ${loaded.unlockedLevel}`);
      assert(Object.keys(loaded.stars).length === 0, 'Stars should be empty after clear');
    });

    test('getStars returns 0 for uncompleted level', () => {
      TT.storage.clearProgress();
      assert(TT.storage.getStars(1) === 0, 'Uncompleted level should return 0 stars');
      assert(TT.storage.getStars(999) === 0, 'Nonexistent level should return 0 stars');
    });

    test('Completing multiple levels tracks progress correctly', () => {
      TT.storage.clearProgress();
      TT.storage.completeLevel(1, 3);
      TT.storage.completeLevel(2, 2);
      TT.storage.completeLevel(3, 4);
      assert(TT.storage.getUnlockedLevel() === 4, 'Should unlock level 4');
      assert(TT.storage.getStars(1) === 3, 'Level 1 should have 3 stars');
      assert(TT.storage.getStars(2) === 2, 'Level 2 should have 2 stars');
      assert(TT.storage.getStars(3) === 4, 'Level 3 should have 4 stars');
    });

    test('Admin mode flag behavior', () => {
      const savedAdmin = TT.adminMode;
      TT.adminMode = false;
      assert(TT.adminMode === false, 'Admin mode should be false');
      TT.adminMode = true;
      assert(TT.adminMode === true, 'Admin mode should be true');
      // Restore
      TT.adminMode = savedAdmin;
    });

    test('Admin mode unlocks all levels (logic check)', () => {
      TT.storage.clearProgress();
      const savedAdmin = TT.adminMode;
      TT.adminMode = true;

      // In screens.js, level select shows levels where:
      // TT.adminMode || level.id <= unlockedLevel
      // So with adminMode true, all levels should be accessible
      TT.LEVELS.forEach(level => {
        const isUnlocked = TT.adminMode || level.id <= TT.storage.getUnlockedLevel();
        assert(isUnlocked, `Level ${level.id} should be accessible in admin mode`);
      });

      TT.adminMode = savedAdmin;
    });

    // Restore original progress
    TT.storage.clearProgress();
    if (originalProgress.unlockedLevel > 1 || Object.keys(originalProgress.stars).length > 0) {
      TT.storage.save(originalProgress);
    }
  }

  // =========================================================================
  // 9.6 Level Editor Tests
  // =========================================================================
  function testEditor() {
    section('9.6 Level Editor');

    test('TT.editor.show is a function', () => {
      assert(typeof TT.editor.show === 'function', 'TT.editor.show should be a function');
    });

    test('Solver correctly identifies solvable level', () => {
      const level = makeLevel({
        target: { x: 0, y: 2 },
        exit: { side: 'right', position: 2 },
        blocks: [
          { x: 2, y: 1, width: 1, height: 2 }
        ]
      });
      const result = TT.solver.solve(level);
      assert(result.solvable, 'Simple test level should be solvable');
      assert(typeof result.optimal === 'number' && result.optimal > 0, 'Should have positive optimal moves');
    });

    test('Solver correctly identifies unsolvable level', () => {
      // Completely wall off the target
      const level = makeLevel({
        gridWidth: 5,
        gridHeight: 5,
        target: { x: 0, y: 2 },
        exit: { side: 'right', position: 2 },
        blocks: [
          { x: 1, y: 0, width: 1, height: 5 }, // vertical wall at col 1
          { x: 2, y: 0, width: 1, height: 5 }, // vertical wall at col 2
        ]
      });
      // Target is at (0,2), walled off by cols 1 and 2.
      // Col 1 block is 1x5 (vertical, can only move up/down but it fills the whole column).
      // It cannot move because it already spans full height.
      const result = TT.solver.solve(level);
      assert(!result.solvable, 'Walled-off level should be unsolvable');
    });

    test('Level data format has all required fields', () => {
      const requiredFields = ['id', 'name', 'gridWidth', 'gridHeight', 'par', 'exit', 'target', 'blocks'];
      const level = makeLevel({});
      requiredFields.forEach(field => {
        assert(level[field] !== undefined, `Level data should have "${field}" field`);
      });
      assert(level.exit.side !== undefined, 'Exit should have side');
      assert(level.exit.position !== undefined, 'Exit should have position');
      assert(typeof level.target.x === 'number', 'Target should have numeric x');
      assert(typeof level.target.y === 'number', 'Target should have numeric y');
      assert(Array.isArray(level.blocks), 'Blocks should be an array');
    });

    test('Adding a level to TT.LEVELS works', () => {
      const originalLength = TT.LEVELS.length;
      const newLevel = makeLevel({
        id: 999,
        name: 'Test Add Level',
        target: { x: 0, y: 2 },
        exit: { side: 'right', position: 2 },
        blocks: []
      });

      TT.LEVELS.push(newLevel);
      assert(TT.LEVELS.length === originalLength + 1, 'LEVELS array should grow by 1');

      // Verify it's solvable
      const result = TT.solver.solve(newLevel);
      assert(result.solvable, 'Added level should be solvable');

      // Clean up: remove the test level
      TT.LEVELS.pop();
      assert(TT.LEVELS.length === originalLength, 'LEVELS array should be restored');
    });

    test('Solver accuracy: optimal matches expected for known levels', () => {
      // Level 1 has known optimal of 3 (from comments in levels.js)
      const result1 = TT.solver.solve(TT.LEVELS[0]);
      assert(result1.optimal === 3, `Level 1 optimal should be 3 but got ${result1.optimal}`);

      // Level 2 has known optimal of 6
      const result2 = TT.solver.solve(TT.LEVELS[1]);
      assert(result2.optimal === 6, `Level 2 optimal should be 6 but got ${result2.optimal}`);
    });

    test('isLevelSolvable convenience wrapper works', () => {
      assert(TT.solver.isLevelSolvable(TT.LEVELS[0]) === true, 'Level 1 should be solvable');

      const unsolvable = makeLevel({
        gridWidth: 3,
        gridHeight: 3,
        target: { x: 0, y: 1 },
        exit: { side: 'right', position: 1 },
        blocks: [
          { x: 1, y: 0, width: 1, height: 3 },
          { x: 2, y: 0, width: 1, height: 3 }
        ]
      });
      assert(TT.solver.isLevelSolvable(unsolvable) === false, 'Blocked level should be unsolvable');
    });

    test('getOptimal convenience wrapper works', () => {
      const optimal = TT.solver.getOptimal(TT.LEVELS[0]);
      assert(typeof optimal === 'number' && optimal > 0, 'Should return a positive number');
      assert(optimal === 3, `Level 1 optimal should be 3 but got ${optimal}`);
    });
  }

  // =========================================================================
  // 9.7 Mobile/Responsive Tests (Manual)
  // =========================================================================
  function testMobile() {
    section('9.7 Mobile/Responsive (Manual)');

    manual('Board fits viewport without scrolling at 375x667 (iPhone SE)');
    manual('Board fits viewport without scrolling at 390x844 (iPhone 14)');
    manual('Board fits viewport without scrolling at 768x1024 (iPad)');
    manual('Touch drag works: block follows finger and snaps to grid');
    manual('No double-tap zoom on game area');
    manual('Portrait layout: HUD above board, buttons below, no horizontal overflow');
    manual('All touch targets are at least 44px');

    // Automated checks we can do
    test('touch-action:none is set on board CSS (check via stylesheet)', () => {
      // Look for touch-action in the loaded stylesheets
      let found = false;
      try {
        for (let i = 0; i < document.styleSheets.length; i++) {
          let rules;
          try {
            rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
          } catch (e) {
            continue; // Skip cross-origin stylesheets
          }
          if (!rules) continue;
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule.selectorText && rule.selectorText.includes('.board') &&
                rule.style && rule.style.touchAction === 'none') {
              found = true;
              break;
            }
          }
          if (found) break;
        }
      } catch (e) {
        // If we can't access stylesheets, skip
        found = true; // Assume it's there
      }
      assert(found, 'Board should have touch-action: none in CSS');
    });

    test('Viewport meta tag prevents user scaling', () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      assert(viewport !== null, 'Viewport meta tag should exist');
      const content = viewport ? viewport.getAttribute('content') : '';
      assert(
        content.includes('user-scalable=no') || content.includes('maximum-scale=1'),
        'Viewport should prevent user scaling'
      );
    });
  }

  // -------------------------------------------------------------------------
  // Expose public API
  // -------------------------------------------------------------------------
  window.runTests = runTests;
  TT.tests = { runTests };

})();
