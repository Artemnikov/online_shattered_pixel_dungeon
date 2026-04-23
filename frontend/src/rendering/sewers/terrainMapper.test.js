import test from 'node:test';
import assert from 'node:assert/strict';

import { getSewerTerrainInstructions } from './terrainMapper.js';
import { BACKEND_TILE, QUADRANT, TERRAIN_INDEX, WALL_INDEX, isGrassTile, isWallTile } from './constants.js';

const gridWith = (tile, width = 3, height = 3) =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => tile));

test('maps base terrain IDs to non-empty instruction sets', () => {
  const grid = gridWith(BACKEND_TILE.FLOOR);

  const mappedTiles = [
    BACKEND_TILE.FLOOR,
    BACKEND_TILE.FLOOR_WATER,
    BACKEND_TILE.FLOOR_COBBLE,
    BACKEND_TILE.FLOOR_GRASS,
    BACKEND_TILE.DOOR,
    BACKEND_TILE.LOCKED_DOOR,
    BACKEND_TILE.STAIRS_UP,
    BACKEND_TILE.STAIRS_DOWN,
  ];

  for (const tile of mappedTiles) {
    const instructions = getSewerTerrainInstructions(grid, 1, 1, tile, 2);
    assert.ok(instructions.length > 0, `tile ${tile} should render`);
  }
});

test('water mapping produces quadrant composition and shoreline on isolated water', () => {
  const grid = gridWith(BACKEND_TILE.FLOOR);
  grid[1][1] = BACKEND_TILE.FLOOR_WATER;

  const instructions = getSewerTerrainInstructions(grid, 1, 1, BACKEND_TILE.FLOOR_WATER, 1);
  const quadrantInstructions = instructions.filter((item) => item.quadrant !== QUADRANT.FULL);

  assert.equal(quadrantInstructions.length, 4);
  assert.ok(
    quadrantInstructions.some((item) => Object.values(TERRAIN_INDEX.WATER_EDGE).includes(item.srcIndex)),
    'isolated water should include shoreline quadrants'
  );
});

test('grass center uses center tiles when surrounded by grass', () => {
  const grid = gridWith(BACKEND_TILE.FLOOR_GRASS, 5, 5);
  const instructions = getSewerTerrainInstructions(grid, 2, 2, BACKEND_TILE.FLOOR_GRASS, 0);
  const quadrants = instructions.filter((item) => item.quadrant !== QUADRANT.FULL);

  assert.equal(quadrants.length, 4);
  for (const inst of quadrants) {
    assert.ok(TERRAIN_INDEX.GRASS_CENTER.includes(inst.srcIndex));
  }
});

test('door composition adds lintel and side overlays near walls', () => {
  const grid = gridWith(BACKEND_TILE.FLOOR);
  grid[0][1] = BACKEND_TILE.WALL_TOP;
  grid[1][0] = BACKEND_TILE.WALL_TOP;
  grid[1][2] = BACKEND_TILE.WALL_TOP;

  const instructions = getSewerTerrainInstructions(grid, 1, 1, BACKEND_TILE.DOOR, 0);

  assert.ok(instructions.some((item) => item.srcIndex === TERRAIN_INDEX.DOOR));
  assert.ok(instructions.some((item) => item.srcIndex === TERRAIN_INDEX.DOOR_SIDE_LEFT));
  assert.ok(instructions.some((item) => item.srcIndex === TERRAIN_INDEX.DOOR_SIDE_RIGHT));
});

// --- New tile tests: pass the tile id (not the object) per current API. ---

const gridOfIds = (tileId, width = 3, height = 3) =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => tileId));

test('HIGH_GRASS renders floor base + grass quadrants using HIGH_GRASS_CENTER', () => {
  const grid = gridOfIds(BACKEND_TILE.HIGH_GRASS.id, 5, 5);
  const instructions = getSewerTerrainInstructions(grid, 2, 2, BACKEND_TILE.HIGH_GRASS.id, 0);

  const full = instructions.filter((i) => i.quadrant === QUADRANT.FULL);
  const quadrants = instructions.filter((i) => i.quadrant !== QUADRANT.FULL);

  assert.equal(full.length, 1, 'one floor base full-quadrant');
  assert.equal(quadrants.length, 4, 'four terrain quadrants');
  for (const q of quadrants) {
    assert.ok(
      TERRAIN_INDEX.HIGH_GRASS_CENTER.includes(q.srcIndex),
      `HIGH_GRASS surrounded by HIGH_GRASS should use HIGH_GRASS_CENTER sprite, got ${q.srcIndex}`
    );
  }
});

test('EMPTY_DECO renders floor base + decoration overlay', () => {
  const grid = gridOfIds(BACKEND_TILE.FLOOR.id);
  grid[1][1] = BACKEND_TILE.EMPTY_DECO.id;
  const instructions = getSewerTerrainInstructions(grid, 1, 1, BACKEND_TILE.EMPTY_DECO.id, 0);

  assert.equal(instructions.length, 2, 'floor base + deco overlay');
  assert.ok(
    instructions.some((i) => i.srcIndex === BACKEND_TILE.EMPTY_DECO.atlasIndex),
    'deco overlay uses EMPTY_DECO atlasIndex'
  );
});

test('WALL_DECO fallback through terrainMapper returns drain variant', () => {
  const grid = gridOfIds(BACKEND_TILE.FLOOR.id);
  grid[1][1] = BACKEND_TILE.WALL_DECO.id;
  const instructions = getSewerTerrainInstructions(grid, 1, 1, BACKEND_TILE.WALL_DECO.id, 0);

  assert.equal(instructions.length, 1);
  assert.ok(
    WALL_INDEX.DECO.includes(instructions[0].srcIndex),
    `expected a DECO variant, got ${instructions[0].srcIndex}`
  );
});

test('SECRET_DOOR orientation picks WALL_TOP when walkable tile is below', () => {
  const grid = [
    [BACKEND_TILE.WALL_TOP.id,   BACKEND_TILE.WALL_TOP.id,    BACKEND_TILE.WALL_TOP.id],
    [BACKEND_TILE.WALL_TOP.id,   BACKEND_TILE.SECRET_DOOR.id, BACKEND_TILE.WALL_TOP.id],
    [BACKEND_TILE.FLOOR.id,      BACKEND_TILE.FLOOR.id,       BACKEND_TILE.FLOOR.id],
  ];
  const instructions = getSewerTerrainInstructions(grid, 1, 1, BACKEND_TILE.SECRET_DOOR.id, 0);

  assert.equal(instructions.length, 1);
  assert.equal(instructions[0].srcIndex, BACKEND_TILE.WALL_TOP.atlasIndex);
});

test('isWallTile accepts new wall variants', () => {
  assert.equal(isWallTile(BACKEND_TILE.WALL_DECO.id), true);
  assert.equal(isWallTile(BACKEND_TILE.SECRET_DOOR.id), true);
  assert.equal(isWallTile(BACKEND_TILE.HIGH_GRASS.id), false);
  assert.equal(isWallTile(BACKEND_TILE.FLOOR.id), false);
});

test('isGrassTile accepts both regular and high grass', () => {
  assert.equal(isGrassTile(BACKEND_TILE.FLOOR_GRASS.id), true);
  assert.equal(isGrassTile(BACKEND_TILE.HIGH_GRASS.id), true);
  assert.equal(isGrassTile(BACKEND_TILE.FLOOR.id), false);
});
