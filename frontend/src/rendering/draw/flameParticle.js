// SPD FlameParticle (FlameParticle.java): color 0xEE7722, lifespan 0.6s, no
// initial speed, upward acceleration (0, -80), alpha fades in over the first
// 20% of life (am = p > 0.8 ? (1-p)*5 : 1) and shrinks linearly to nothing.
// Sizes are bumped vs SPD (4 -> 6) plus yellow-hot cores so fire fields read
// clearly at a glance. The generic particle system implements the same
// fadeIn/shrink curves, so these spawners only set the physical parameters.

export function spawnFlame(ref, cx, cy, count = 1) {
  for (let i = 0; i < count; i++) {
    const life = 0.6;
    const size = 6;
    ref.current.push({
      x: cx + (Math.random() - 0.5) * 4,
      y: cy + (Math.random() - 0.5) * 4,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      size,
      _startSize: size,
      color: Math.random() < 0.25 ? '#FFCC00' : '#EE7722',
      additive: true,
      accY: -80,
      shrink: true,
      fadeIn: true,
    });
  }
}

// Impact burst (LiquidFlame shatter, FireImbue, fire_bolt hit). SPD bursts the
// same rising FlameParticle, so acceleration is upward; a large yellow-hot
// core fraction keeps big bursts readable.
export function spawnFlameBurst(ref, cx, cy, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const speed = 40 + Math.random() * 40;
    const life = 0.5 + Math.random() * 0.5;
    const size = 5 + Math.floor(Math.random() * 4);
    ref.current.push({
      x: cx + (Math.random() - 0.5) * 8,
      y: cy + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size,
      _startSize: size,
      color: Math.random() < 0.4 ? '#FFCC00' : '#EE7722',
      additive: true,
      accY: -80,
      shrink: true,
      fadeIn: true,
    });
  }
}
