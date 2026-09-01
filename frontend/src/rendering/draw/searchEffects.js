import { TILE_SIZE, PLAYER_OPERATE_DURATION } from '../../constants';

const COLOR = '#55AAFF'; // 0xFF55AAFF in the original
const START_ALPHA = 0.8;

let lastNow = null;

export function spawnCheckedCells(ref, cells, sourceX, sourceY) {
  if (!cells) return;
  cells.forEach(([cx, cy]) => {
    const dist = Math.hypot(cx - sourceX, cy - sourceY);
    // delay steadily accelerates as distance increases (CheckedCell.java:49-52)
    let delay = dist - 1;
    delay = delay > 0 ? Math.pow(delay, 0.67) / 10 : 0;
    ref.current.push({
      x: (cx + 0.5) * TILE_SIZE,
      y: (cy + 0.5) * TILE_SIZE,
      delay,
      alpha: START_ALPHA,
    });
  });
}

export function playLocalPlayerSearch({ player, grid, searchEffectsRef, playerAnimRef, playerId }) {
  if (!player || !grid || !searchEffectsRef) return;

  const wideSearch = player.talentLevels?.wide_search ?? 0;
  let distance = player.classType === 'rogue' ? 2 : 1;
  let circular = false;
  if (wideSearch > 0) {
    distance += 1;
    circular = wideSearch === 1;
  }

  const px = Math.round(player.renderPos?.x ?? player.pos?.x ?? 0);
  const py = Math.round(player.renderPos?.y ?? player.pos?.y ?? 0);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const cells = [];
  for (let dy = -distance; dy <= distance; dy++) {
    for (let dx = -distance; dx <= distance; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (circular && dx * dx + dy * dy > distance * distance) continue;
      const tx = px + dx;
      const ty = py + dy;
      if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) continue;
      cells.push([tx, ty]);
    }
  }
  spawnCheckedCells(searchEffectsRef, cells, px, py);

  if (playerAnimRef) {
    if (!playerAnimRef.current[playerId]) playerAnimRef.current[playerId] = {};
    playerAnimRef.current[playerId].operateUntil = performance.now() + PLAYER_OPERATE_DURATION;
  }
}

export function advanceAndDrawCheckedCells(ctx, { ref }) {
  const now = performance.now();
  if (lastNow == null) lastNow = now;
  const dt = Math.min((now - lastNow) / 1000, 0.05); // clamp to avoid jumps
  lastNow = now;

  const effects = ref.current;
  for (let i = effects.length - 1; i >= 0; i--) {
    const c = effects[i];
    // Hold (invisible) until the per-cell delay elapses, then fade+shrink, then die.
    if ((c.delay -= dt) > 0) {
      continue;
    }
    if ((c.alpha -= dt) <= 0) {
      effects.splice(i, 1);
      continue;
    }
    const side = TILE_SIZE * c.alpha; // shrinks as it fades (CheckedCell.java:63)
    ctx.save();
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = COLOR;
    ctx.fillRect(c.x - side / 2, c.y - side / 2, side, side);
    ctx.restore();
  }
}
