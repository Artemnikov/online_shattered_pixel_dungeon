import type { RenderPlayer, EntitiesState } from '../net/types';
import { isPassable } from '../pathfinding/passableLookup.js';
import { MOVE_DURATION } from '../constants.js';

// SPD-authentic pacing: a diagonal step costs the same as an orthogonal one
// (matches the server's flat AUTO_MOVE_INTERVAL after the √2 cost was dropped).
function stepDuration(_dx: number, _dy: number): number {
  return MOVE_DURATION;
}

const BLOCKING_DEBUFFS = new Set(['paralysis', 'frozen', 'stagger', 'roots', 'daze']);

let predictedPos: { x: number; y: number } | null = null;
let pendingMove = false;
let lastStepTime = 0;
let pendingPathSteps: Array<{ dx: number; dy: number }> = [];
// Last server-confirmed tile. Lets reconcile() tell "server hasn't processed
// our step yet" (pos unchanged) apart from a real rejection (pos moved
// somewhere unexpected), so mere lag never snaps the avatar backward.
let confirmedPos: { x: number; y: number } | null = null;
// Predicted destination tiles not yet server-confirmed (oldest first). The
// client routinely runs a step ahead of the server, so a server position
// inside this list means "catching up", not "rejected".
let unconfirmedSteps: Array<{ x: number; y: number }> = [];

// Upper bound on how long a prediction may stay unconfirmed before it's
// treated as rejected (server steps at MOVE_INTERVAL cadence, so anything
// beyond ~2 steps of silence means the step never happened server-side).
const PENDING_TIMEOUT_MS = MOVE_DURATION * 2.5;

// Corrections up to this many tiles are smoothed into a constant-velocity
// glide; anything larger is teleport-class (stairs, respawn) and gets a
// single quick hop, normally hidden under the floor fade.
const SMOOTH_GLIDE_MAX_TILES = 3;

function chebyshevDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

// A running step is chainable once its animation is over — either renderPos
// has arrived or the clock says it should have (the rAF loop may not have
// written the final position yet).
function stepAnimComplete(player: RenderPlayer): boolean {
  const target = player.targetPos;
  if (!target) return true;
  if (Math.abs(player.renderPos.x - target.x) < 0.01
      && Math.abs(player.renderPos.y - target.y) < 0.01) return true;
  if (player.animStartTime == null) return false;
  return performance.now() - player.animStartTime >= (player.moveDuration || MOVE_DURATION);
}

// Re-anchor the walk animation onto (tx, ty). Small corrections glide at
// walking speed so server sync never reads as a freeze-then-lunge.
function retarget(player: RenderPlayer, tx: number, ty: number, updateFacing: boolean): void {
  player.animStartPos = { x: player.renderPos.x, y: player.renderPos.y };
  player.animStartTime = performance.now();
  player.targetPos = { x: tx, y: ty };
  const dist = chebyshevDist(tx, ty, player.renderPos.x, player.renderPos.y);
  player.moveDuration = dist <= SMOOTH_GLIDE_MAX_TILES
    ? Math.max(MOVE_DURATION, Math.round(dist * MOVE_DURATION))
    : MOVE_DURATION;
  if (!updateFacing) return;
  const dx = tx - Math.round(player.renderPos.x);
  const dy = ty - Math.round(player.renderPos.y);
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) { player.facing = 'RIGHT'; player.flipX = false; }
    else if (dx < 0) { player.facing = 'LEFT'; player.flipX = true; }
  } else {
    if (dy > 0) player.facing = 'DOWN';
    else if (dy < 0) player.facing = 'UP';
  }
}

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

export function redirectMove(
  player: RenderPlayer,
  dx: number,
  dy: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
): boolean {
  if (!pendingMove || !canPredict(player)) return false;
  const now = performance.now();
  // Allow redirecting a pending step if we are in the early phase of the animation
  if (now - lastStepTime > MOVE_DURATION * 0.5) return false;

  // Origin for redirection MUST be the starting point of the current unconfirmed step sequence
  // (or current tile if confirmed), NOT adding the new vector on top of previous step or unconfirmed steps.
  const startTile = unconfirmedSteps.length > 1
    ? unconfirmedSteps[unconfirmedSteps.length - 2]
    : confirmedPos || {
      x: Math.round(player.animStartPos?.x ?? player.renderPos.x),
      y: Math.round(player.animStartPos?.y ?? player.renderPos.y),
    };

  const newX = startTile.x + dx;
  const newY = startTile.y + dy;

  if (isBlocked(newX, newY, playerId, grid, entities)) return false;

  predictedPos = { x: newX, y: newY };
  if (unconfirmedSteps.length > 0) {
    unconfirmedSteps[unconfirmedSteps.length - 1] = { x: newX, y: newY };
  } else {
    unconfirmedSteps = [{ x: newX, y: newY }];
  }
  lastStepTime = now;

  if (dx === 1) { player.facing = 'RIGHT'; player.flipX = false; }
  else if (dx === -1) { player.facing = 'LEFT'; player.flipX = true; }
  else if (dy === 1) player.facing = 'DOWN';
  else if (dy === -1) player.facing = 'UP';

  retarget(player, newX, newY, true);
  return true;
}

export function predictMove(
  player: RenderPlayer,
  dx: number,
  dy: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
): boolean {
  if (pendingMove) {
    return redirectMove(player, dx, dy, playerId, grid, entities);
  }
  // Wait until any running visual animation is complete before starting a new step
  // from targetPos; this prevents multi-tile jumps when keys are tapped in flight.
  if (!stepAnimComplete(player)) return false;
  if (!canPredict(player)) return false;

  const from = player.targetPos || player.renderPos;
  const newX = Math.round(from.x) + dx;
  const newY = Math.round(from.y) + dy;

  if (isBlocked(newX, newY, playerId, grid, entities)) return false;

  predictedPos = { x: newX, y: newY };
  pendingMove = true;
  lastStepTime = performance.now();
  unconfirmedSteps.push({ x: newX, y: newY });
  if (unconfirmedSteps.length > 32) unconfirmedSteps.shift();

  if (dx === 1) { player.facing = 'RIGHT'; player.flipX = false; }
  else if (dx === -1) { player.facing = 'LEFT'; player.flipX = true; }
  else if (dy === 1) player.facing = 'DOWN';
  else if (dy === -1) player.facing = 'UP';

  player.animStartPos = { x: player.renderPos.x, y: player.renderPos.y };
  player.animStartTime = performance.now();
  player.targetPos = { x: newX, y: newY };
  player.moveDuration = stepDuration(dx, dy);

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
  // Cap client prediction: do not allow accumulating more than 1 unconfirmed step
  // ahead of the server. This prevents prediction overrun where the client runs
  // multiple steps ahead and triggers a false reconciliation fallback when key
  // directions change.
  if (unconfirmedSteps.length >= 1) return false;

  const now = performance.now();
  if (now - lastStepTime < stepDuration(dx, dy)) return false;
  // Always wait until the previous step's visual animation on screen is complete.
  if (!stepAnimComplete(player)) return false;
  if (pendingMove) {
    pendingMove = false;
    predictedPos = null;
  }
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
  const next = pendingPathSteps[0];
  if (now - lastStepTime < stepDuration(next.dx, next.dy)) return false;
  if (pendingMove) {
    // Same chaining rule as paceStep: wait for the running step's animation
    // to finish, and never shift the queue unless a step truly fires.
    if (!stepAnimComplete(player)) return false;
    pendingMove = false;
    predictedPos = null;
  }
  pendingPathSteps.shift();
  return predictMove(player, next.dx, next.dy, playerId, grid, entities);
}

export function onMoveResult(
  data: { entity: string; x: number; y: number; ok: boolean },
  player: RenderPlayer | null,
): void {
  if (data.ok || !pendingMove || !predictedPos || !player) return;
  // Server rejected the predicted step (wall/mob/door/stagger...): cancel the
  // prediction immediately and glide back to the reported tile at walking
  // speed instead of freezing until the timeout and rubber-banding. Facing is
  // kept — SPD's bump animation doesn't turn the hero around.
  const rx = Math.round(data.x);
  const ry = Math.round(data.y);
  confirmedPos = { x: rx, y: ry };
  predictedPos = null;
  pendingMove = false;
  pendingPathSteps = [];
  unconfirmedSteps = [];
  lastStepTime = performance.now();
  retarget(player, rx, ry, false);
}

export function reconcile(
  serverPosition: { x: number; y: number },
  player: RenderPlayer,
): void {
  const sx = Math.round(serverPosition.x);
  const sy = Math.round(serverPosition.y);

  if (!pendingMove || !predictedPos) {
    confirmedPos = { x: sx, y: sy };
    unconfirmedSteps = [];
    return;
  }

  if (sx === predictedPos.x && sy === predictedPos.y) {
    // Server reached the predicted tile: prediction confirmed.
    confirmedPos = { x: sx, y: sy };
    predictedPos = null;
    pendingMove = false;
    unconfirmedSteps = [];
    return;
  }

  // Server is catching up through earlier predicted tiles (the client runs up
  // to a step ahead): acknowledge the progress, keep the prediction.
  const caughtUpIdx = unconfirmedSteps.findIndex(s => s.x === sx && s.y === sy);
  if (caughtUpIdx >= 0) {
    confirmedPos = { x: sx, y: sy };
    unconfirmedSteps = unconfirmedSteps.slice(caughtUpIdx + 1);
    if (unconfirmedSteps.length === 0) {
      predictedPos = null;
      pendingMove = false;
    } else {
      predictedPos = unconfirmedSteps[unconfirmedSteps.length - 1];
    }
    return;
  }

  // Server AHEAD of the prediction (client starved under load, or an external
  // move like knockback): adopt the server tile as the new walk target with
  // constant walking velocity — never a stop-then-lunge. Facing stays put.
  const idleAtConfirmed = confirmedPos !== null && sx === confirmedPos.x && sy === confirmedPos.y;
  if (!idleAtConfirmed
      && chebyshevDist(predictedPos.x, predictedPos.y, sx, sy) <= SMOOTH_GLIDE_MAX_TILES) {
    confirmedPos = { x: sx, y: sy };
    predictedPos = null;
    pendingMove = false;
    unconfirmedSteps = [];
    lastStepTime = performance.now();
    retarget(player, sx, sy, false);
    return;
  }

  // Server stuck at the last confirmed tile: mere lag inside the timeout,
  // otherwise a silent rejection nobody signalled (packet-loss fallback).
  if (idleAtConfirmed && performance.now() - lastStepTime < PENDING_TIMEOUT_MS) {
    return;
  }

  // Teleport-class divergence (stairs, respawn, big knockback): give up on
  // the prediction and hop to the server tile.
  confirmedPos = { x: sx, y: sy };
  predictedPos = null;
  pendingMove = false;
  pendingPathSteps = [];
  unconfirmedSteps = [];
  lastStepTime = performance.now();
  retarget(player, sx, sy, true);
}

export function clear(): void {
  predictedPos = null;
  pendingMove = false;
  pendingPathSteps = [];
  lastStepTime = 0;
  confirmedPos = null;
  unconfirmedSteps = [];
}
