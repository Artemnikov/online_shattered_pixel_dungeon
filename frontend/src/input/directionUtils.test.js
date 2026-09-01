import test from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTION_KEYS, getVector } from './directionUtils.js';

test('DIRECTION_KEYS contains WASD, Arrows, and Numpad 1-9 directions', () => {
  const expected = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    'Numpad8', 'Numpad2', 'Numpad4', 'Numpad6',
    'Numpad7', 'Numpad9', 'Numpad1', 'Numpad3',
  ];
  for (const key of expected) {
    assert.equal(DIRECTION_KEYS.has(key), true, `Expected DIRECTION_KEYS to have ${key}`);
  }
});

test('getVector: orthogonal directions (WASD, Arrows, Numpad)', () => {
  // Up
  assert.deepEqual(getVector(new Set(['KeyW'])), { dx: 0, dy: -1 });
  assert.deepEqual(getVector(new Set(['ArrowUp'])), { dx: 0, dy: -1 });
  assert.deepEqual(getVector(new Set(['Numpad8'])), { dx: 0, dy: -1 });

  // Down
  assert.deepEqual(getVector(new Set(['KeyS'])), { dx: 0, dy: 1 });
  assert.deepEqual(getVector(new Set(['ArrowDown'])), { dx: 0, dy: 1 });
  assert.deepEqual(getVector(new Set(['Numpad2'])), { dx: 0, dy: 1 });

  // Left
  assert.deepEqual(getVector(new Set(['KeyA'])), { dx: -1, dy: 0 });
  assert.deepEqual(getVector(new Set(['ArrowLeft'])), { dx: -1, dy: 0 });
  assert.deepEqual(getVector(new Set(['Numpad4'])), { dx: -1, dy: 0 });

  // Right
  assert.deepEqual(getVector(new Set(['KeyD'])), { dx: 1, dy: 0 });
  assert.deepEqual(getVector(new Set(['ArrowRight'])), { dx: 1, dy: 0 });
  assert.deepEqual(getVector(new Set(['Numpad6'])), { dx: 1, dy: 0 });
});

test('getVector: diagonal directions via two-key combinations', () => {
  // Up-Right
  assert.deepEqual(getVector(new Set(['KeyW', 'KeyD'])), { dx: 1, dy: -1 });
  assert.deepEqual(getVector(new Set(['ArrowUp', 'ArrowRight'])), { dx: 1, dy: -1 });

  // Up-Left
  assert.deepEqual(getVector(new Set(['KeyW', 'KeyA'])), { dx: -1, dy: -1 });
  assert.deepEqual(getVector(new Set(['ArrowUp', 'ArrowLeft'])), { dx: -1, dy: -1 });

  // Down-Right
  assert.deepEqual(getVector(new Set(['KeyS', 'KeyD'])), { dx: 1, dy: 1 });
  assert.deepEqual(getVector(new Set(['ArrowDown', 'ArrowRight'])), { dx: 1, dy: 1 });

  // Down-Left
  assert.deepEqual(getVector(new Set(['KeyS', 'KeyA'])), { dx: -1, dy: 1 });
  assert.deepEqual(getVector(new Set(['ArrowDown', 'ArrowLeft'])), { dx: -1, dy: 1 });
});

test('getVector: single-key diagonals via Numpad', () => {
  assert.deepEqual(getVector(new Set(['Numpad7'])), { dx: -1, dy: -1 }); // Up-Left
  assert.deepEqual(getVector(new Set(['Numpad9'])), { dx: 1, dy: -1 });  // Up-Right
  assert.deepEqual(getVector(new Set(['Numpad1'])), { dx: -1, dy: 1 });   // Down-Left
  assert.deepEqual(getVector(new Set(['Numpad3'])), { dx: 1, dy: 1 });    // Down-Right
});

test('getVector: opposite keys cancel out cleanly', () => {
  // Up + Down
  assert.deepEqual(getVector(new Set(['KeyW', 'KeyS'])), { dx: 0, dy: 0 });
  assert.deepEqual(getVector(new Set(['KeyS', 'KeyW'])), { dx: 0, dy: 0 });
  assert.deepEqual(getVector(new Set(['ArrowUp', 'ArrowDown'])), { dx: 0, dy: 0 });

  // Left + Right
  assert.deepEqual(getVector(new Set(['KeyA', 'KeyD'])), { dx: 0, dy: 0 });
  assert.deepEqual(getVector(new Set(['KeyD', 'KeyA'])), { dx: 0, dy: 0 });
  assert.deepEqual(getVector(new Set(['ArrowLeft', 'ArrowRight'])), { dx: 0, dy: 0 });

  // All 4 keys held
  assert.deepEqual(getVector(new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD'])), { dx: 0, dy: 0 });
});

test('getVector: 3-key combinations resolve cleanly', () => {
  // Up + Down (cancels) + Right -> Right
  assert.deepEqual(getVector(new Set(['KeyW', 'KeyS', 'KeyD'])), { dx: 1, dy: 0 });

  // Left + Right (cancels) + Up -> Up
  assert.deepEqual(getVector(new Set(['KeyA', 'KeyD', 'KeyW'])), { dx: 0, dy: -1 });

  // Numpad7 (Up-Left) + KeyD (Right) -> Up
  assert.deepEqual(getVector(new Set(['Numpad7', 'KeyD'])), { dx: 0, dy: -1 });
});
