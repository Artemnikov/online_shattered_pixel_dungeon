import { TILE_SIZE, PLAYER_ATTACK_DURATION, HIT_CONNECT_DELAY, FLASH_DURATION } from '../../constants';
import AudioManager from '../../audio/AudioManager';
import { spawnBlood, spawnCorrosionSplash, spawnCritSparkle, spawnGrimShadow, spawnWhiteSplash, spawnEnergy, spawnBombBlast } from '../../rendering/draw/particles';
import { spawnSurprise } from '../../rendering/draw/surprise';
import { spawnFloatingText, TEXT_ICON } from '../../rendering/draw/floatingText';
import { coordsForItem } from '../../rendering/sprites';
import { spawnLightning } from '../../rendering/draw/lightning';
import { playChainPull } from './chainsEffect';
import { spawnMagicMissile, MISSILE_TYPES } from '../../rendering/draw/magicMissile';
import { spawnBeam } from '../../rendering/draw/beam';
import { spawnScreenShake } from '../../rendering/draw/screenShake';
import { spawnSparkMoving } from '../../rendering/draw/sparkParticle';
import { spawnFlameBurst } from '../../rendering/draw/flameParticle';
import { spawnEarthBurst } from '../../rendering/draw/earthParticle';
import { spawnPurpleBurst } from '../../rendering/draw/purpleParticle';
import { spawnRainbowBurst } from '../../rendering/draw/rainbowParticle';
import { spawnElmo } from '../../rendering/draw/elmoParticle';
import { addGameLog } from '../../ui/gameLogHelpers';
import type {
  GameEvent,
  AttackEvent,
  MissEvent,
  DamageEvent,
  DeathEvent,
  RangedAttackEvent,
  LightningArcEvent,
  ShockingProcEvent,
  SpawnEvent,
  PushEvent,
  GuardChainPullEvent,
  SummonEvent,
  BloomingProcEvent,
  CorruptProcEvent,
  VampiricProcEvent,
  BlockingProcEvent,
  ElasticProcEvent,
  CharmProcEvent,
  ExplosiveProcEvent,
  RepulsionProcEvent,
  ViscosityProcEvent,
  PotentialProcEvent,
  EntanglementProcEvent,
  ThornsProcEvent,
  AntiEntropyProcEvent,
  CorrosionProcEvent,
  DisplacementProcEvent,
  MetabolismProcEvent,
  StenchProcEvent,
} from '../../types/contract';
import type { AnimState, MoveResult, RenderPlayer, Ref, HandlerCtx } from '../types';

const BLOOD_COLORS: Record<string, string> = { Goo: '#000000' };

let lastLocalAttackTs = 0;

export interface EquippedWeaponMeta {
  name?: string;
  kind?: string;
  hit_sound?: string;
  hit_sound_pitch?: number;
  attack_cooldown?: number;
}

function weaponMeta(me: RenderPlayer | null | undefined): EquippedWeaponMeta | null | undefined {
  return me?.equipped_weapon as EquippedWeaponMeta | null | undefined;
}

function meleeCooldownMs(me: RenderPlayer | null | undefined): number {
  return (weaponMeta(me)?.attack_cooldown || 1.0) * 1000;
}

function noteServerAttackConfirmed(): void {
  lastLocalAttackTs = performance.now();
}

export function startLocalPlayerMeleeAnim(
  me: RenderPlayer | null | undefined,
  playerAnimRef: Ref<Record<string, AnimState>> | undefined,
): void {
  if (!me || me.is_downed || !playerAnimRef) return;
  const now = performance.now();
  if (now - lastLocalAttackTs < meleeCooldownMs(me)) return;
  lastLocalAttackTs = now;

  if (!playerAnimRef.current[me.id]) playerAnimRef.current[me.id] = {};
  playerAnimRef.current[me.id].attackUntil = now + PLAYER_ATTACK_DURATION;

  const weapon = weaponMeta(me);
  AudioManager.play(weapon?.hit_sound || 'HIT_BODY', (weapon?.hit_sound_pitch ?? 1.0) * (0.87 + Math.random() * 0.28));
}

import { defaultMoveResultDispatcher } from '../movement/MoveResultDispatcher';

export interface BumpCtx {
  me: RenderPlayer | null | undefined;
  playerAnimRef?: Ref<Record<string, AnimState>>;
  onOpenAlchemy?: () => void;
}

export function runLocalBumpFlow(result: MoveResult, ctx: BumpCtx): void {
  defaultMoveResultDispatcher.dispatch(result, {
    myPlayer: ctx.me ?? null,
    playerAnimRef: ctx.playerAnimRef,
    onOpenAlchemyRef: { current: ctx.onOpenAlchemy },
    onMeleeAttack: () => startLocalPlayerMeleeAnim(ctx.me, ctx.playerAnimRef),
    dx: 0,
    dy: 0,
  });
}

function rasterizeLine(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const cells: Array<{ x: number; y: number }> = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0, cy = y0;
  while (true) {
    if (cx !== x1 || cy !== y1) cells.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return cells;
}

function handleTetherProc(
  event: ElasticProcEvent | RepulsionProcEvent,
  ctx: HandlerCtx,
  lightningColor: string,
): boolean {
  const { entitiesRef, visionRef, particlesRef, lightningRef } = ctx;
  const tgt = entitiesRef.current.mobs[event.data.target] || entitiesRef.current.players[event.data.target];
  if (tgt && visionRef?.current?.visible?.has(`${event.data.to_x},${event.data.to_y}`)) {
    const fx = event.data.from_x * TILE_SIZE + TILE_SIZE / 2;
    const fy = event.data.from_y * TILE_SIZE + TILE_SIZE / 2;
    const tx = event.data.to_x * TILE_SIZE + TILE_SIZE / 2;
    const ty = event.data.to_y * TILE_SIZE + TILE_SIZE / 2;
    spawnSparkMoving(particlesRef, tx, ty, 5);
    spawnLightning(lightningRef, fx, fy, tx, ty, lightningColor);
  }
  return true;
}

function handleGasProc(
  event: CorrosionProcEvent | StenchProcEvent,
  ctx: HandlerCtx,
  count: number,
): boolean {
  const { particlesRef } = ctx;
  const x = event.data.x * TILE_SIZE + TILE_SIZE / 2;
  const y = event.data.y * TILE_SIZE + TILE_SIZE / 2;
  spawnCorrosionSplash(particlesRef, x, y, count);
  AudioManager.play('GAS');
  return true;
}

const MAGIC_PROJECTILES = new Set([
  'magic_bolt', 'magic_missile', 'fire_bolt', 'frost', 'corrosion',
  'foliage', 'force', 'beacon', 'shadow', 'rainbow', 'earth', 'ward',
  'shaman_red', 'shaman_blue', 'shaman_purple', 'elmo', 'poison', 'light_missile',
  'lightning', 'beam',
]);

export interface CombatFlow<T extends GameEvent = GameEvent> {
  handle(event: T, ctx: HandlerCtx): boolean;
}

class RangedAttackFlow implements CombatFlow<RangedAttackEvent> {
  handle(event: RangedAttackEvent, ctx: HandlerCtx): boolean {
    const {
      myPlayerIdRef, entitiesRef, visionRef, projectilesRef,
      playerAnimRef, particlesRef, lightningRef, magicMissileRef,
      beamRef, screenShakeRef,
    } = ctx;

    const startX = event.data.x * TILE_SIZE + TILE_SIZE / 2;
    const startY = event.data.y * TILE_SIZE + TILE_SIZE / 2;
    const targetX = event.data.target_x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = event.data.target_y * TILE_SIZE + TILE_SIZE / 2;
    const thrownItem = event.data.item;
    const spriteCoords = thrownItem ? coordsForItem(thrownItem) : null;
    const projType = event.data.projectile || 'arrow';
    const beamType = event.data.beam_type;

    if (!MAGIC_PROJECTILES.has(projType)) {
      projectilesRef.current.push({ x: startX, y: startY, startX, startY, targetX, targetY, type: projType, spriteCoords, progress: 0, rotation: 0, finished: false });
    }

    const src = event.data.source;
    const isLocal = src === myPlayerIdRef.current;
    const visible = visionRef?.current?.visible;
    const audible = isLocal || visible?.has(`${event.data.x},${event.data.y}`);

    const srcPlayer = entitiesRef.current.players[src];
    if (srcPlayer && playerAnimRef && event.data.is_wand) {
      if (!playerAnimRef.current[src]) playerAnimRef.current[src] = {};
      playerAnimRef.current[src].attackUntil = performance.now() + PLAYER_ATTACK_DURATION;
      const dx = event.data.target_x - event.data.x;
      if (dx > 0) { srcPlayer.facing = 'RIGHT'; srcPlayer.flipX = false; }
      else if (dx < 0) { srcPlayer.facing = 'LEFT'; srcPlayer.flipX = true; }
    }

    if (projType === 'lightning') {
      if (audible) AudioManager.play('LIGHTNING');
      spawnLightning(lightningRef, startX, startY, targetX, targetY, '#66ccff');
      spawnSparkMoving(particlesRef, targetX, targetY, 3);
      if (isLocal) spawnScreenShake(screenShakeRef, 2, 300);
    } else if (beamType && (projType === 'beam' || projType === 'magic_bolt')) {
      if (audible) AudioManager.play(event.data.sound ?? 'RAY');
      spawnBeam(beamRef, startX, startY, targetX, targetY, beamType, event.data.target_hp_ratio);
    } else if (event.data.is_wand) {
      if (audible) AudioManager.play(event.data.sound ?? 'ATTACK_MAGIC');
      if (MAGIC_PROJECTILES.has(projType)) spawnMagicMissile(magicMissileRef, startX, startY, targetX, targetY, projType);
    } else if (MAGIC_PROJECTILES.has(projType)) {
      if (audible) AudioManager.play(event.data.sound ?? 'ATTACK_MAGIC');
      spawnMagicMissile(magicMissileRef, startX, startY, targetX, targetY, projType);
    } else if (event.data.is_bow) {
      if (audible) AudioManager.play('ATTACK_BOW');
    } else if (thrownItem) {
      if (audible) AudioManager.play('THROW');
    } else {
      if (audible) AudioManager.play('ATTACK_BOW');
    }
    return true;
  }
}

class AttackFlow implements CombatFlow<AttackEvent> {
  handle(event: AttackEvent, ctx: HandlerCtx): boolean {
    const {
      myPlayerIdRef, entitiesRef, mobAnimRef, playerAnimRef,
      particlesRef, floatingTextRef, surpriseRef, selectedEnemyIdRef,
    } = ctx;

    const src = event.data.source;
    const tgt = event.data.target;
    const damage = event.data.damage || 0;
    const now = performance.now();

    const srcMob = entitiesRef.current.mobs[src];
    const srcPlayer = entitiesRef.current.players[src];
    const srcEntity = srcMob || srcPlayer;
    const tgtEntity = entitiesRef.current.mobs[tgt] || entitiesRef.current.players[tgt];

    if (tgt === myPlayerIdRef.current) {
      const attackerName = srcMob?.name || srcPlayer?.name || 'Something';
      addGameLog(`${attackerName} hits you for ${damage}`, 'negative');
    } else if (src === myPlayerIdRef.current) {
      const targetName = tgtEntity?.name || 'target';
      addGameLog(`You hit ${targetName} for ${damage}`, damage > 0 ? 'positive' : 'default');
    }

    if (src === myPlayerIdRef.current && !!entitiesRef.current.mobs[tgt]) {
      if (selectedEnemyIdRef) selectedEnemyIdRef.current = tgt;
    }

    if (src === myPlayerIdRef.current) {
      noteServerAttackConfirmed();
      if (event.data.crit || event.data.grim_proc) AudioManager.play('HIT_STRONG');
    }

    if (srcMob) {
      if (!mobAnimRef.current[src]) mobAnimRef.current[src] = {};
      const attackDuration = srcMob.name === 'Goo' ? 300 : srcMob.name === 'Scorpio' ? 200 : srcMob.name === 'Rat' ? 333 : srcMob.name === 'Snake' ? 333 : 250;
      mobAnimRef.current[src].attackUntil = now + attackDuration;
    } else if (srcPlayer && playerAnimRef) {
      if (!playerAnimRef.current[src]) playerAnimRef.current[src] = {};
      playerAnimRef.current[src].attackUntil = now + PLAYER_ATTACK_DURATION;
    }

    if (srcEntity && tgtEntity) {
      const dx = tgtEntity.renderPos.x - srcEntity.renderPos.x;
      if (dx > 0) { srcEntity.facing = 'RIGHT'; srcEntity.flipX = false; }
      else if (dx < 0) { srcEntity.facing = 'LEFT'; srcEntity.flipX = true; }
    }

    if (damage > 0 && tgtEntity) {
      const sc = srcEntity ? {
        x: srcEntity.renderPos.x * TILE_SIZE + TILE_SIZE / 2,
        y: srcEntity.renderPos.y * TILE_SIZE + TILE_SIZE / 2,
      } : null;
      const tc = {
        x: tgtEntity.renderPos.x * TILE_SIZE + TILE_SIZE / 2,
        y: tgtEntity.renderPos.y * TILE_SIZE + TILE_SIZE / 2,
      };
      const isMobTarget = !!entitiesRef.current.mobs[tgt];
      const maxHp = tgtEntity.max_hp || 1;
      const color = BLOOD_COLORS[tgtEntity.name] || '#bb0000';
      const isCrit = event.data.crit;
      const isGrim = event.data.grim_proc;
      const isSurprise = event.data.surprise;
      const hitIcon = isSurprise ? TEXT_ICON.HIT_SUPR
        : src === myPlayerIdRef.current ? TEXT_ICON.HIT_WEP
        : TEXT_ICON.HIT_BLS;

      setTimeout(() => {
        const flashDuration = isCrit ? FLASH_DURATION * 2 : FLASH_DURATION;
        const flashUntil = performance.now() + flashDuration;
        if (isMobTarget) {
          if (!mobAnimRef.current[tgt]) mobAnimRef.current[tgt] = {};
          mobAnimRef.current[tgt].flashUntil = flashUntil;
          if (particlesRef) {
            const awayAngle = sc ? Math.atan2(tc.y - sc.y, tc.x - sc.x) : -Math.PI / 2;
            if (isCrit) {
              const critCount = Math.min(Math.round(14 * Math.sqrt(damage / maxHp)), 14);
              spawnBlood(particlesRef, tc.x, tc.y, awayAngle, critCount, '#ffcc00');
              spawnCritSparkle(particlesRef, tc.x, tc.y, 10);
              spawnFloatingText(floatingTextRef, tc.x, tc.y - TILE_SIZE / 2, 'CRIT!', '#ffcc00', hitIcon);
            } else {
              const count = Math.min(Math.round(9 * Math.sqrt(damage / maxHp)), 9);
              spawnBlood(particlesRef, tc.x, tc.y, awayAngle, count, color);
            }
            if (isGrim) spawnGrimShadow(particlesRef, tc.x, tc.y, 8);
          }
        } else if (playerAnimRef) {
          if (!playerAnimRef.current[tgt]) playerAnimRef.current[tgt] = {};
          playerAnimRef.current[tgt].flashUntil = flashUntil;
          if (isCrit && floatingTextRef) spawnFloatingText(floatingTextRef, tc.x, tc.y - TILE_SIZE / 2, 'CRIT!', '#ffcc00', hitIcon);
          if (isGrim && floatingTextRef) spawnGrimShadow(particlesRef, tc.x, tc.y, 8);
        }
        if (isSurprise && surpriseRef) spawnSurprise(surpriseRef, tc.x, tc.y);
      }, HIT_CONNECT_DELAY);
    }
    return true;
  }
}

class MissFlow implements CombatFlow<MissEvent> {
  handle(event: MissEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, entitiesRef, visionRef, floatingTextRef } = ctx;
    const tgt = event.data.target;
    const verb = event.data.defense_verb || 'dodged';
    const target = entitiesRef.current.mobs[tgt] || entitiesRef.current.players[tgt];

    if (tgt === myPlayerIdRef.current) {
      addGameLog(`You ${verb}`, 'warning');
    } else if (event.data.source === myPlayerIdRef.current) {
      addGameLog(`${target?.name || 'target'} ${verb}`, 'warning');
    }
    if (target) {
      const visible = visionRef?.current?.visible;
      const tx = Math.round(target.renderPos.x);
      const ty = Math.round(target.renderPos.y);
      if (tgt === myPlayerIdRef.current || visible?.has(`${tx},${ty}`)) {
        const cx = target.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = target.renderPos.y * TILE_SIZE;
        if (floatingTextRef) {
          const missIcon = verb === 'blocked' ? TEXT_ICON.MISS_ARM
            : verb === 'dodged' ? TEXT_ICON.MISS_EVA
            : TEXT_ICON.MISS_DEF;
          spawnFloatingText(floatingTextRef, cx, cy, verb, '#ffffff', missIcon);
        }
        AudioManager.play('MISS');
      }
    }
    return true;
  }
}

class DamageFlow implements CombatFlow<DamageEvent> {
  handle(event: DamageEvent, ctx: HandlerCtx): boolean {
    const {
      myPlayerIdRef, entitiesRef, visionRef, mobAnimRef,
      playerAnimRef, particlesRef, floatingTextRef, dyingMobsRef,
    } = ctx;

    const tgt = event.data.target;
    const tgtEntity = entitiesRef.current.mobs[tgt] || dyingMobsRef.current[tgt] || entitiesRef.current.players[tgt];
    if (!tgtEntity) return true;
    const isGrim = event.data.grim_proc;
    const isCrit = event.data.crit;
    const amount = event.data.amount || 0;
    const tc = {
      x: tgtEntity.renderPos.x * TILE_SIZE + TILE_SIZE / 2,
      y: tgtEntity.renderPos.y * TILE_SIZE + TILE_SIZE / 2,
    };
    const projectile = event.data.projectile;
    const isMagic = projectile && MAGIC_PROJECTILES.has(projectile);
    const missileDelay = isMagic ? ((MISSILE_TYPES as Record<string, { life: number }>)[projectile]?.life ?? 400) : 0;

    setTimeout(() => {
      if (isMagic && particlesRef) {
        const count = event.data.splash_count ?? 3;
        if (projectile === 'beam') {
          const sx = event.data.source_x;
          const sy = event.data.source_y;
          if (sx != null && sy != null && visionRef?.current?.visible) {
            const beamType = event.data.beam_type;
            const cells = rasterizeLine(sx, sy, Math.round(tgtEntity.renderPos.x), Math.round(tgtEntity.renderPos.y));
            for (const cell of cells) {
              const key = `${cell.x},${cell.y}`;
              if (!visionRef.current.visible.has(key)) continue;
              const px = cell.x * TILE_SIZE + TILE_SIZE / 2;
              const py = cell.y * TILE_SIZE + TILE_SIZE / 2;
              if (beamType === 'health_ray') {
                spawnBlood(particlesRef, px, py, -Math.PI / 2, 1, '#cc0000');
              } else if (beamType === 'light_ray') {
                spawnRainbowBurst(particlesRef, px, py, 2);
              } else {
                spawnPurpleBurst(particlesRef, px, py, 1);
              }
            }
          }
        } else {
          switch (projectile) {
            case 'fire_bolt':
              spawnFlameBurst(particlesRef, tc.x, tc.y, 5);
              break;
            case 'frost':
              spawnWhiteSplash(particlesRef, tc.x, tc.y, 5);
              break;
            case 'corrosion':
              spawnCorrosionSplash(particlesRef, tc.x, tc.y, 5);
              break;
            case 'earth':
            case 'force':
              spawnEarthBurst(particlesRef, tc.x, tc.y, 8);
              break;
            case 'shadow':
            case 'ward':
              spawnPurpleBurst(particlesRef, tc.x, tc.y, 6);
              break;
            case 'rainbow':
              spawnRainbowBurst(particlesRef, tc.x, tc.y, 10);
              break;
            case 'elmo':
              spawnElmo(particlesRef, tc.x, tc.y, 4);
              break;
            case 'foliage':
              spawnEarthBurst(particlesRef, tc.x, tc.y, 6);
              break;
          }
        }
        spawnWhiteSplash(particlesRef, tc.x, tc.y, count);
        const isAudible = tgt === myPlayerIdRef.current
          || visionRef?.current?.visible?.has(`${Math.round(tgtEntity.renderPos.x)},${Math.round(tgtEntity.renderPos.y)}`);
        if (isAudible) AudioManager.play('HIT_MAGIC', 0.87 + Math.random() * 0.28);
        if (isAudible) {
          switch (projectile) {
            case 'fire_bolt': AudioManager.play('BURNING', 1.0, 250); break;
            case 'frost': AudioManager.play('SHATTER', 0.9, 250); break;
            case 'force': AudioManager.play('BLAST', 0.9, 250); break;
            case 'corrosion': AudioManager.play('GAS', 0.9, 250); break;
            case 'earth': AudioManager.play('HIT_MAGIC', 0.85, 250); break;
            case 'shadow': AudioManager.play('HIT_MAGIC', 0.8, 250); break;
          }
        }
      }
      if (isMagic) {
        const flashDuration = isCrit ? FLASH_DURATION * 2 : FLASH_DURATION;
        const flashUntil = performance.now() + flashDuration;
        if (entitiesRef.current.mobs[tgt]) {
          if (!mobAnimRef.current[tgt]) mobAnimRef.current[tgt] = {};
          mobAnimRef.current[tgt].flashUntil = flashUntil;
        } else if (playerAnimRef && entitiesRef.current.players[tgt]) {
          if (!playerAnimRef.current[tgt]) playerAnimRef.current[tgt] = {};
          playerAnimRef.current[tgt].flashUntil = flashUntil;
        }
      }
      if (amount > 0 && floatingTextRef) {
        const color = isCrit ? '#ffcc00' : '#ff6666';
        const text = isCrit ? `${amount} CRIT!` : `-${amount}`;
        spawnFloatingText(floatingTextRef, tc.x, tc.y - TILE_SIZE / 2, text, color, TEXT_ICON.PHYS_DMG);
      }
      if (isGrim && particlesRef) spawnGrimShadow(particlesRef, tc.x, tc.y, 8);
      if (isCrit && floatingTextRef) spawnFloatingText(floatingTextRef, tc.x, tc.y - TILE_SIZE / 2, 'CRIT!', '#ffcc00');
    }, missileDelay);
    return true;
  }
}

class LightningArcFlow implements CombatFlow<LightningArcEvent> {
  handle(event: LightningArcEvent, ctx: HandlerCtx): boolean {
    const { visionRef, lightningRef, particlesRef } = ctx;
    const sx = event.data.source_x * TILE_SIZE + TILE_SIZE / 2;
    const sy = event.data.source_y * TILE_SIZE + TILE_SIZE / 2;
    const tx = event.data.target_x * TILE_SIZE + TILE_SIZE / 2;
    const ty = event.data.target_y * TILE_SIZE + TILE_SIZE / 2;
    const vis = visionRef?.current?.visible;
    if (!vis?.has(`${event.data.source_x},${event.data.source_y}`) && !vis?.has(`${event.data.target_x},${event.data.target_y}`)) {
      return true;
    }
    spawnLightning(lightningRef, sx, sy, tx, ty, '#66ccff');
    spawnSparkMoving(particlesRef, tx, ty, 3);
    AudioManager.play('LIGHTNING');
    return true;
  }
}

class ShockingProcFlow implements CombatFlow<ShockingProcEvent> {
  handle(event: ShockingProcEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, visionRef, particlesRef, screenShakeRef, lightningRef } = ctx;
    const dfX = event.data.defender_x * TILE_SIZE + TILE_SIZE / 2;
    const dfY = event.data.defender_y * TILE_SIZE + TILE_SIZE / 2;
    if (visionRef?.current?.visible?.has(`${event.data.defender_x},${event.data.defender_y}`)) {
      spawnSparkMoving(particlesRef, dfX, dfY, 3);
      AudioManager.play('LIGHTNING');
      if (event.data.source === myPlayerIdRef.current) spawnScreenShake(screenShakeRef, 2, 300);
      for (const tgt of event.data.chain_targets || []) {
        const tx = tgt.x * TILE_SIZE + TILE_SIZE / 2;
        const ty = tgt.y * TILE_SIZE + TILE_SIZE / 2;
        spawnLightning(lightningRef, dfX, dfY, tx, ty, '#66ccff');
      }
    }
    return true;
  }
}

class ExplosiveProcFlow implements CombatFlow<ExplosiveProcEvent> {
  handle(event: ExplosiveProcEvent, ctx: HandlerCtx): boolean {
    const { particlesRef, screenShakeRef } = ctx;
    const ex = event.data.x * TILE_SIZE + TILE_SIZE / 2;
    const ey = event.data.y * TILE_SIZE + TILE_SIZE / 2;
    spawnBombBlast(particlesRef, ex, ey, 26);
    spawnScreenShake(screenShakeRef, 3, 400);
    AudioManager.play('BLAST');
    return true;
  }
}

class AntiEntropyProcFlow implements CombatFlow<AntiEntropyProcEvent> {
  handle(event: AntiEntropyProcEvent, ctx: HandlerCtx): boolean {
    const { particlesRef } = ctx;
    const x = event.data.x * TILE_SIZE + TILE_SIZE / 2;
    const y = event.data.y * TILE_SIZE + TILE_SIZE / 2;
    spawnFlameBurst(particlesRef, x, y, 6);
    spawnWhiteSplash(particlesRef, x, y, 6);
    AudioManager.play('BURNING');
    return true;
  }
}

class CorrosionProcFlow implements CombatFlow<CorrosionProcEvent> {
  handle(event: CorrosionProcEvent, ctx: HandlerCtx): boolean {
    return handleGasProc(event, ctx, 8);
  }
}

class DisplacementProcFlow implements CombatFlow<DisplacementProcEvent> {
  handle(event: DisplacementProcEvent, ctx: HandlerCtx): boolean {
    const { entitiesRef, visionRef, particlesRef } = ctx;
    const def = entitiesRef.current.players[event.data.defender] || entitiesRef.current.mobs[event.data.defender];
    if (def && visionRef?.current?.visible?.has(`${Math.round(def.renderPos.x)},${Math.round(def.renderPos.y)}`)) {
      const px = def.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = def.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
      spawnPurpleBurst(particlesRef, px, py, 6);
      AudioManager.play('TELEPORT');
    }
    return true;
  }
}

class StenchProcFlow implements CombatFlow<StenchProcEvent> {
  handle(event: StenchProcEvent, ctx: HandlerCtx): boolean {
    return handleGasProc(event, ctx, 6);
  }
}

class DeathFlow implements CombatFlow<DeathEvent> {
  handle(event: DeathEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, onPlayerDeath, entitiesRef, dyingMobsRef, selectedEnemyIdRef } = ctx;
    const id = event.data.target;
    if (id === myPlayerIdRef.current) {
      onPlayerDeath?.({
        score_breakdown: event.data.score_breakdown,
        can_resurrect: event.data.can_resurrect,
        has_ankh: event.data.has_ankh,
        victory: event.data.victory,
        respawns_used: event.data.respawns_used,
        max_respawns: event.data.max_respawns,
        loot_dropped: event.data.loot_dropped,
        death_cause: event.data.death_cause,
      });
      return true;
    }
    const mob = entitiesRef.current.mobs[id];
    if (mob) {
      dyingMobsRef.current[id] = { ...mob, renderPos: { ...mob.renderPos }, deathStart: performance.now() };
      if (mob.faction === 'enemy') addGameLog(`${mob.name} defeated!`, 'positive');
    }
    if (selectedEnemyIdRef?.current === id) selectedEnemyIdRef.current = null;
    return true;
  }
}

class SpawnFlow implements CombatFlow<SpawnEvent> {
  handle(event: SpawnEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, entitiesRef, visionRef, particlesRef } = ctx;
    const id = event.data.target;
    if (event.data.is_resurrect) {
      const entity = entitiesRef.current.players[id];
      if (entity) {
        const px = entity.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
        const py = entity.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
        if (id === myPlayerIdRef.current || visionRef?.current?.visible?.has(`${Math.round(entity.renderPos.x)},${Math.round(entity.renderPos.y)}`)) {
          spawnWhiteSplash(particlesRef, px, py, 12);
          spawnEnergy(particlesRef, px, py, 10);
          AudioManager.play('REVIVE');
          if (id !== myPlayerIdRef.current) {
            addGameLog(`${entity.name || 'Player'} was resurrected!`, 'positive');
          }
        }
      }
    }
    return true;
  }
}

class PushFlow implements CombatFlow<PushEvent> {
  handle(event: PushEvent, ctx: HandlerCtx): boolean {
    const { entitiesRef, visionRef, particlesRef } = ctx;
    const tgt = event.data.target;
    const mob = entitiesRef.current.mobs[tgt];
    const player = entitiesRef.current.players[tgt];
    const entity = mob || player;
    if (entity) {
      const visible = visionRef?.current?.visible?.has(`${Math.round(entity.renderPos.x)},${Math.round(entity.renderPos.y)}`);
      if (visible) {
        const px = entity.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
        const py = entity.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
        spawnWhiteSplash(particlesRef, px, py, 4);
        AudioManager.play('HIT_BODY');
      }
    }
    return true;
  }
}

class GuardChainPullFlow implements CombatFlow<GuardChainPullEvent> {
  handle(event: GuardChainPullEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, visionRef, lightningRef } = ctx;
    const visible = visionRef?.current?.visible;
    const fromKey = `${event.data.from_x},${event.data.from_y}`;
    const toKey = `${event.data.to_x},${event.data.to_y}`;
    if (event.data.target === myPlayerIdRef.current || visible?.has(fromKey) || visible?.has(toKey)) {
      playChainPull(lightningRef, event.data.from_x, event.data.from_y, event.data.to_x, event.data.to_y);
    }
    return true;
  }
}

class SummonFlow implements CombatFlow<SummonEvent> {
  handle(event: SummonEvent, ctx: HandlerCtx): boolean {
    const { visionRef, particlesRef } = ctx;
    const px = event.data.x * TILE_SIZE + TILE_SIZE / 2;
    const py = event.data.y * TILE_SIZE + TILE_SIZE / 2;
    const visible = visionRef?.current?.visible?.has(`${event.data.x},${event.data.y}`);
    if (visible) {
      spawnWhiteSplash(particlesRef, px, py, 8);
      spawnEnergy(particlesRef, px, py, 6);
      AudioManager.play('TELEPORT');
    }
    return true;
  }
}

class BloomingProcFlow implements CombatFlow<BloomingProcEvent> {
  handle(event: BloomingProcEvent, ctx: HandlerCtx): boolean {
    const { entitiesRef, visionRef, particlesRef } = ctx;
    const cx = event.data.defender;
    const entity = entitiesRef.current.mobs[cx] || entitiesRef.current.players[cx];
    if (entity && visionRef?.current?.visible?.has(`${Math.round(entity.renderPos.x)},${Math.round(entity.renderPos.y)}`)) {
      const px = entity.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = entity.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
      spawnEarthBurst(particlesRef, px, py, 6);
    }
    return true;
  }
}

class CorruptProcFlow implements CombatFlow<CorruptProcEvent> {
  handle(event: CorruptProcEvent, ctx: HandlerCtx): boolean {
    const { entitiesRef, visionRef, particlesRef } = ctx;
    const tgt = event.data.target;
    const entity = entitiesRef.current.mobs[tgt] || entitiesRef.current.players[tgt];
    if (entity && visionRef?.current?.visible?.has(`${Math.round(entity.renderPos.x)},${Math.round(entity.renderPos.y)}`)) {
      const px = entity.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = entity.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
      spawnPurpleBurst(particlesRef, px, py, 8);
      AudioManager.play('CURSE');
    }
    return true;
  }
}

class VampiricProcFlow implements CombatFlow<VampiricProcEvent> {
  handle(event: VampiricProcEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, entitiesRef, visionRef, particlesRef, floatingTextRef } = ctx;
    const src = event.data.source;
    const entity = entitiesRef.current.players[src] || entitiesRef.current.mobs[src];
    if (entity && (src === myPlayerIdRef.current || visionRef?.current?.visible?.has(`${Math.round(entity.renderPos.x)},${Math.round(entity.renderPos.y)}`))) {
      const px = entity.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = entity.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
      spawnBlood(particlesRef, px, py, -Math.PI / 2, 4, '#cc0000');
      if (event.data.heal > 0 && floatingTextRef) {
        spawnFloatingText(floatingTextRef, px, py - TILE_SIZE / 2, `+${event.data.heal}`, '#2ecc71', TEXT_ICON.HIT_WEP);
      }
    }
    return true;
  }
}

class BlockingProcFlow implements CombatFlow<BlockingProcEvent> {
  handle(event: BlockingProcEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, particlesRef, screenShakeRef, floatingTextRef } = ctx;
    if (event.data.source === myPlayerIdRef.current) {
      spawnWhiteSplash(particlesRef, 0, 0, 5);
      spawnScreenShake(screenShakeRef, 1, 200);
      if (event.data.shield > 0 && floatingTextRef) {
        spawnFloatingText(floatingTextRef, 0, 0, `block ${event.data.shield}`, '#66ccff', TEXT_ICON.MISS_ARM);
      }
    }
    return true;
  }
}

class ElasticProcFlow implements CombatFlow<ElasticProcEvent> {
  handle(event: ElasticProcEvent, ctx: HandlerCtx): boolean {
    return handleTetherProc(event, ctx, '#66ff99');
  }
}

class CharmProcFlow implements CombatFlow<CharmProcEvent> {
  handle(event: CharmProcEvent, ctx: HandlerCtx): boolean {
    const { entitiesRef, visionRef, particlesRef } = ctx;
    const src = event.data.source;
    const entity = entitiesRef.current.players[src] || entitiesRef.current.mobs[src];
    if (entity && visionRef?.current?.visible?.has(`${Math.round(entity.renderPos.x)},${Math.round(entity.renderPos.y)}`)) {
      const px = entity.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = entity.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
      spawnRainbowBurst(particlesRef, px, py, 6);
      AudioManager.play('CURSE');
    }
    return true;
  }
}

class RepulsionProcFlow implements CombatFlow<RepulsionProcEvent> {
  handle(event: RepulsionProcEvent, ctx: HandlerCtx): boolean {
    return handleTetherProc(event, ctx, '#ffcc66');
  }
}

class ViscosityProcFlow implements CombatFlow<ViscosityProcEvent> {
  handle(event: ViscosityProcEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, particlesRef, floatingTextRef } = ctx;
    if (event.data.defender === myPlayerIdRef.current) {
      spawnWhiteSplash(particlesRef, 0, 0, 5);
      if (event.data.deferred > 0 && floatingTextRef) {
        spawnFloatingText(floatingTextRef, 0, 0, `deferred ${event.data.deferred}`, '#66ccff', TEXT_ICON.MISS_ARM);
      }
    }
    return true;
  }
}

class PotentialProcFlow implements CombatFlow<PotentialProcEvent> {
  handle(event: PotentialProcEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, entitiesRef, visionRef, particlesRef } = ctx;
    const def = entitiesRef.current.players[event.data.defender] || entitiesRef.current.mobs[event.data.defender];
    if (def && (event.data.defender === myPlayerIdRef.current || visionRef?.current?.visible?.has(`${Math.round(def.renderPos.x)},${Math.round(def.renderPos.y)}`))) {
      const px = def.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = def.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
      spawnEnergy(particlesRef, px, py, 6);
      AudioManager.play('SPARK');
    }
    return true;
  }
}

class EntanglementProcFlow implements CombatFlow<EntanglementProcEvent> {
  handle(event: EntanglementProcEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, entitiesRef, visionRef, particlesRef, floatingTextRef } = ctx;
    const def = entitiesRef.current.players[event.data.defender] || entitiesRef.current.mobs[event.data.defender];
    if (def && (event.data.defender === myPlayerIdRef.current || visionRef?.current?.visible?.has(`${Math.round(def.renderPos.x)},${Math.round(def.renderPos.y)}`))) {
      const px = def.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = def.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
      spawnEarthBurst(particlesRef, px, py, 8);
      if (event.data.absorb > 0 && floatingTextRef) {
        spawnFloatingText(floatingTextRef, px, py - TILE_SIZE / 2, `absorb ${event.data.absorb}`, '#2ecc71', TEXT_ICON.MISS_ARM);
      }
    }
    return true;
  }
}

class ThornsProcFlow implements CombatFlow<ThornsProcEvent> {
  handle(event: ThornsProcEvent, ctx: HandlerCtx): boolean {
    const { entitiesRef, visionRef, particlesRef, floatingTextRef } = ctx;
    const atk = entitiesRef.current.mobs[event.data.attacker] || entitiesRef.current.players[event.data.attacker];
    if (atk && visionRef?.current?.visible?.has(`${Math.round(atk.renderPos.x)},${Math.round(atk.renderPos.y)}`)) {
      const px = atk.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = atk.renderPos.y * TILE_SIZE + TILE_SIZE / 2;
      spawnBlood(particlesRef, px, py, -Math.PI / 2, 4, '#cc0000');
      if (event.data.bleed > 0 && floatingTextRef) {
        spawnFloatingText(floatingTextRef, px, py - TILE_SIZE / 2, `bleed ${event.data.bleed}`, '#ff6666', TEXT_ICON.HIT_BLS);
      }
    }
    return true;
  }
}

class MetabolismProcFlow implements CombatFlow<MetabolismProcEvent> {
  handle(event: MetabolismProcEvent, ctx: HandlerCtx): boolean {
    const { myPlayerIdRef, floatingTextRef } = ctx;
    if (event.data.defender === myPlayerIdRef.current) {
      if (event.data.heal > 0 && floatingTextRef) {
        spawnFloatingText(floatingTextRef, 0, 0, `+${event.data.heal} metabolism`, '#2ecc71', TEXT_ICON.HIT_BLS);
      }
    }
    return true;
  }
}

type CombatFlowMap = {
  [K in GameEvent['type']]?: CombatFlow<Extract<GameEvent, { type: K }>>;
};

const COMBAT_FLOWS: CombatFlowMap = {
  RANGED_ATTACK: new RangedAttackFlow(),
  ATTACK: new AttackFlow(),
  MISS: new MissFlow(),
  DAMAGE: new DamageFlow(),
  LIGHTNING_ARC: new LightningArcFlow(),
  SHOCKING_PROC: new ShockingProcFlow(),
  DEATH: new DeathFlow(),
  SPAWN: new SpawnFlow(),
  PUSH: new PushFlow(),
  GUARD_CHAIN_PULL: new GuardChainPullFlow(),
  SUMMON: new SummonFlow(),
  BLOOMING_PROC: new BloomingProcFlow(),
  CORRUPT_PROC: new CorruptProcFlow(),
  VAMPIRIC_PROC: new VampiricProcFlow(),
  BLOCKING_PROC: new BlockingProcFlow(),
  ELASTIC_PROC: new ElasticProcFlow(),
  CHARM_PROC: new CharmProcFlow(),
  EXPLOSIVE_PROC: new ExplosiveProcFlow(),
  REPULSION_PROC: new RepulsionProcFlow(),
  VISCOSITY_PROC: new ViscosityProcFlow(),
  POTENTIAL_PROC: new PotentialProcFlow(),
  ENTANGLEMENT_PROC: new EntanglementProcFlow(),
  THORNS_PROC: new ThornsProcFlow(),
  ANTI_ENTROPY_PROC: new AntiEntropyProcFlow(),
  CORROSION_PROC: new CorrosionProcFlow(),
  DISPLACEMENT_PROC: new DisplacementProcFlow(),
  METABOLISM_PROC: new MetabolismProcFlow(),
  STENCH_PROC: new StenchProcFlow(),
};

export function handleCombatEvents(event: GameEvent, ctx: HandlerCtx): boolean {
  const flow = COMBAT_FLOWS[event.type] as CombatFlow<GameEvent> | undefined;
  if (!flow) return false;
  return flow.handle(event, ctx);
}
