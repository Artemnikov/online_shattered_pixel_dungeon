import {
  ATLAS_COLUMNS,
  DEST_TILE_SIZE,
  SOURCE_TILE_SIZE,
} from '../sewers/constants';
import {
  BACKEND_TILE,
  trapDisarmedIndex,
  trapSpriteIndex,
} from '../../constants.js';

const REVEAL_FADE_DURATION = 400;

const getSourceXY = (srcIndex) => ({
  sx: (srcIndex % ATLAS_COLUMNS) * SOURCE_TILE_SIZE,
  sy: Math.floor(srcIndex / ATLAS_COLUMNS) * SOURCE_TILE_SIZE,
});

export function drawTraps(ctx, { entitiesRef, visionRef, assetImages, grid }) {
  const terrainFeaturesImg = assetImages?.terrainFeatures;
  const traps = entitiesRef?.current?.traps;
  if (!terrainFeaturesImg || !traps || traps.length === 0) return;

  const now = performance.now();
  const visible = visionRef?.current?.visible;

  for (const trap of traps) {
    const { x, y, trap_type, revealStartTime } = trap;
    const key = `${x},${y}`;
    if (visible && !visible.has(key)) continue;

    const tile = grid?.[y]?.[x];
    if (tile === undefined) continue;

    if (tile === BACKEND_TILE.SECRET_TRAP.id) continue;

    let srcIndex;
    if (tile === BACKEND_TILE.INACTIVE_TRAP.id) {
      srcIndex = trapDisarmedIndex(trap_type);
    } else {
      srcIndex = trapSpriteIndex(trap_type);
    }

    if (srcIndex == null) continue;

    const { sx, sy } = getSourceXY(srcIndex);
    const dx = x * DEST_TILE_SIZE;
    const dy = y * DEST_TILE_SIZE;

    let alpha = 1.0;
    if (revealStartTime) {
      const elapsed = now - revealStartTime;
      if (elapsed < REVEAL_FADE_DURATION) {
        alpha = Math.max(0, Math.min(1, elapsed / REVEAL_FADE_DURATION));
      }
    }

    if (alpha < 1.0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        terrainFeaturesImg,
        sx, sy, SOURCE_TILE_SIZE, SOURCE_TILE_SIZE,
        dx, dy, DEST_TILE_SIZE, DEST_TILE_SIZE
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        terrainFeaturesImg,
        sx, sy, SOURCE_TILE_SIZE, SOURCE_TILE_SIZE,
        dx, dy, DEST_TILE_SIZE, DEST_TILE_SIZE
      );
    }
  }
}
