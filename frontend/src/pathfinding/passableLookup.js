// Static passable lookup mirroring backend TILE_FLAGS from
// backend/app/engine/dungeon/terrain_flags.py.
// Blob overrides (eternal_fire) are NOT handled — accepted edge case.

const PASSABLE_TILES = new Set([
  2,   // FLOOR
  3,   // DOOR
  4,   // STAIRS_UP
  5,   // STAIRS_DOWN
  6,   // FLOOR_WOOD
  7,   // FLOOR_WATER
  8,   // FLOOR_COBBLE
  9,   // FLOOR_GRASS
  13,  // INACTIVE_TRAP
  14,  // EMBERS
  18,  // EMPTY_DECO
  19,  // HIGH_GRASS
  22,  // OPEN_DOOR
  30,  // FURROWED_GRASS
  34,  // PEDESTAL
]);

// Backend allows pathing INTO a chasm only if it is the exact target tile.
export const CHASM_TILE = 33;

/**
 * @param {number} tileId
 * @returns {boolean}
 */
export function isPassable(tileId) {
  return PASSABLE_TILES.has(tileId);
}
