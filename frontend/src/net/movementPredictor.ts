import type { RenderPlayer, EntitiesState } from '../net/types';
import { isPassable } from '../pathfinding/passableLookup';

const AUTO_MOVE_INTERVAL_MS = 150;

const BLOCKING_DEBUFFS = new Set(['paralysis', 'frozen', 'stagger', 'roots', 'daze']);

let predictedPos: { x: number; y: number } | null = null;
let pendingMove = false;
let lastStepTime = 0;
let pendingPathSteps: Array<{ dx: number; dy: number }> = [];

export function canPredict(player: RenderPlayer): boolean {
  if (player.buffs?.some(b => BLOCKING_DEBUFFS.has(b.type))) return false;
  if (player.is_downed) return false;
  return true;
}

function isBlocked(
  newX: number,
  newY: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
): boolean {
  const row = grid[newY];
  if (!row) return true;
  const tile = row[newX];
  if (tile === undefined) return true;
  if (!isPassable(tile)) return true;

  for (const m of Object.values(entities.mobs)) {
    if (m.is_alive && Math.round(m.pos.x) === newX && Math.round(m.pos.y) === newY) return true;
  }
  for (const p of Object.values(entities.players)) {
    if (p.id !== playerId && Math.round(p.pos.x) === newX && Math.round(p.pos.y) === newY) return true;
  }
  return false;
}

export function isPending(): boolean {
  return pendingMove;
}

export function predictMove(
  player: RenderPlayer,
  dx: number,
  dy: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
): boolean {
  if (pendingMove) return false;
  if (!canPredict(player)) return false;

  const from = player.targetPos || player.renderPos;
  const newX = Math.round(from.x) + dx;
  const newY = Math.round(from.y) + dy;

  if (isBlocked(newX, newY, playerId, grid, entities)) return false;

  predictedPos = { x: newX, y: newY };
  pendingMove = true;
  lastStepTime = performance.now();

  if (dx === 1) { player.facing = 'RIGHT'; player.flipX = false; }
  else if (dx === -1) { player.facing = 'LEFT'; player.flipX = true; }
  else if (dy === 1) player.facing = 'DOWN';
  else if (dy === -1) player.facing = 'UP';

  player.animStartPos = { x: player.renderPos.x, y: player.renderPos.y };
  player.animStartTime = performance.now();
  player.targetPos = { x: newX, y: newY };

  return true;
}

export function paceStep(
  player: RenderPlayer,
  dx: number,
  dy: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
): boolean {
  if (!pendingMove) return false;
  const now = performance.now();
  if (now - lastStepTime < AUTO_MOVE_INTERVAL_MS) return false;
  return predictMove(player, dx, dy, playerId, grid, entities);
}

export function startPath(
  player: RenderPlayer,
  steps: Array<{ dx: number; dy: number }>,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
): boolean {
  if (steps.length === 0) return false;
  const first = steps[0];
  const moved = predictMove(player, first.dx, first.dy, playerId, grid, entities);
  if (moved) {
    pendingPathSteps = steps.slice(1);
  }
  return moved;
}

export function pacePathStep(
  player: RenderPlayer,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
): boolean {
  if (pendingPathSteps.length === 0) return false;
  const now = performance.now();
  if (now - lastStepTime < AUTO_MOVE_INTERVAL_MS) return false;
  const next = pendingPathSteps.shift()!;
  return predictMove(player, next.dx, next.dy, playerId, grid, entities);
}

export function onMoveResult(_data: { entity: string; x: number; y: number; ok: boolean }): void {
  // Intentionally a no-op — reconcile() in syncState handles position correction.
  // MOVE_RESULT arriving before the next reconcile just confirms the server
  // processed our intent; the actual snap/confirm happens in reconcile().
}

export function reconcile(
  serverPosition: { x: number; y: number },
  player: RenderPlayer,
): void {
  if (!pendingMove || !predictedPos) return;

  const sx = Math.round(serverPosition.x);
  const sy = Math.round(serverPosition.y);

  if (sx === predictedPos.x && sy === predictedPos.y) {
    predictedPos = null;
    pendingMove = false;
  } else {
    predictedPos = null;
    pendingMove = false;
    pendingPathSteps = [];

    player.animStartPos = { x: player.renderPos.x, y: player.renderPos.y };
    player.animStartTime = performance.now();
    player.targetPos = { x: sx, y: sy };

    const dx = sx - Math.round(player.renderPos.x);
    const dy = sy - Math.round(player.renderPos.y);
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) { player.facing = 'RIGHT'; player.flipX = false; }
      else if (dx < 0) { player.facing = 'LEFT'; player.flipX = true; }
    } else {
      if (dy > 0) player.facing = 'DOWN';
      else if (dy < 0) player.facing = 'UP';
    }
  }
}

export function clear(): void {
  predictedPos = null;
  pendingMove = false;
  pendingPathSteps = [];
  lastStepTime = 0;
}
