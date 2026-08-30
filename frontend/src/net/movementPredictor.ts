import type {
  RenderPlayer,
  RenderMob,
  EntitiesState,
  SerializedItem,
  BlockingEntity,
  MoveResult,
  BumpAction,
  TrapInfo,
} from '../net/types';
import { isPassable } from '../pathfinding/passableLookup.js';
import { BACKEND_TILE } from '../rendering/sewers/constants.js';
import { MOVE_DURATION } from '../constants.js';

function stepDuration(_dx: number, _dy: number): number {
  return MOVE_DURATION;
}

const BLOCKING_DEBUFFS = new Set(['paralysis', 'frozen', 'stagger', 'roots', 'daze']);

let predictedPos: { x: number; y: number } | null = null;
let pendingMove = false;
let lastStepTime = 0;
let pendingPathSteps: Array<{ dx: number; dy: number }> = [];
let confirmedPos: { x: number; y: number } | null = null;
let unconfirmedSteps: Array<{ x: number; y: number }> = [];

const PENDING_TIMEOUT_MS = MOVE_DURATION * 2.5;

const SMOOTH_GLIDE_MAX_TILES = 3;

function chebyshevDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function stepAnimComplete(player: RenderPlayer): boolean {
  const target = player.targetPos;
  if (!target) return true;
  if (Math.abs(player.renderPos.x - target.x) < 0.01
      && Math.abs(player.renderPos.y - target.y) < 0.01) return true;
  if (player.animStartTime == null) return false;
  return performance.now() - player.animStartTime >= (player.moveDuration || MOVE_DURATION);
}

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

// --- bump classification ----------------------------------------------------
//
// Server bump semantics (movement.py / melee.py): an *owned* ally (Mirror
// Image / Ghost Hero with owner_id === player) is pushed through — the server
// swaps positions — so it is never a blocker. A bump into a Shopkeeper/Ghost
// pushes SHOP_OPEN/dialogue, into a chest pushes OPEN_CHEST, into any other
// living mob is a melee attack. Those map to the BumpActions below; only
// 'melee-attack' has real local work today (predicted slash before the server
// ATTACK confirm), the rest are server-driven.

const MERCHANT_NAMES = new Set(['Shopkeeper']);

function livingBlocker(m: RenderMob, playerId: string): BlockingEntity | null {
  if (m.is_alive === false) return null;
  if (m.type === 'ghost_hero' || m.type === 'mirror_image') {
    // Owned allies are pushed through by the server — walk onto their tile.
    if (m.faction === 'player' && m.owner_id === playerId) return null;
    return { kind: 'ally', id: m.id, name: m.name, action: 'face-only' };
  }
  if (m.type === 'npc') {
    return m.name && MERCHANT_NAMES.has(m.name)
      ? { kind: 'merchant', id: m.id, name: m.name, action: 'npc-interact' }
      : { kind: 'quest-npc', id: m.id, name: m.name, action: 'npc-interact' };
  }
  return { kind: 'mob', id: m.id, name: m.name, action: 'melee-attack' };
}

// Everything notable on a destination tile, tagged with the action its bump
// should trigger. `item`/`trap` entries are informational (a lone potion or
// trap stays walkable); alchemy pots are solid but open their UI when bumped.
export function collectBlockers(
  x: number,
  y: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
  traps?: TrapInfo[],
): BlockingEntity[] {
  const blockers: BlockingEntity[] = [];
  const row = grid[y];
  const tile = row?.[x];

  if (tile === undefined) {
    blockers.push({ kind: 'wall', tile: undefined, action: 'none' });
  } else if (tile === BACKEND_TILE.ALCHEMY.id) {
    blockers.push({ kind: 'alchemy-table', action: 'open-alchemy' });
  } else if (!isPassable(tile)) {
    blockers.push({ kind: 'wall', tile, action: 'none' });
  }

  for (const it of entities.items || []) {
    const item = it as SerializedItem & { type?: string; chest_type?: string; opened?: boolean };
    const p = item.pos;
    if (p && Math.round(p.x) === x && Math.round(p.y) === y) {
      blockers.push(
        item.type === 'chest'
          ? { kind: 'chest', id: item.id, chestType: item.chest_type, opened: item.opened, action: 'open-chest' }
          : { kind: 'item', id: item.id, action: 'none' },
      );
    }
  }

  for (const m of Object.values(entities.mobs)) {
    const mx = m.targetPos?.x ?? m.pos.x;
    const my = m.targetPos?.y ?? m.pos.y;
    if (Math.round(mx) === x && Math.round(my) === y) {
      const blocker = livingBlocker(m, playerId);
      if (blocker) blockers.push(blocker);
    }
  }

  for (const p of Object.values(entities.players)) {
    if (p.id === playerId || p.is_downed) continue;
    const px = p.targetPos?.x ?? p.pos.x;
    const py = p.targetPos?.y ?? p.pos.y;
    if (Math.round(px) === x && Math.round(py) === y) {
      blockers.push({ kind: 'player', id: p.id, action: 'face-only' });
    }
  }

  if (traps) {
    for (const t of traps) {
      if (t.x === x && t.y === y) blockers.push({ kind: 'trap', trapType: t.trap_type, action: 'none' });
    }
  }

  return blockers;
}

const BUMP_PRECEDENCE: Record<BumpAction, number> = {
  'melee-attack': 6,
  'npc-interact': 5,
  'open-chest': 4,
  'open-alchemy': 3,
  'face-only': 2,
  'none': 1,
};

// The single entity whose bump flow wins when several share a tile.
export function primaryBlocker(blockers: BlockingEntity[]): BlockingEntity | null {
  let best: BlockingEntity | null = null;
  for (const b of blockers) {
    if (!best || BUMP_PRECEDENCE[b.action] > BUMP_PRECEDENCE[best.action]) best = b;
  }
  return best;
}

function isBump(blockers: BlockingEntity[]): boolean {
  return blockers.some(b =>
    b.kind === 'wall'
    || b.kind === 'alchemy-table'
    || b.kind === 'chest'
    || b.kind === 'mob'
    || b.kind === 'merchant'
    || b.kind === 'quest-npc'
    || b.kind === 'player'
    || b.kind === 'ally'
  );
}

// Face the blocker only when its bump has a visible flow (a bare wall/item/trap
// bump doesn't turn the hero, preserving pre-refactor behaviour).
function faceLiving(player: RenderPlayer, tx: number, ty: number, blockers: BlockingEntity[]): void {
  const primary = primaryBlocker(blockers);
  if (!primary || primary.action === 'none') return;
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

function bumpedOrNull(
  player: RenderPlayer,
  newX: number,
  newY: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
  traps?: TrapInfo[],
): MoveResult | null {
  const blockers = collectBlockers(newX, newY, playerId, grid, entities, traps);
  if (!isBump(blockers)) return null;
  faceLiving(player, newX, newY, blockers);
  return { kind: 'bumped', x: newX, y: newY, blockers };
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
  traps?: TrapInfo[],
): MoveResult {
  if (!pendingMove || !canPredict(player)) return { kind: 'busy' };
  const now = performance.now();
  // Allow redirecting a pending step if we are in the early phase of the animation
  if (now - lastStepTime > MOVE_DURATION * 0.5) return { kind: 'busy' };

  const startTile = unconfirmedSteps.length > 1
    ? unconfirmedSteps[unconfirmedSteps.length - 2]
    : confirmedPos || {
      x: Math.round(player.animStartPos?.x ?? player.renderPos.x),
      y: Math.round(player.animStartPos?.y ?? player.renderPos.y),
    };

  const newX = startTile.x + dx;
  const newY = startTile.y + dy;

  const bumped = bumpedOrNull(player, newX, newY, playerId, grid, entities, traps);
  if (bumped) return bumped;

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
  return { kind: 'moved' };
}

export function predictMove(
  player: RenderPlayer,
  dx: number,
  dy: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
  traps?: TrapInfo[],
): MoveResult {
  if (pendingMove) {
    return redirectMove(player, dx, dy, playerId, grid, entities, traps);
  }
  if (!canPredict(player)) return { kind: 'busy' };

  const from = player.targetPos || player.renderPos;
  const newX = Math.round(from.x) + dx;
  const newY = Math.round(from.y) + dy;

  // A bump takes priority over an in-flight step: walking into a mob / pot /
  // chest / NPC interrupts the walk and fires the local flow immediately
  // (even mid-step toward it), rather than waiting for the step to finish.
  const bumped = bumpedOrNull(player, newX, newY, playerId, grid, entities, traps);
  if (bumped) return bumped;

  if (!stepAnimComplete(player)) return { kind: 'busy' };

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

  return { kind: 'moved' };
}

export function paceStep(
  player: RenderPlayer,
  dx: number,
  dy: number,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
  traps?: TrapInfo[],
): MoveResult {
  if (unconfirmedSteps.length >= 1) return { kind: 'busy' };

  // Bump takes priority over step pacing: even mid-step, attempt the bump flow
  // every frame while holding toward the blocker instead of only at step
  // boundaries.
  const from = player.targetPos || player.renderPos;
  const nx = Math.round(from.x) + dx;
  const ny = Math.round(from.y) + dy;
  const bumped = bumpedOrNull(player, nx, ny, playerId, grid, entities, traps);
  if (bumped) return bumped;

  const now = performance.now();
  if (now - lastStepTime < stepDuration(dx, dy)) return { kind: 'busy' };
  if (!stepAnimComplete(player)) return { kind: 'busy' };
  if (pendingMove) {
    pendingMove = false;
    predictedPos = null;
  }
  return predictMove(player, dx, dy, playerId, grid, entities, traps);
}

export function startPath(
  player: RenderPlayer,
  steps: Array<{ dx: number; dy: number }>,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
  traps?: TrapInfo[],
): MoveResult {
  if (steps.length === 0) return { kind: 'busy' };
  const first = steps[0];
  const moved = predictMove(player, first.dx, first.dy, playerId, grid, entities, traps);
  if (moved.kind === 'moved') {
    pendingPathSteps = steps.slice(1);
  }
  return moved;
}

export function pacePathStep(
  player: RenderPlayer,
  playerId: string,
  grid: number[][],
  entities: EntitiesState,
  traps?: TrapInfo[],
): MoveResult {
  if (pendingPathSteps.length === 0) return { kind: 'busy' };
  const now = performance.now();
  const next = pendingPathSteps[0];

  const from = player.targetPos || player.renderPos;
  const nx = Math.round(from.x) + next.dx;
  const ny = Math.round(from.y) + next.dy;
  const bumped = bumpedOrNull(player, nx, ny, playerId, grid, entities, traps);
  if (bumped) return bumped;

  if (now - lastStepTime < stepDuration(next.dx, next.dy)) return { kind: 'busy' };
  if (pendingMove) {
    if (!stepAnimComplete(player)) return { kind: 'busy' };
    pendingMove = false;
    predictedPos = null;
  }
  pendingPathSteps.shift();
  return predictMove(player, next.dx, next.dy, playerId, grid, entities, traps);
}

export function onMoveResult(
  data: { entity: string; x: number; y: number; ok: boolean },
  player: RenderPlayer | null,
): void {
  if (data.ok || !pendingMove || !predictedPos || !player) return;
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

  if (idleAtConfirmed && performance.now() - lastStepTime < PENDING_TIMEOUT_MS) {
    return;
  }

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
