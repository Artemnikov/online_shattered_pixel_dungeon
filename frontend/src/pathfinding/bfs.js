import { isPassable, CHASM_TILE } from './passableLookup';

const DIRS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const MAX_VISITED = 500;

/**
 * BFS pathfinding for tap-to-travel.
 * Returns list of (dx, dy) steps from start to target, or [] if unreachable.
 *
 * @param {number[][]} grid   – tile ID grid
 * @param {number} width
 * @param {number} height
 * @param {number} startX
 * @param {number} startY
 * @param {number} targetX
 * @param {number} targetY
 * @param {object}  [opts]
 * @param {Set<string>} [opts.hostileMobs] – "x,y" positions to avoid (target exempt)
 * @returns {[number, number][]}
 */
export function bfsPath(grid, width, height, startX, startY, targetX, targetY, opts) {
  if (startX === targetX && startY === targetY) return [];

  const hostileMobs = opts?.hostileMobs;
  const visited = new Uint8Array(width * height);
  visited[startY * width + startX] = 1;

  // Each queue entry: [x, y, pathSteps[]]
  const queue = [[startX, startY, []]];
  let head = 0;

  while (head < queue.length) {
    const [x, y, path] = queue[head++];

    for (let d = 0; d < 8; d++) {
      const nx = x + DIRS[d][0];
      const ny = y + DIRS[d][1];

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const idx = ny * width + nx;
      if (visited[idx]) continue;

      const tile = grid[ny][nx];
      if (!isPassable(tile) && !(tile === CHASM_TILE && nx === targetX && ny === targetY)) {
        continue;
      }

      const isTarget = nx === targetX && ny === targetY;
      if (!isTarget && hostileMobs && hostileMobs.has(`${nx},${ny}`)) {
        continue;
      }

      visited[idx] = 1;
      const step = [DIRS[d][0], DIRS[d][1]];
      const nextPath = path.length === 0 ? [step] : [...path, step];

      if (isTarget) return nextPath;
      queue.push([nx, ny, nextPath]);
    }

    if (queue.length > MAX_VISITED) break;
  }

  return [];
}
