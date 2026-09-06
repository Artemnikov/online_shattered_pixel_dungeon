import test from 'node:test';
import assert from 'node:assert/strict';
import { getTileDescriptor, BACKEND_TILE } from '../../constants.js';

test('getTileDescriptor: Wall returns wall blocker with action none', () => {
  const desc = getTileDescriptor(BACKEND_TILE.WALL.id);
  assert.equal(desc.passable, false);
  assert.deepEqual(desc.onInteract(BACKEND_TILE.WALL.id), {
    kind: 'wall',
    tile: BACKEND_TILE.WALL.id,
    action: 'none',
  });
});

test('getTileDescriptor: Void returns chasm blocker with action chasm-jump', () => {
  const desc = getTileDescriptor(BACKEND_TILE.VOID.id);
  assert.equal(desc.passable, false);
  assert.deepEqual(desc.onInteract(BACKEND_TILE.VOID.id), {
    kind: 'chasm',
    tile: BACKEND_TILE.VOID.id,
    action: 'chasm-jump',
  });
});

test('getTileDescriptor: Chasm returns chasm blocker with action chasm-jump', () => {
  const desc = getTileDescriptor(BACKEND_TILE.CHASM.id);
  assert.equal(desc.passable, false);
  assert.deepEqual(desc.onInteract(BACKEND_TILE.CHASM.id), {
    kind: 'chasm',
    tile: BACKEND_TILE.CHASM.id,
    action: 'chasm-jump',
  });
});

test('getTileDescriptor: Traps return null blocker for manual move interaction', () => {
  assert.equal(getTileDescriptor(BACKEND_TILE.TRAP.id).onInteract(BACKEND_TILE.TRAP.id), null);
  assert.equal(getTileDescriptor(BACKEND_TILE.SECRET_TRAP.id).onInteract(BACKEND_TILE.SECRET_TRAP.id), null);
  assert.equal(getTileDescriptor(BACKEND_TILE.INACTIVE_TRAP.id).onInteract(BACKEND_TILE.INACTIVE_TRAP.id), null);
});

test('getTileDescriptor: Floor returns null (walkable)', () => {
  const desc = getTileDescriptor(BACKEND_TILE.FLOOR.id);
  assert.equal(desc.passable, true);
  assert.equal(getTileDescriptor(BACKEND_TILE.FLOOR.id).onInteract(BACKEND_TILE.FLOOR.id), null);
});

test('getTileDescriptor: Alchemy table returns alchemy-table blocker with open-alchemy action', () => {
  const desc = getTileDescriptor(BACKEND_TILE.ALCHEMY.id);
  assert.equal(desc.passable, false);
  assert.deepEqual(getTileDescriptor(BACKEND_TILE.ALCHEMY.id).onInteract(BACKEND_TILE.ALCHEMY.id), {
    kind: 'alchemy-table',
    action: 'open-alchemy',
  });
});

test('getTileDescriptor: Locked door tiles return door blocker with unlock-door action', () => {
  for (const tileId of [
    BACKEND_TILE.LOCKED_DOOR.id,
    BACKEND_TILE.HERO_LKD_DR.id,
    BACKEND_TILE.LOCKED_EXIT.id,
    BACKEND_TILE.CRYSTAL_DOOR.id,
  ]) {
    const desc = getTileDescriptor(tileId);
    assert.equal(desc.passable, false);
    assert.deepEqual(desc.onInteract(tileId), {
      kind: 'door',
      tile: tileId,
      action: 'unlock-door',
    });
  }
});

test('getTileDescriptor: Out of bounds (undefined) returns wall blocker', () => {
  const desc = getTileDescriptor(undefined);
  assert.equal(desc.passable, false);
  assert.deepEqual(getTileDescriptor(undefined).onInteract(undefined), {
    kind: 'wall',
    tile: undefined,
    action: 'none',
  });
});

test('isPassable returns true for walkable tiles and false for obstacles', () => {
  assert.equal(getTileDescriptor(BACKEND_TILE.FLOOR.id).passable, true);
  assert.equal(getTileDescriptor(BACKEND_TILE.DOOR.id).passable, true);
  assert.equal(getTileDescriptor(BACKEND_TILE.FLOOR_WATER.id).passable, true);
  assert.equal(getTileDescriptor(BACKEND_TILE.HIGH_GRASS.id).passable, true);
  assert.equal(getTileDescriptor(BACKEND_TILE.INACTIVE_TRAP.id).passable, true);
  assert.equal(getTileDescriptor(BACKEND_TILE.TRAP.id).passable, false);
  assert.equal(getTileDescriptor(BACKEND_TILE.SECRET_TRAP.id).passable, false);
  assert.equal(getTileDescriptor(BACKEND_TILE.WALL.id).passable, false);
  assert.equal(getTileDescriptor(BACKEND_TILE.ALCHEMY.id).passable, false);
  assert.equal(getTileDescriptor(BACKEND_TILE.CHASM.id).passable, false);
  assert.equal(getTileDescriptor(BACKEND_TILE.VOID.id).passable, false);
  assert.equal(getTileDescriptor(undefined).passable, false);
});
