import { getTileDescriptor } from '../constants.js';
import { bfsPath } from '../pathfinding/bfs';

export function resolveTapAction({ tileX, tileY, playerTile, mobs, grid, playerFaction }) {
  if (!playerTile) {
    return { type: 'PATH_STEPS', steps: [] };
  }

  const px = Math.round(playerTile.x);
  const py = Math.round(playerTile.y);
  const dx = tileX - px;
  const dy = tileY - py;
  const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));

  if (chebyshev === 0) {
    return { type: 'WAIT' };
  }

  if (chebyshev <= 1) {
    const npc = mobs && Object.values(mobs).find(
      m => m.type === 'npc' && Math.round(m.pos.x) === tileX && Math.round(m.pos.y) === tileY
    );
    if (npc) {
      return { type: 'NPC_INTERACT', npc_id: npc.id };
    }
    const tile = grid?.[tileY]?.[tileX];
    const tileBlocker = getTileDescriptor(tile).onInteract(tile);
    if (tileBlocker?.action === 'open-alchemy') {
      return { type: 'OPEN_ALCHEMY' };
    }
  }

  if (chebyshev === 1) {
    let direction = null;
    if (dx === 0 && dy === -1) direction = 'UP';
    else if (dx === 0 && dy === 1) direction = 'DOWN';
    else if (dx === -1 && dy === 0) direction = 'LEFT';
    else if (dx === 1 && dy === 0) direction = 'RIGHT';
    else if (dx === -1 && dy === -1) direction = 'UP_LEFT';
    else if (dx === 1 && dy === -1) direction = 'UP_RIGHT';
    else if (dx === -1 && dy === 1) direction = 'DOWN_LEFT';
    else if (dx === 1 && dy === 1) direction = 'DOWN_RIGHT';
    return { type: 'MOVE', direction };
  }

  if (grid && grid.length > 0) {
    const height = grid.length;
    const width = grid[0].length;

    let hostileMobs;
    if (mobs && playerFaction) {
      hostileMobs = new Set();
      for (const m of Object.values(mobs)) {
        if (m.is_alive && m.faction !== playerFaction) {
          hostileMobs.add(`${Math.round(m.pos.x)},${Math.round(m.pos.y)}`);
        }
      }
    }

    const steps = bfsPath(grid, width, height, px, py, tileX, tileY, { hostileMobs });
    return { type: 'PATH_STEPS', steps };
  }

  return { type: 'PATH_STEPS', steps: [] };
}
