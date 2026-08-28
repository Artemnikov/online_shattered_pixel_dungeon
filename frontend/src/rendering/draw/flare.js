export function spawnFlare(flareRef, cx, cy, nRays, radius, color, durationMs = 800) {
  flareRef.current.push({ cx, cy, nRays, radius, color, startTime: performance.now(), durationMs });
}

export function advanceAndDrawFlares(ctx, { flareRef }) {
  if (!flareRef?.current?.length) return;
  const now = performance.now();
  const entries = flareRef.current;

  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const elapsed = now - e.startTime;
    if (elapsed >= e.durationMs) {
      entries.splice(i, 1);
      continue;
    }

    const t = elapsed / e.durationMs;
    const currentRadius = t * e.radius;
    const alpha = 1 - t;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (let r = 0; r < e.nRays; r++) {
      const angle = (r / e.nRays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(e.cx, e.cy);
      ctx.lineTo(e.cx + Math.cos(angle) * currentRadius, e.cy + Math.sin(angle) * currentRadius);
      ctx.stroke();
    }

    ctx.restore();
  }
}
