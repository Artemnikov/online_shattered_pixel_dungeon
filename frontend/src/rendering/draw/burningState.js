import { TILE_SIZE } from '../../constants';
import { setLightMode } from './blending';
import AudioManager from '../../audio/AudioManager';

// SPD Burning.fx (Burning.java): the char sprite pours FlameParticle at a
// fixed interval for as long as the buff is active. STATE_EFFECT events arrive
// every game tick (50ms) and refresh e.startTime; when the buff ends the
// events stop, so pouring is gated on a recent refresh to extinguish quickly.
const POUR_INTERVAL = 0.04;
const REFRESH_WINDOW_MS = 150;
const FLAME_COLOR = '#EE7722';
const CORE_COLOR = '#FFCC00';
const LIFESPAN = 0.6;
const SIZE = 5;
const EMBER_LIFESPAN = 1.2;

const IGNITE_THROTTLE_MS = 250;

// SPD CharSprite.processStateAddition(BURNING): plays burning.mp3 once per
// ignition (AudioManager enforces a global BURNING cooldown on top of this).
export function playIgniteSound() {
  AudioManager.play('BURNING', 1.0, IGNITE_THROTTLE_MS);
}

export function drawBurning(ctx, e, elapsed, dt) {
  if (elapsed > 120000) return;
  if (elapsed < REFRESH_WINDOW_MS) {
    e.pourAcc = (e.pourAcc || 0) + dt;
    while (e.pourAcc >= POUR_INTERVAL) {
      e.pourAcc -= POUR_INTERVAL;
      const ember = Math.random() < 0.1;
      e.particles.push({
        x: e.cx + (Math.random() - 0.5) * 12,
        y: e.cy + (Math.random() - 0.5) * 8 + 2,
        vx: 0,
        vy: 0,
        life: ember ? EMBER_LIFESPAN : LIFESPAN,
        maxLife: ember ? EMBER_LIFESPAN : LIFESPAN,
        ember,
      });
    }
  }
  for (let i = e.particles.length - 1; i >= 0; i--) {
    const p = e.particles[i];
    p.life -= dt;
    if (p.life <= 0) { e.particles.splice(i, 1); continue; }
    p.vy += -80 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  ctx.save();
  setLightMode(ctx);

  // Flickering heat halo so a burning entity reads from across the room.
  const flicker = Math.sin(elapsed * 0.02) * 0.5 + 0.5;
  ctx.globalAlpha = 0.15 + 0.10 * flicker;
  ctx.fillStyle = '#FF7722';
  ctx.beginPath();
  ctx.arc(e.cx, e.cy, TILE_SIZE * 0.7, 0, Math.PI * 2);
  ctx.fill();

  for (const p of e.particles) {
    const t = p.life / p.maxLife;
    ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
    if (p.ember) {
      ctx.fillStyle = CORE_COLOR;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    } else {
      ctx.fillStyle = FLAME_COLOR;
      const s = Math.max(1, Math.round(SIZE * t));
      ctx.fillRect(Math.round(p.x) - (s >> 1), Math.round(p.y) - (s >> 1), s, s);
    }
  }
  ctx.restore();
}
