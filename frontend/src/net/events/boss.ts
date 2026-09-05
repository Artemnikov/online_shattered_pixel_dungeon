import { TILE_SIZE } from '../../constants';
import { spawnDust, spawnCritSparkle, spawnLight } from '../../rendering/draw/particles';
import { spawnSparkMoving } from '../../rendering/draw/sparkParticle';
import { addFadingTraps, setBombItem, clearBombItem } from '../../rendering/tenguEffects';
import { spawnSmoke } from '../../rendering/draw/smokeParticle';
import type { GameEvent } from '../../types/contract';
import type { GameEventContext, IGameEventHandler } from './IGameEventHandler';

function pourBombSmoke(bx: number, by: number, ctx: GameEventContext) {
  const particlesRef = ctx.effects.particlesRef;
  if (!particlesRef) return;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = bx + dx, y = by + dy;
      if (!ctx.world.isVisible(x, y)) continue;
      if (Math.random() > 0.5) continue;
      spawnSmoke(particlesRef, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 1);
    }
  }
}

export function createBossEventHandlers(): IGameEventHandler[] {
  return [
    {
      eventType: 'GOO_CHARGE',
      handle(event: Extract<GameEvent, { type: 'GOO_CHARGE' }>, ctx: GameEventContext) {
        const tiles = event.data.tiles || [];
        const dur = event.data.duration_ms ?? 1500;
        ctx.effects.warnTiles(tiles, dur);
        ctx.effects.setMobPump(event.data.mob, tiles.length ? dur : 0);
        return true;
      },
    },
    {
      eventType: 'GOO_ENRAGE',
      handle() {
        return true;
      },
    },
    {
      eventType: 'GOO_FIGHT_STARTED',
      handle(event: Extract<GameEvent, { type: 'GOO_FIGHT_STARTED' }>, ctx: GameEventContext) {
        ctx.ui.gooFightStarted(event.data);
        return true;
      },
    },
    {
      eventType: 'TENGU_FIGHT_STARTED',
      handle(event: Extract<GameEvent, { type: 'TENGU_FIGHT_STARTED' }>, ctx: GameEventContext) {
        ctx.ui.tenguFightStarted(event.data);
        return true;
      },
    },
    {
      eventType: 'DM300_FIGHT_STARTED',
      handle(event: Extract<GameEvent, { type: 'DM300_FIGHT_STARTED' }>, ctx: GameEventContext) {
        ctx.ui.dm300FightStarted(event.data);
        return true;
      },
    },
    {
      eventType: 'DWARF_KING_FIGHT_STARTED',
      handle(event: Extract<GameEvent, { type: 'DWARF_KING_FIGHT_STARTED' }>, ctx: GameEventContext) {
        ctx.ui.dwarfKingFightStarted(event.data);
        return true;
      },
    },
    {
      eventType: 'DWARF_KING_PHASE2',
      handle(event: Extract<GameEvent, { type: 'DWARF_KING_PHASE2' }>, ctx: GameEventContext) {
        ctx.ui.dwarfKingPhase2(event.data);
        return true;
      },
    },
    {
      eventType: 'YOG_FIGHT_STARTED',
      handle(event: Extract<GameEvent, { type: 'YOG_FIGHT_STARTED' }>, ctx: GameEventContext) {
        ctx.ui.yogFightStarted(event.data);
        return true;
      },
    },
    {
      eventType: 'YOG_FINAL_PHASE',
      handle(event: Extract<GameEvent, { type: 'YOG_FINAL_PHASE' }>, ctx: GameEventContext) {
        ctx.ui.yogFinalPhase(event.data);
        return true;
      },
    },
    {
      eventType: 'ZAP_SUMMON',
      handle(event: Extract<GameEvent, { type: 'ZAP_SUMMON' }>, ctx: GameEventContext) {
        ctx.effects.setMobAttack(event.data.mob, 400);
        if (ctx.world.isVisible(event.data.x, event.data.y)) {
          ctx.audio.play('RAY');
        }
        return true;
      },
    },
    {
      eventType: 'NECRO_SUMMON',
      handle(event: Extract<GameEvent, { type: 'NECRO_SUMMON' }>, ctx: GameEventContext) {
        if (ctx.effects.particlesRef && ctx.world.isVisible(event.data.x, event.data.y)) {
          const cx = event.data.x * TILE_SIZE + TILE_SIZE / 2;
          const cy = event.data.y * TILE_SIZE + TILE_SIZE / 2;
          spawnDust(ctx.effects.particlesRef, cx, cy, 8);
        }
        return true;
      },
    },
    {
      eventType: 'TENGU_JUMP',
      handle(event: Extract<GameEvent, { type: 'TENGU_JUMP' }>, ctx: GameEventContext) {
        if (ctx.effects.particlesRef && ctx.world.isVisible(event.data.x, event.data.y)) {
          const cx = event.data.x * TILE_SIZE + TILE_SIZE / 2;
          const cy = event.data.y * TILE_SIZE + TILE_SIZE / 2;
          spawnDust(ctx.effects.particlesRef, cx, cy, 12);
        }
        return true;
      },
    },
    {
      eventType: 'TENGU_TRAP_BURST',
      handle(event: Extract<GameEvent, { type: 'TENGU_TRAP_BURST' }>, ctx: GameEventContext) {
        const cells = event.data.cells;
        if (ctx.effects.particlesRef && cells) {
          for (const [x, y] of cells) {
            if (ctx.world.isVisible(x, y)) {
              spawnLight(ctx.effects.particlesRef, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 2);
            }
          }
        }
        if (cells) addFadingTraps(cells, 'tengu_dart');
        return true;
      },
    },
    {
      eventType: 'TENGU_BOMB',
      handle(event: Extract<GameEvent, { type: 'TENGU_BOMB' }>, ctx: GameEventContext) {
        ctx.effects.setMobAttack(event.data.mob, 400);
        setBombItem(event.data.x, event.data.y);
        pourBombSmoke(event.data.x, event.data.y, ctx);
        return true;
      },
    },
    {
      eventType: 'TENGU_BOMB_COUNTDOWN',
      handle(event: Extract<GameEvent, { type: 'TENGU_BOMB_COUNTDOWN' }>, ctx: GameEventContext) {
        if (ctx.world.isVisible(event.data.x, event.data.y)) {
          const cx = event.data.x * TILE_SIZE + TILE_SIZE / 2;
          const cy = event.data.y * TILE_SIZE;
          ctx.effects.spawnFloatingText(cx, cy, `${event.data.count}...`, '#ff6600');
        }
        pourBombSmoke(event.data.x, event.data.y, ctx);
        return true;
      },
    },
    {
      eventType: 'TENGU_BLAST',
      handle(event: Extract<GameEvent, { type: 'TENGU_BLAST' }>, ctx: GameEventContext) {
        clearBombItem();
        if (ctx.effects.particlesRef && ctx.world.isVisible(event.data.x, event.data.y)) {
          const cx = event.data.x * TILE_SIZE + TILE_SIZE / 2;
          const cy = event.data.y * TILE_SIZE + TILE_SIZE / 2;
          spawnCritSparkle(ctx.effects.particlesRef, cx, cy, 16, '#ff6600');
        }
        return true;
      },
    },
    {
      eventType: 'TENGU_FIRE',
      handle(event: Extract<GameEvent, { type: 'TENGU_FIRE' }>, ctx: GameEventContext) {
        if (ctx.effects.particlesRef) {
          for (const [x, y] of event.data.cells) {
            if (!ctx.world.isVisible(x, y)) continue;
            const cx = x * TILE_SIZE + TILE_SIZE / 2;
            const cy = y * TILE_SIZE + TILE_SIZE / 2;
            spawnCritSparkle(ctx.effects.particlesRef, cx, cy, 8, '#ff6600');
          }
        }
        return true;
      },
    },
    {
      eventType: 'TENGU_SHOCKER',
      handle(event: Extract<GameEvent, { type: 'TENGU_SHOCKER' }>, ctx: GameEventContext) {
        const ordinals = event.data.ordinals ?? true;
        if (ctx.effects.particlesRef) {
          for (const [x, y] of event.data.cells) {
            if (!ctx.world.isVisible(x, y)) continue;
            const cx = x * TILE_SIZE + TILE_SIZE / 2;
            const cy = y * TILE_SIZE + TILE_SIZE / 2;
            spawnCritSparkle(ctx.effects.particlesRef, cx, cy, 8, '#66ccff');

            const s = TILE_SIZE;
            const [bx, by] = [x * s + s / 2, y * s + s / 2];
            if (ordinals) {
              ctx.effects.spawnLightning(bx - s, by - s, bx + s, by + s, '#88ccff');
              ctx.effects.spawnLightning(bx - s, by + s, bx + s, by - s, '#88ccff');
            } else {
              ctx.effects.spawnLightning(bx, by - s, bx, by + s, '#88ccff');
              ctx.effects.spawnLightning(bx - s, by, bx + s, by, '#88ccff');
            }
          }
        }
        return true;
      },
    },
    {
      eventType: 'EYE_CHARGE',
      handle(event: Extract<GameEvent, { type: 'EYE_CHARGE' }>, ctx: GameEventContext) {
        ctx.effects.setMobCharge(event.data.mob, 1000);
        if (ctx.world.isVisible(event.data.target_x, event.data.target_y)) {
          ctx.audio.play('CHARGEUP');
        }
        return true;
      },
    },
    {
      eventType: 'EYE_DEATH_RAY',
      handle(event: Extract<GameEvent, { type: 'EYE_DEATH_RAY' }>, ctx: GameEventContext) {
        const sx = event.data.source_x * TILE_SIZE + TILE_SIZE / 2;
        const sy = event.data.source_y * TILE_SIZE + TILE_SIZE / 2;
        const tx = event.data.target_x * TILE_SIZE + TILE_SIZE / 2;
        const ty = event.data.target_y * TILE_SIZE + TILE_SIZE / 2;
        ctx.effects.spawnBeam(sx, sy, tx, ty, 'death_ray');
        if (ctx.world.isVisible(event.data.source_x, event.data.source_y)) {
          ctx.audio.play('RAY');
        }
        return true;
      },
    },
    {
      eventType: 'BOSS_YELL',
      handle(event: Extract<GameEvent, { type: 'BOSS_YELL' }>, ctx: GameEventContext) {
        if (ctx.world.isVisible(event.data.x, event.data.y)) {
          const cx = event.data.x * TILE_SIZE + TILE_SIZE / 2;
          const cy = event.data.y * TILE_SIZE - 2;
          ctx.effects.spawnFloatingText(cx, cy, event.data.text, '#ffff66');
        }
        return true;
      },
    },
    {
      eventType: 'DM300_TRAP_STEP',
      handle(event: Extract<GameEvent, { type: 'DM300_TRAP_STEP' }>, ctx: GameEventContext) {
        if (ctx.world.isVisible(event.data.x, event.data.y)) {
          const cx = event.data.x * TILE_SIZE + TILE_SIZE / 2;
          const cy = event.data.y * TILE_SIZE + TILE_SIZE / 2;
          if (ctx.effects.particlesRef) spawnSparkMoving(ctx.effects.particlesRef, cx, cy, 8);
          ctx.effects.shakeScreen(8, 200);
        }
        return true;
      },
    },
  ];
}
