const LIFESPAN = 800;
const EXCL_X = 0;
const EXCL_Y = 16;
const EXCL_W = 6;
const EXCL_H = 9;

let effectsImg = null;
(() => {
  if (typeof Image === 'undefined') return;
  const img = new Image();
  img.onload = () => { effectsImg = img; };
  img.onerror = () => {};
  img.src = new URL('../../assets/pixel-dungeon/effects/effects.png', import.meta.url).href;
})();

export function spawnSurprise(surpriseRef, cx, cy) {
  surpriseRef.current.push({
    x: cx,
    y: cy,
    startTime: performance.now(),
  });
}

export function advanceAndDrawSurprises(ctx, { surpriseRef }) {
  const entries = surpriseRef.current;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const elapsed = performance.now() - e.startTime;

    if (elapsed > LIFESPAN) {
      entries.splice(i, 1);
      continue;
    }

    const alpha = elapsed < 100 ? elapsed / 100
      : elapsed > LIFESPAN - 200 ? (LIFESPAN - elapsed) / 200
      : 1;
    const scale = 1 + 0.5 * (elapsed / LIFESPAN);

    if (effectsImg?.complete && effectsImg?.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;

      const dw = EXCL_W * 2 * scale;
      const dh = EXCL_H * 2 * scale;
      ctx.drawImage(effectsImg,
        EXCL_X, EXCL_Y, EXCL_W, EXCL_H,
        e.x - dw / 2, e.y - dh / 2, dw, dh);

      ctx.restore();
    }
  }
}
