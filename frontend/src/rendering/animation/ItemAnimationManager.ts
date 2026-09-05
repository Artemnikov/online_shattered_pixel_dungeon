import type { VisualEffectsManager } from '../../net/services/VisualEffectsManager';
import type { AudioService } from '../../net/events/IGameEventHandler';
import type { WorldManager } from '../../net/services/WorldManager';
import type { EntityManager } from '../../net/services/EntityManager';
import type { Projectile } from '../../net/types';
import { coordsForItem } from '../sprites';

export interface AnimateableItem {
  name?: string;
  type?: string;
  kind?: string;
  animationEffect?: string;
  effect?: string;
  [key: string]: unknown;
}

export interface ItemAnimationPayload {
  itemName?: string;
  itemType?: string;
  item?: AnimateableItem | null;
  startX?: number;
  startY?: number;
  targetX?: number;
  targetY?: number;
  tileX?: number;
  tileY?: number;
  projType?: string;
  beamType?: string;
  color?: string;
  intensity?: number;
  rays?: number;
  radius?: number;
  durationMs?: number;
  index?: number;
  hpRatio?: number;
  text?: string;
  iconIndex?: number;
  key?: string | number;
  options?: Record<string, unknown>;
  isLocal?: boolean;
  sound?: string;
  effectType?: string;
}

export interface AnimationPlayContext {
  effects: VisualEffectsManager;
  audio?: AudioService;
  world?: WorldManager;
  entities?: EntityManager;
  myPlayerId?: string | null;
}

export interface IItemAnimationStrategy {
  readonly effectType: string;
  play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): boolean | void;
}

export class PickupFlyAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'pickup_fly';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const itemName = payload.itemName ?? payload.item?.name ?? '';
    const itemType = payload.itemType ?? payload.item?.type;
    const tileX = payload.tileX ?? 0;
    const tileY = payload.tileY ?? 0;
    ctx.effects.spawnFlyingItem(itemName, itemType, tileX, tileY);
  }
}

export class ProjectileAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'projectile';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const startX = payload.startX ?? 0;
    const startY = payload.startY ?? 0;
    const targetX = payload.targetX ?? startX;
    const targetY = payload.targetY ?? startY;
    const projType = payload.projType ?? 'arrow';
    const spriteCoords = payload.item ? coordsForItem(payload.item) : null;

    const projectile: Projectile = {
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      type: projType,
      spriteCoords,
      progress: 0,
      rotation: 0,
      finished: false,
    };
    ctx.effects.pushProjectile(projectile);
  }
}

export class MagicMissileAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'magic_missile';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const startX = payload.startX ?? 0;
    const startY = payload.startY ?? 0;
    const targetX = payload.targetX ?? startX;
    const targetY = payload.targetY ?? startY;
    const projType = payload.projType ?? 'magic_missile';
    ctx.effects.spawnMagicMissile(startX, startY, targetX, targetY, projType);
  }
}

export class BeamAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'beam';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const startX = payload.startX ?? 0;
    const startY = payload.startY ?? 0;
    const targetX = payload.targetX ?? startX;
    const targetY = payload.targetY ?? startY;
    const beamType = payload.beamType ?? 'death_ray';
    ctx.effects.spawnBeam(startX, startY, targetX, targetY, beamType, payload.hpRatio);
  }
}

export class LightningAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'lightning';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const startX = payload.startX ?? 0;
    const startY = payload.startY ?? 0;
    const targetX = payload.targetX ?? startX;
    const targetY = payload.targetY ?? startY;
    const color = payload.color ?? '#66ccff';
    ctx.effects.spawnLightning(startX, startY, targetX, targetY, color);
  }
}

export class FlareAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'flare';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const cx = payload.startX ?? payload.targetX ?? 0;
    const cy = payload.startY ?? payload.targetY ?? 0;
    const rays = payload.rays ?? 6;
    const radius = payload.radius ?? 64;
    const color = payload.color ?? '#ffffff';
    const durationMs = payload.durationMs ?? 800;
    ctx.effects.spawnFlare(cx, cy, rays, radius, color, durationMs);
  }
}

export class SpellSpriteAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'spell_sprite';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const cx = payload.startX ?? payload.targetX ?? 0;
    const cy = payload.startY ?? payload.targetY ?? 0;
    const index = payload.index ?? 1;
    ctx.effects.spawnSpellSprite(cx, cy, index);
  }
}

export class StateParticlesAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'state_particles';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const cx = payload.startX ?? payload.targetX ?? 0;
    const cy = payload.startY ?? payload.targetY ?? 0;
    const effect = payload.projType ?? payload.beamType ?? 'burning';
    const color = payload.color;
    ctx.effects.spawnStateParticles(cx, cy, effect, color);
  }
}

export class FloatingTextAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'floating_text';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const cx = payload.startX ?? payload.targetX ?? 0;
    const cy = payload.startY ?? payload.targetY ?? 0;
    const text = payload.text ?? '';
    const color = payload.color ?? '#ffffff';
    const iconIndex = payload.iconIndex ?? -1;
    const key = payload.key ?? -1;
    ctx.effects.spawnFloatingText(cx, cy, text, color, iconIndex, key, payload.options);
  }
}

export class SurpriseAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'surprise';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const cx = payload.startX ?? payload.targetX ?? 0;
    const cy = payload.startY ?? payload.targetY ?? 0;
    ctx.effects.spawnSurprise(cx, cy);
  }
}

export class ScreenShakeAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'screen_shake';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const intensity = payload.intensity ?? payload.radius ?? 2;
    const durationMs = payload.durationMs ?? 300;
    ctx.effects.shakeScreen(intensity, durationMs);
  }
}

export class ScreenFlashAnimationStrategy implements IItemAnimationStrategy {
  public readonly effectType = 'screen_flash';

  public play(payload: ItemAnimationPayload, ctx: AnimationPlayContext): void {
    const durationMs = payload.durationMs ?? 350;
    ctx.effects.flashScreen(durationMs);
  }
}

export class ItemAnimationManager {
  private strategies: Map<string, IItemAnimationStrategy> = new Map();

  constructor(strategies: IItemAnimationStrategy[] = []) {
    this.registerAll(strategies);
  }

  public register(strategy: IItemAnimationStrategy): this {
    this.strategies.set(strategy.effectType, strategy);
    return this;
  }

  public registerAll(strategies: IItemAnimationStrategy[]): this {
    for (const strategy of strategies) {
      this.register(strategy);
    }
    return this;
  }

  public has(effectType: string): boolean {
    return this.strategies.has(effectType);
  }

  public getStrategy(effectType: string): IItemAnimationStrategy | undefined {
    return this.strategies.get(effectType);
  }

  public play(
    effectType: string,
    payload: ItemAnimationPayload,
    ctx: AnimationPlayContext,
  ): boolean {
    const strategy = this.strategies.get(effectType);
    if (!strategy) {
      return false;
    }
    strategy.play(payload, ctx);
    return true;
  }

  public playItem(
    item: AnimateableItem | null | undefined,
    payload: ItemAnimationPayload,
    ctx: AnimationPlayContext,
  ): boolean {
    const desiredEffect =
      item?.animationEffect ?? item?.effect ?? payload.effectType ?? 'projectile';
    return this.play(desiredEffect, { ...payload, item: payload.item ?? item }, ctx);
  }
}

export function createDefaultItemAnimationManager(): ItemAnimationManager {
  return new ItemAnimationManager([
    new PickupFlyAnimationStrategy(),
    new ProjectileAnimationStrategy(),
    new MagicMissileAnimationStrategy(),
    new BeamAnimationStrategy(),
    new LightningAnimationStrategy(),
    new FlareAnimationStrategy(),
    new SpellSpriteAnimationStrategy(),
    new StateParticlesAnimationStrategy(),
    new FloatingTextAnimationStrategy(),
    new SurpriseAnimationStrategy(),
    new ScreenShakeAnimationStrategy(),
    new ScreenFlashAnimationStrategy(),
  ]);
}

export const defaultItemAnimationManager = createDefaultItemAnimationManager();
