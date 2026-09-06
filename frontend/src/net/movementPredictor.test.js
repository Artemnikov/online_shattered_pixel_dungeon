import test from 'node:test';
import assert from 'node:assert/strict';
import * as movementPredictor from './movementPredictor.ts';
import { BACKEND_TILE } from '../constants.js';

function createMockPlayer(x = 10, y = 10) {
  return {
    id: 'p1',
    name: 'Hero',
    pos: { x, y },
    renderPos: { x, y },
    targetPos: null,
    animStartPos: null,
    animStartTime: null,
    moveDuration: 180,
    facing: 'RIGHT',
    flipX: false,
    hp: 20,
    max_hp: 20,
    buffs: [],
    is_downed: false,
  };
}

// 20x20 open floor (all passable = 2 for FLOOR)
const mockGrid = Array.from({ length: 20 }, () => Array(20).fill(2));
const mockEntities = { players: {}, mobs: {}, items: [] };

function mobAt(x, y, overrides = {}) {
  return { id: 'm1', name: 'Rat', is_alive: true, pos: { x, y }, ...overrides };
}

test('predictMove: starts step from rest', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, mockEntities);
  assert.equal(res.kind, 'moved');
  assert.equal(res.seq, 1);
  assert.equal(movementPredictor.isPending(), true);
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
});

test('predictMove: redirects in-flight step when diagonal key pressed early', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const initial = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, mockEntities);
  assert.equal(initial.kind, 'moved');
  assert.equal(initial.seq, 1);
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });

  const redirected = movementPredictor.predictMove(player, 1, -1, 'p1', mockGrid, mockEntities);
  assert.equal(redirected.kind, 'moved');
  assert.equal(redirected.seq, 2);
  assert.equal(redirected.replacedSeq, 1);
  assert.deepEqual(player.targetPos, { x: 11, y: 9 });
});

test('predictMove: does not stack a second step while animation is in flight', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, mockEntities);
  player.renderPos = { x: 10, y: 9.8 };
  movementPredictor.reconcile({ x: 10, y: 9 }, player);

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, mockEntities);
  assert.equal(res.kind, 'busy');
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
});

test('paceStep: chains next step once previous animation finishes', async () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  movementPredictor.predictMove(player, 1, -1, 'p1', mockGrid, mockEntities);
  movementPredictor.reconcile({ x: 11, y: 9 }, player);

  await new Promise(resolve => setTimeout(resolve, 190));

  player.renderPos = { x: 11, y: 9 };
  player.animStartTime = performance.now() - 200;

  const chained = movementPredictor.paceStep(player, 1, -1, 'p1', mockGrid, mockEntities);
  assert.equal(chained.kind, 'moved');
  assert.deepEqual(player.targetPos, { x: 12, y: 8 });
});

// --- living-mob bump (melee-attack) -----------------------------------------

test('predictMove: blocked by a mob does not walk, returns melee-attack bump and faces the mob', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {},
    mobs: { m1: mobAt(10, 9) },
    items: [],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);

  assert.equal(res.kind, 'bumped');
  assert.equal(res.x, 10);
  assert.equal(res.y, 9);
  assert.deepEqual(res.blockers, [{ kind: 'mob', id: 'm1', name: 'Rat', action: 'melee-attack' }]);
  assert.equal(player.targetPos, null);
  assert.equal(player.animStartTime, null);
  assert.equal(player.facing, 'UP');
});

test('predictMove: mid-step walk into a mob still bumps without mutating the in-flight walk', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);
  player.targetPos = { x: 10, y: 9 };
  player.animStartPos = { x: 10, y: 10 };
  player.animStartTime = performance.now() - 20;
  player.moveDuration = 180;
  player.renderPos = { x: 10, y: 9.5 };

  const entities = {
    players: {},
    mobs: { m1: mobAt(10, 8) },
    items: [],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);

  assert.equal(res.kind, 'bumped');
  assert.equal(res.blockers[0].action, 'melee-attack');
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
  assert.notEqual(player.animStartTime, null);
  assert.equal(player.facing, 'UP');
});

test('paceStep: fires melee-attack bump while mid-step toward a mob (keyboard hold path)', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);
  player.targetPos = { x: 10, y: 9 };
  player.animStartPos = { x: 10, y: 10 };
  player.animStartTime = performance.now() - 20;
  player.moveDuration = 180;
  player.renderPos = { x: 10, y: 9.5 };

  const entities = {
    players: {},
    mobs: { m1: mobAt(10, 8) },
    items: [],
  };

  const res = movementPredictor.paceStep(player, 0, -1, 'p1', mockGrid, entities);

  assert.equal(res.kind, 'bumped');
  assert.equal(res.blockers[0].action, 'melee-attack');
  assert.equal(player.facing, 'UP');
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
  assert.equal(movementPredictor.isPending(), false);
});

test('predictMove: bumps mob at its current target tile, not its stale spawn pos', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {},
    mobs: { m1: mobAt(10, 8, { targetPos: { x: 10, y: 9 } }) },
    items: [],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);

  assert.equal(res.kind, 'bumped');
  assert.equal(res.x, 10);
  assert.equal(res.y, 9);
  assert.deepEqual(res.blockers, [{ kind: 'mob', id: 'm1', name: 'Rat', action: 'melee-attack' }]);
  assert.equal(player.targetPos, null);
  assert.equal(player.animStartTime, null);
});

test('predictMove: blocked by a wall returns a wall bump with no facing change', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const solidWallGrid = Array.from({ length: 20 }, () => Array(20).fill(BACKEND_TILE.WALL.id));

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', solidWallGrid, mockEntities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers, [{ kind: 'wall', tile: BACKEND_TILE.WALL.id, action: 'none' }]);
  assert.equal(player.facing, 'RIGHT');
  assert.equal(player.targetPos, null);
});

test('predictMove: blocked by a void tile returns a chasm-jump bump and faces the void', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const voidGrid = Array.from({ length: 20 }, () => Array(20).fill(BACKEND_TILE.VOID.id));

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', voidGrid, mockEntities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers, [{ kind: 'chasm', tile: BACKEND_TILE.VOID.id, action: 'chasm-jump' }]);
  assert.equal(player.facing, 'UP');
  assert.equal(player.targetPos, null);
});

// --- NPC bump (npc-interact) ------------------------------------------------

test('predictMove: bumping the Shopkeeper returns an npc-interact merchant bump', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {},
    mobs: { m1: mobAt(10, 9, { type: 'npc', name: 'Shopkeeper' }) },
    items: [],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers[0], { kind: 'merchant', id: 'm1', name: 'Shopkeeper', action: 'npc-interact' });
  assert.equal(player.facing, 'UP');
});

test('predictMove: bumping a quest NPC returns an npc-interact quest-npc bump', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {},
    mobs: { m1: mobAt(10, 9, { type: 'npc', name: 'Ghost' }) },
    items: [],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers[0], { kind: 'quest-npc', id: 'm1', name: 'Ghost', action: 'npc-interact' });
  assert.equal(player.facing, 'UP');
});

// --- owned ally walk-through -------------------------------------------------

test('predictMove: owned ally (Ghost/Mirror) is walked through, not bumped', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {},
    mobs: {
      m1: mobAt(10, 9, { type: 'ghost_hero', faction: 'player', owner_id: 'p1' }),
    },
    items: [],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);
  assert.equal(res.kind, 'moved');
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
});

test('predictMove: another player is bumped as face-only', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {
      p2: { id: 'p2', name: 'Other', pos: { x: 10, y: 9 }, renderPos: { x: 10, y: 9 }, is_downed: false },
    },
    mobs: {},
    items: [],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers[0], { kind: 'player', id: 'p2', action: 'face-only' });
  assert.equal(player.facing, 'UP');
});

// --- terrain / chest / items / traps ----------------------------------------

test('predictMove: bumping an alchemy pot returns an open-alchemy bump', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const alchemyGrid = mockGrid.map(row => row.slice());
  alchemyGrid[9][10] = BACKEND_TILE.ALCHEMY.id;

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', alchemyGrid, mockEntities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers[0], { kind: 'alchemy-table', action: 'open-alchemy' });
  assert.equal(player.facing, 'UP');
});

test('predictMove: bumping a closed chest returns an open-chest bump', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {},
    mobs: {},
    items: [{ id: 'c1', type: 'chest', chest_type: 'iron', opened: false, pos: { x: 10, y: 9 } }],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers[0], { id: 'c1', kind: 'chest', chestType: 'iron', opened: false, action: 'open-chest' });
  assert.equal(player.facing, 'UP');
});

test('predictMove: a loose item on the tile does not bump (moves over it)', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {},
    mobs: {},
    items: [{ id: 'i1', pos: { x: 10, y: 9 } }],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);
  assert.equal(res.kind, 'moved');
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
});

test('predictMove: a trap on the tile does not bump (moves over it)', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const entities = {
    players: {},
    mobs: {},
    items: [],
    traps: [{ x: 10, y: 9, trap_type: 'poison' }],
  };

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, entities);
  assert.equal(res.kind, 'moved');
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
});

// --- precedence --------------------------------------------------------------

test('predictMove: bumping a chasm tile returns a chasm-jump bump and faces the chasm', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const gridWithChasm = mockGrid.map(row => row.slice());
  gridWithChasm[9][10] = BACKEND_TILE.CHASM.id;

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', gridWithChasm, mockEntities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers[0], { kind: 'chasm', tile: BACKEND_TILE.CHASM.id, action: 'chasm-jump' });
  assert.equal(player.facing, 'UP');
});

test('predictMove: bumping a locked door returns an unlock-door bump and faces the door', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const gridWithLockedDoor = mockGrid.map(row => row.slice());
  gridWithLockedDoor[9][10] = BACKEND_TILE.LOCKED_DOOR.id;

  const res = movementPredictor.predictMove(player, 0, -1, 'p1', gridWithLockedDoor, mockEntities);

  assert.equal(res.kind, 'bumped');
  assert.deepEqual(res.blockers[0], { kind: 'door', tile: BACKEND_TILE.LOCKED_DOOR.id, action: 'unlock-door' });
  assert.equal(player.facing, 'UP');
});

test('primaryBlocker: melee-attack beats a same-tile item/face-only blocker', () => {
  const primary = movementPredictor.primaryBlocker([
    { kind: 'item', id: 'i1', action: 'none' },
    { kind: 'mob', id: 'm1', name: 'Rat', action: 'melee-attack' },
    { kind: 'player', id: 'p2', action: 'face-only' },
  ]);
  assert.deepEqual(primary, { kind: 'mob', id: 'm1', name: 'Rat', action: 'melee-attack' });
});

test('primaryBlocker: melee-attack beats chasm-jump', () => {
  const primary = movementPredictor.primaryBlocker([
    { kind: 'chasm', tile: 33, action: 'chasm-jump' },
    { kind: 'mob', id: 'm1', name: 'Bat', action: 'melee-attack' },
  ]);
  assert.deepEqual(primary, { kind: 'mob', id: 'm1', name: 'Bat', action: 'melee-attack' });
});

test('primaryBlocker: open-chest beats a face-only player', () => {
  const primary = movementPredictor.primaryBlocker([
    { kind: 'player', id: 'p2', action: 'face-only' },
    { kind: 'chest', id: 'c1', chestType: 'iron', opened: false, action: 'open-chest' },
  ]);
  assert.equal(primary.action, 'open-chest');
});

test('primaryBlocker: returns null for an empty list', () => {
  assert.equal(movementPredictor.primaryBlocker([]), null);
});

test('onMoveResult: confirms step by sequence number and prunes queue', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const move1 = movementPredictor.predictMove(player, 1, 0, 'p1', mockGrid, mockEntities);
  assert.equal(move1.seq, 1);
  assert.equal(movementPredictor.isPending(), true);

  movementPredictor.onMoveResult({ entity: 'p1', seq: 1, x: 11, y: 10, ok: true }, player);
  assert.equal(movementPredictor.isPending(), false);
});

test('onMoveResult: handles rejection ok=false by rolling back', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  movementPredictor.predictMove(player, 1, 0, 'p1', mockGrid, mockEntities);
  assert.equal(movementPredictor.isPending(), true);

  movementPredictor.onMoveResult({ entity: 'p1', seq: 1, x: 10, y: 10, ok: false }, player);
  assert.equal(movementPredictor.isPending(), false);
  assert.deepEqual(player.targetPos, { x: 10, y: 10 });
});

test('reconcile: acknowledges steps via lastProcessedSeq', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const move1 = movementPredictor.predictMove(player, 1, 0, 'p1', mockGrid, mockEntities);
  assert.equal(move1.seq, 1);

  movementPredictor.reconcile({ x: 11, y: 10 }, player, 1);
  assert.equal(movementPredictor.isPending(), false);
});

test('getStepDuration: adapts dynamically to player step_duration_ms', () => {
  const player = createMockPlayer(10, 10);
  player.step_duration_ms = 75;
  assert.equal(movementPredictor.getStepDuration(player), 75);

  player.step_duration_ms = 300;
  assert.equal(movementPredictor.getStepDuration(player), 300);
});