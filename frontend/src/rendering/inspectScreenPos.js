import { TILE_SIZE } from '../constants';

// Live viewport position of an inspect-popup anchor (a world tile, or a mob we follow
// by its renderPos). Returns { left, top, below } or null when the popup should hide
// (mob gone/out of view, or the anchor panned off the visible canvas).
export function inspectScreenPos(canvas, cam, zoom, anchor, mobs, visible) {
  if (!canvas || !anchor) return null;
  let wx, wyTop, wyBottom;
  if (anchor.type === 'mob') {
    const mob = mobs[anchor.id];
    if (!mob) return null;
    const mx = Math.round(mob.renderPos.x), my = Math.round(mob.renderPos.y);
    if (!visible.has(`${mx},${my}`)) return null;
    wx = (mob.renderPos.x + 0.5) * TILE_SIZE;
    wyTop = mob.renderPos.y * TILE_SIZE;
    wyBottom = (mob.renderPos.y + 1) * TILE_SIZE;
  } else {
    wx = (anchor.x + 0.5) * TILE_SIZE;
    wyTop = anchor.y * TILE_SIZE;
    wyBottom = (anchor.y + 1) * TILE_SIZE;
  }
  const rect = canvas.getBoundingClientRect();
  const cw = rect.width, ch = rect.height;
  const left = rect.left + (wx - cam.x - cw / 2) * zoom + cw / 2;
  const topY = rect.top + (wyTop - cam.y - ch / 2) * zoom + ch / 2;
  const bottomY = rect.top + (wyBottom - cam.y - ch / 2) * zoom + ch / 2;
  if (left < rect.left || left > rect.right || bottomY < rect.top || topY > rect.bottom) return null;
  const below = topY < rect.top + 70;
  return { left, top: below ? bottomY + 6 : topY - 6, below };
}
