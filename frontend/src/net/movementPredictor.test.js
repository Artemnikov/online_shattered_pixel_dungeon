import test from 'node:test';
import assert from 'node:assert/strict';
import * as movementPredictor from './movementPredictor.ts';

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

test('predictMove: starts step from rest', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  const ok = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, mockEntities);
  assert.equal(ok, true);
  assert.equal(movementPredictor.isPending(), true);
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
});

test('predictMove: redirects in-flight step when diagonal key pressed early', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  // Step 1: Up
  movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, mockEntities);
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });

  // Step 2: Right arrives immediately after (diagonal intent: Up + Right)
  const ok = movementPredictor.predictMove(player, 1, -1, 'p1', mockGrid, mockEntities);
  assert.equal(ok, true);
  // Target should be redirected to (11, 9) from the start tile (10, 10), NOT (11, 8)
  assert.deepEqual(player.targetPos, { x: 11, y: 9 });
});

test('predictMove: does not stack a second step while animation is in flight', () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, mockEntities);
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });

  // Simulate server confirmation early while visual animation is still at (10, 9.8)
  player.renderPos = { x: 10, y: 9.8 };
  movementPredictor.reconcile({ x: 10, y: 9 }, player);

  // Animation is not complete yet (renderPos is 9.8, targetPos is 9)
  // Calling predictMove directly with a new direction must NOT jump 2 tiles ahead to (10, 8)
  const ok = movementPredictor.predictMove(player, 0, -1, 'p1', mockGrid, mockEntities);
  assert.equal(ok, false);
  // targetPos remains at (10, 9), did not jump to (10, 8)
  assert.deepEqual(player.targetPos, { x: 10, y: 9 });
});

test('paceStep: chains next step once previous animation finishes', async () => {
  movementPredictor.clear();
  const player = createMockPlayer(10, 10);

  movementPredictor.predictMove(player, 1, -1, 'p1', mockGrid, mockEntities);
  assert.deepEqual(player.targetPos, { x: 11, y: 9 });

  // Server confirms step
  movementPredictor.reconcile({ x: 11, y: 9 }, player);

  // Wait for step duration to elapse
  await new Promise(resolve => setTimeout(resolve, 190));

  // Animation finishes arriving at (11, 9)
  player.renderPos = { x: 11, y: 9 };
  player.animStartTime = performance.now() - 200;

  // paceStep can now chain the next step to (12, 8)
  const chained = movementPredictor.paceStep(player, 1, -1, 'p1', mockGrid, mockEntities);
  assert.equal(chained, true);
  assert.deepEqual(player.targetPos, { x: 12, y: 8 });
});
