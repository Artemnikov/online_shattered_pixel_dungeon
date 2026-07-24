import { TILE_SIZE } from '../../constants';
import { spawnFlame } from './flameParticle';
import { spawnSmoke } from './smokeParticle';
import { spawnSparkMoving } from './sparkParticle';
import { spawnToxicGas, spawnParalyticGas, spawnCorrosiveGas, spawnConfusionGas } from './gasParticle';
import { setLightMode } from './blending';

const BLOB_COLORS = {
  electricity: { fill: '#4488FF', alpha: 0.2, edge: '#88CCFF' },
  toxic_gas: { fill: '#00CC33', alpha: 0.12 },
  paralytic_gas: { fill: '#9900CC', alpha: 0.12 },
  corrosive_gas: { fill: '#88CC00', alpha: 0.12 },
  confusion_gas: { fill: '#CC6600', alpha: 0.10 },
  tengu_shocker: { fill: '#4488FF', alpha: 0.25, edge: '#88CCFF' },
};

const FIRE_TYPES = new Set(['fire', 'tengu_fire']);
// SPD Fire.use: emitter.pour(FlameParticle.FACTORY, 0.03f) — one particle per
// interval per blob, scattered over random cells, not a per-cell emission.
// Rate doubled vs SPD so the field reads as fire at a glance.
const FIRE_POUR_INTERVAL = 0.015;

const ELECTRIC_TYPES = new Set(['electricity', 'tengu_shocker']);
const SPARK_EMIT_RATE = 12;

const GAS_TYPES = {
  toxic_gas: spawnToxicGas,
  paralytic_gas: spawnParalyticGas,
  corrosive_gas: spawnCorrosiveGas,
  confusion_gas: spawnConfusionGas,
};
const GAS_EMIT_RATE = 80;

let lastNow = null;

function randomVisibleCell(area, visible) {
  const keys = [...area.cells.keys()];
  if (keys.length === 0) return null;
  if (!visible) return keys[(Math.random() * keys.length) | 0];
  const visibleKeys = keys.filter(k => visible.has(k));
  if (visibleKeys.length === 0) return null;
  return visibleKeys[(Math.random() * visibleKeys.length) | 0];
}

export function advanceAndDrawBlobParticles(ctx, { blobAreasRef, visionRef, particlesRef }) {
  if (!blobAreasRef?.current) return;
  const now = performance.now();
  if (lastNow == null) lastNow = now;
  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;

  const visible = visionRef?.current?.visible;
  for (const [, area] of Object.entries(blobAreasRef.current)) {
    if (FIRE_TYPES.has(area.type)) {
      area.pourAcc = (area.pourAcc || 0) + dt;
      while (area.pourAcc >= FIRE_POUR_INTERVAL) {
        area.pourAcc -= FIRE_POUR_INTERVAL;
        const key = randomVisibleCell(area, visible);
        if (!key) { area.pourAcc = 0; break; }
        const [x, y] = key.split(',').map(Number);
        const px = x * TILE_SIZE + Math.random() * TILE_SIZE;
        const py = y * TILE_SIZE + Math.random() * TILE_SIZE;
        spawnFlame(particlesRef, px, py, 1);
        if (area.type === 'tengu_fire' && Math.random() < 0.15) {
          spawnSmoke(particlesRef, px, py, 1);   // SPD FireBlob STEAM
        }
      }
    }
    if (ELECTRIC_TYPES.has(area.type)) {
      for (const [key] of area.cells) {
        if (visible && !visible.has(key)) continue;
        if (Math.random() > dt * SPARK_EMIT_RATE) continue;
        const [x, y] = key.split(',').map(Number);
        const cx = x * TILE_SIZE + TILE_SIZE / 2;
        const cy = y * TILE_SIZE + TILE_SIZE / 2;
        spawnSparkMoving(particlesRef, cx, cy, 1);
      }
    }
    const gasSpawn = GAS_TYPES[area.type];
    if (gasSpawn) {
      for (const [key] of area.cells) {
        if (visible && !visible.has(key)) continue;
        if (Math.random() > dt * GAS_EMIT_RATE) continue;
        const [x, y] = key.split(',').map(Number);
        const cx = x * TILE_SIZE + TILE_SIZE / 2;
        const cy = y * TILE_SIZE + TILE_SIZE / 2;
        gasSpawn(particlesRef, cx, cy);
      }
    }
  }
}

export function updateBlobArea(blobAreasRef, id, type, cells) {
  if (!blobAreasRef.current) blobAreasRef.current = {};
  if (!cells || cells.length === 0) {
    delete blobAreasRef.current[id];
    return;
  }
  const cellMap = new Map();
  for (const [x, y, intensity] of cells) {
    cellMap.set(`${x},${y}`, intensity || 1);
  }
  blobAreasRef.current[id] = {
    type,
    cells: cellMap,
    updatedAt: performance.now(),
    pourAcc: blobAreasRef.current[id]?.pourAcc || 0,
  };
}

export function removeBlobArea(blobAreasRef, id) {
  if (blobAreasRef.current) {
    delete blobAreasRef.current[id];
  }
}

export function advanceAndDrawBlobAreas(ctx, { blobAreasRef, visionRef }) {
  if (!blobAreasRef?.current) return;
  const areas = Object.entries(blobAreasRef.current);
  if (areas.length === 0) return;
  const visible = visionRef?.current?.visible;
  const now = performance.now();

  for (const [, area] of areas) {
    // Fire fields get an additive flickering ground glow so the burning area
    // reads as a solid field of fire, not just sparse rising sparks.
    if (FIRE_TYPES.has(area.type)) {
      ctx.save();
      setLightMode(ctx);
      ctx.fillStyle = '#FF5500';
      for (const [key] of area.cells) {
        if (visible && !visible.has(key)) continue;
        const [x, y] = key.split(',').map(Number);
        const phase = ((x * 31 + y * 17) % 7) * 0.9;
        ctx.globalAlpha = 0.10 + 0.07 * (Math.sin(now * 0.008 + phase) * 0.5 + 0.5);
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
      ctx.restore();
      continue;
    }

    const colors = BLOB_COLORS[area.type];
    if (!colors || ELECTRIC_TYPES.has(area.type)) continue;

    for (const [key, intensity] of area.cells) {
      if (visible && !visible.has(key)) continue;
      const [x, y] = key.split(',').map(Number);
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const alpha = colors.alpha * Math.min(intensity, 1);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors.fill;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.restore();
    }
  }
}
