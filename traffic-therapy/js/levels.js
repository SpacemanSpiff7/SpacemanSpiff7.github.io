// levels.js -- Level data
// Depends on: nothing (loaded early, sets up TT namespace)
window.TT = window.TT || {};

// ---------------------------------------------------------------------------
// LEVELS array -- hand-crafted level data
// ---------------------------------------------------------------------------
// Level data format (see SPEC.md Section 4.1):
//   id           -- unique level number
//   name         -- display name
//   gridWidth    -- number of columns
//   gridHeight   -- number of rows
//   par          -- par move count (never shown to player)
//   exit         -- { side: "top"|"bottom"|"left"|"right", position: <0-indexed cell> }
//   target       -- { x, y } starting position of the 1x1 target block
//   blocks       -- array of { x, y, width, height, color }
//
// Block orientation rules:
//   width > height  => horizontal, slides left/right only
//   height > width  => vertical,   slides up/down only
//   width == height => can move any direction (including 1x1 target)

TT.LEVELS = [
  // -----------------------------------------------------------------------
  // Level 1: First Steps  (optimal 3, par 5)
  // A gentle introduction. Three blocks, one short dependency chain.
  // -----------------------------------------------------------------------
  {
    id: 1,
    name: "First Steps",
    gridWidth: 5,
    gridHeight: 5,
    par: 5,
    exit: { side: "right", position: 2 },
    target: { x: 0, y: 2 },
    blocks: [
      // Vertical 1x2 in col 2 -- blocks row 2 at x=2
      { x: 2, y: 1, width: 1, height: 2, color: "#5B7B9F" },
      // Horizontal 2x1 in row 0 -- blocks col-2 vert from going up
      { x: 1, y: 0, width: 2, height: 1, color: "#7B6B8F" },
      // Vertical 1x2 in col 4 -- blocks row 2 at x=4
      { x: 4, y: 2, width: 1, height: 2, color: "#4F7B7B" }
    ]
  },

  // -----------------------------------------------------------------------
  // Level 2: Side Street  (optimal 6, par 9)
  // A 1x3 vertical blocker in the center creates a taller obstacle that
  // must be cleared with care.
  // -----------------------------------------------------------------------
  {
    id: 2,
    name: "Side Street",
    gridWidth: 5,
    gridHeight: 5,
    par: 9,
    exit: { side: "right", position: 2 },
    target: { x: 0, y: 2 },
    blocks: [
      // Vertical 1x3 in col 2 -- tall blocker spanning rows 0-2
      { x: 2, y: 0, width: 1, height: 3, color: "#5B7B9F" },
      // Horizontal 2x1 in row 0 -- constrains vertical movement
      { x: 3, y: 0, width: 2, height: 1, color: "#7B6B8F" },
      // Vertical 1x2 in col 4 -- blocks exit side
      { x: 4, y: 1, width: 1, height: 2, color: "#4F7B7B" },
      // Horizontal 2x1 in row 3 -- limits downward escapes
      { x: 0, y: 3, width: 2, height: 1, color: "#6B5B8F" }
    ]
  },

  // -----------------------------------------------------------------------
  // Level 3: Gridlock  (optimal 10, par 14)
  // Six blocks forming a web of interdependencies. A tall 1x3 vertical
  // in the center creates a significant barrier.
  // -----------------------------------------------------------------------
  {
    id: 3,
    name: "Gridlock",
    gridWidth: 5,
    gridHeight: 5,
    par: 14,
    exit: { side: "right", position: 2 },
    target: { x: 1, y: 2 },
    blocks: [
      // Horizontal 2x1 in row 0
      { x: 0, y: 0, width: 2, height: 1, color: "#5B7B9F" },
      // Vertical 1x2 in col 3
      { x: 3, y: 0, width: 1, height: 2, color: "#7B6B8F" },
      // Vertical 1x3 in col 2 -- tall central blocker spanning rows 1-3
      { x: 2, y: 1, width: 1, height: 3, color: "#4F7B7B" },
      // Vertical 1x2 in col 4
      { x: 4, y: 1, width: 1, height: 2, color: "#6B5B8F" },
      // Horizontal 2x1 in row 3
      { x: 0, y: 3, width: 2, height: 1, color: "#8F6B5B" },
      // Horizontal 2x1 in row 3 (right side)
      { x: 3, y: 3, width: 2, height: 1, color: "#5B8F6B" }
    ]
  },

  // -----------------------------------------------------------------------
  // Level 4: Rush Hour  (optimal 12, par 16)
  // Seven blocks and an exit on row 1 instead of row 2. Two 1x3 vertical
  // pieces and dense packing require careful multi-step planning.
  // -----------------------------------------------------------------------
  {
    id: 4,
    name: "Rush Hour",
    gridWidth: 5,
    gridHeight: 5,
    par: 16,
    exit: { side: "right", position: 1 },
    target: { x: 0, y: 1 },
    blocks: [
      // Vertical 1x3 in col 1 -- tall blocker rows 0-2
      { x: 1, y: 0, width: 1, height: 3, color: "#5B7B9F" },
      // Vertical 1x2 in col 2
      { x: 2, y: 0, width: 1, height: 2, color: "#7B6B8F" },
      // Horizontal 2x1 in row 0
      { x: 3, y: 0, width: 2, height: 1, color: "#4F7B7B" },
      // Vertical 1x2 in col 0 (rows 2-3)
      { x: 0, y: 2, width: 1, height: 2, color: "#6B5B8F" },
      // Vertical 1x2 in col 3
      { x: 3, y: 1, width: 1, height: 2, color: "#8F6B5B" },
      // Vertical 1x3 in col 4 -- tall blocker rows 1-3
      { x: 4, y: 1, width: 1, height: 3, color: "#5B8F6B" },
      // Horizontal 2x1 in row 3
      { x: 2, y: 3, width: 2, height: 1, color: "#7B5B6B" }
    ]
  },

  // -----------------------------------------------------------------------
  // Level 5: Parking Lot  (optimal 14, par 20)
  // Eight blocks including two 1x3 verticals. The densest and most
  // interconnected puzzle — every move matters.
  // -----------------------------------------------------------------------
  {
    id: 5,
    name: "Parking Lot",
    gridWidth: 5,
    gridHeight: 5,
    par: 20,
    exit: { side: "right", position: 2 },
    target: { x: 0, y: 2 },
    blocks: [
      // Vertical 1x2 in col 0
      { x: 0, y: 0, width: 1, height: 2, color: "#5B7B9F" },
      // Vertical 1x3 in col 1 -- tall blocker rows 0-2
      { x: 1, y: 0, width: 1, height: 3, color: "#7B6B8F" },
      // Horizontal 2x1 in row 0
      { x: 2, y: 0, width: 2, height: 1, color: "#4F7B7B" },
      // Vertical 1x2 in col 4
      { x: 4, y: 0, width: 1, height: 2, color: "#6B5B8F" },
      // Vertical 1x3 in col 2 -- tall blocker rows 1-3
      { x: 2, y: 1, width: 1, height: 3, color: "#8F6B5B" },
      // Vertical 1x2 in col 3
      { x: 3, y: 1, width: 1, height: 2, color: "#5B8F6B" },
      // Horizontal 2x1 in row 3
      { x: 0, y: 3, width: 2, height: 1, color: "#7B5B6B" },
      // Horizontal 2x1 in row 4
      { x: 3, y: 4, width: 2, height: 1, color: "#6B7B5B" }
    ]
  }
];
