import { isWallStitcheable } from '../../constants.js';

// Visibility states, darkest wins via Math.max.
export const VIS_VISIBLE = 0;
export const VIS_DISCOVERED = 1;
export const VIS_UNSEEN = 2;

export const cellVisState = (vision, x, y) => {
  const key = `${x},${y}`;
  if (vision.visible.has(key)) return VIS_VISIBLE;
  if (vision.discovered.has(key)) return VIS_DISCOVERED;
  return VIS_UNSEEN;
};

export const tileAt = (grid, x, y) => {
  if (y < 0 || y >= grid.length) return -1;
  const row = grid[y];
  if (x < 0 || x >= row.length) return -1;
  return row[x];
};

const sideDarkness = (grid, vision, x, y, selfState, neighborX) => {
  const neighborIsWall = isWallStitcheable(tileAt(grid, neighborX, y));
  if (neighborIsWall) {
    if (isWallStitcheable(tileAt(grid, neighborX, y + 1))) {
      return VIS_UNSEEN;
    }
    return Math.max(
      selfState,
      cellVisState(vision, neighborX, y + 1),
      cellVisState(vision, neighborX, y)
    );
  }
  return Math.max(selfState, cellVisState(vision, neighborX, y));
};

export const wallEdgeDarkness = (grid, vision, x, y) => {
  const below = tileAt(grid, x, y + 1);

  // Last row / off the bottom of the map: always fully dark.
  if (below === -1) {
    return { left: VIS_UNSEEN, right: VIS_UNSEEN };
  }

  const selfState = cellVisState(vision, x, y);

  // Camera-facing wall (floor below): whole cell takes the darker of
  // itself and the cell below.
  if (!isWallStitcheable(below)) {
    const darkness = Math.max(selfState, cellVisState(vision, x, y + 1));
    return { left: darkness, right: darkness };
  }

  // Internal wall (below is also a wall): split into halves.
  return {
    left: sideDarkness(grid, vision, x, y, selfState, x - 1),
    right: sideDarkness(grid, vision, x, y, selfState, x + 1),
  };
};
