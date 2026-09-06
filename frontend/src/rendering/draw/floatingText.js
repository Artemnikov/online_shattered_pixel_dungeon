import { TILE_SIZE } from '../../constants';
const textIconsSrc = new URL('../../assets/pixel-dungeon/effects/text_icons.png', import.meta.url).href;

const LIFESPAN = 1.0;
const RISE = TILE_SIZE;
const ICON_W = 7;
const ICON_H = 8;

let lastNow = null;
let textIconsImg = null;
const _iconLoad = typeof Image !== 'undefined' ? new Promise(resolve => {
  const img = new Image();
  img.onload = () => { textIconsImg = img; resolve(); };
  img.onerror = () => resolve();
  img.src = textIconsSrc;
}) : Promise.resolve();

export { TEXT_ICON } from './floatingTextIcons';

const stacks = new Map();

/**
 * Spawn a floating text entry that rises and fades (SPD's FloatingText).
 * A non-(-1) `key` groups overlapping entries from the same source so they
 * stack instead of overdrawing.
 *
 * @param {import('../../net/types').Ref<unknown[]>} floatingTextRef
 * @param {number} cx world pixel x
 * @param {number} cy world pixel y
 * @param {string} text
 * @param {string} [color]
 * @param {number} [iconIndex]
 * @param {number | string} [key]
 * @param {{ life?: number, fontSize?: number, lineWidth?: number }} [opts]
 */
export function spawnFloatingText(floatingTextRef, cx, cy, text, color = '#ffffff', iconIndex = -1, key = -1, opts = {}) {
  const entry = {
    x: cx,
    y: cy,
    text,
    color,
    life: opts.life ?? LIFESPAN,
    maxLife: opts.life ?? LIFESPAN,
    iconIndex,
    key,
    origY: cy,
    fontSize: opts.fontSize ?? 9,
    lineWidth: opts.lineWidth ?? 2,
  };
  floatingTextRef.current.push(entry);

  if (key !== -1) {
    let stack = stacks.get(key);
    if (!stack) {
      stack = [];
      stacks.set(key, stack);
    }
    if (stack.length > 0) {
      let below = entry;
      let aboveIndex = stack.length - 1;
      let numBelow = 0;
      while (aboveIndex >= 0) {
        numBelow++;
        const above = stack[aboveIndex];
        const aboveBottom = above.y;
        const belowTop = below.y;
        if (aboveBottom + 4 * 2 > belowTop) {
          above.y = belowTop - TILE_SIZE / 2 - 4 * 2;
          above.life = Math.min(above.life, LIFESPAN - (numBelow / 5));
          above.life = Math.max(above.life, 0);
          below = above;
          aboveIndex--;
        } else {
          break;
        }
      }
    }
    stack.push(entry);
  }
}

export function advanceAndDrawFloatingText(ctx, { floatingTextRef }) {
  const now = performance.now();
  if (lastNow == null) lastNow = now;
  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;

  const items = floatingTextRef.current;
  const img = textIconsImg;

  for (let i = items.length - 1; i >= 0; i--) {
    const t = items[i];
    t.life -= dt;
    if (t.life <= 0) {
      if (t.key !== -1) {
        const stack = stacks.get(t.key);
        if (stack) {
          const idx = stack.indexOf(t);
          if (idx !== -1) stack.splice(idx, 1);
          if (stack.length === 0) stacks.delete(t.key);
        }
      }
      items.splice(i, 1);
      continue;
    }
    t.y -= (RISE / t.maxLife) * dt;

    const alpha = t.life > t.maxLife / 2 ? 1 : Math.max(0, t.life / (t.maxLife / 2));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;

    const textX = Math.round(t.x);
    const textY = Math.round(t.y);

    if (t.iconIndex >= 0 && img?.complete && img?.naturalWidth > 0) {
      const cols = Math.floor(img.naturalWidth / ICON_W);
      const col = t.iconIndex % cols;
      const row = Math.floor(t.iconIndex / cols);
      const iconScale = 2;
      const iw = ICON_W * iconScale;
      const ih = ICON_H * iconScale;
      const textWidth = ctx.measureText(t.text).width;
      const totalW = iw + 2 + textWidth;
      const ix = textX - totalW / 2;
      const iy = textY - ih / 2;
      ctx.drawImage(img,
        col * ICON_W, row * ICON_H, ICON_W, ICON_H,
        ix, iy, iw, ih);
    }

    ctx.font = `${t.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = t.lineWidth;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeText(t.text, textX, textY);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, textX, textY);
    ctx.restore();
  }
}
