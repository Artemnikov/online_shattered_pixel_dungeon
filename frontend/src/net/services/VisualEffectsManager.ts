import type { Ref, AnimState, Projectile } from '../types';
import {
  PLAYER_ATTACK_DURATION,
  PLAYER_OPERATE_DURATION,
  PLAYER_READ_DURATION,
} from '../../constants';
import { spawnFlyingItem } from '../../rendering/draw/flyingItem';
import { spawnBeam } from '../../rendering/draw/beam';
import { spawnMagicMissile } from '../../rendering/draw/magicMissile';
import { spawnFlare } from '../../rendering/draw/flare';
import { spawnSpellSprite } from '../../rendering/draw/spellSprite';
import { spawnStateParticles } from '../../rendering/draw/states';
import { spawnSurprise } from '../../rendering/draw/surprise';
import { spawnCheckedCells } from '../../rendering/draw/searchEffects';
import { spawnFloatingText } from '../../rendering/draw/floatingText';
import { spawnLightning } from '../../rendering/draw/lightning';
import {
  defaultItemAnimationManager,
  ItemAnimationManager,
  type AnimateableItem,
  type ItemAnimationPayload,
  type AnimationPlayContext,
} from '../../rendering/animation/ItemAnimationManager';

export interface FloatingTextOptions {
  fontSize?: number;
  lineWidth?: number;
  life?: number;
  icon?: number;
}

export interface VisualEffectsRefs {
  projectilesRef?: Ref<Projectile[]>;
  mobAnimRef?: Ref<Record<string, AnimState>>;
  playerAnimRef?: Ref<Record<string, AnimState>>;
  particlesRef?: Ref<unknown[]>;
  searchEffectsRef?: Ref<unknown[]>;
  floatingTextRef?: Ref<unknown[]>;
  warnedTilesRef?: Ref<{ tiles: [number, number][]; untilMs: number } | null>;
  screenFlashRef?: Ref<{ until: number } | null>;
  transmuteEffectsRef?: Ref<unknown[]>;
  flareEffectsRef?: Ref<unknown[]>;
  spellSpriteEffectsRef?: Ref<unknown[]>;
  lightningRef?: Ref<unknown[]>;
  shieldHaloRef?: Ref<unknown[]>;
  stateEffectsRef?: Ref<unknown[]>;
  screenShakeRef?: Ref<{ intensity: number; until: number } | null>;
  magicMissileRef?: Ref<unknown[]>;
  beamRef?: Ref<unknown[]>;
  surpriseRef?: Ref<unknown[]>;
  flyingItemsRef?: Ref<unknown[]>;
}

export class VisualEffectsManager {
  private refs: VisualEffectsRefs;
  private animationManager: ItemAnimationManager;

  constructor(refs: VisualEffectsRefs = {}, animationManager: ItemAnimationManager = defaultItemAnimationManager) {
    this.refs = refs;
    this.animationManager = animationManager;
  }

  public get particlesRef(): Ref<unknown[]> | undefined {
    return this.refs.particlesRef;
  }

  public get lightningRef(): Ref<unknown[]> | undefined {
    return this.refs.lightningRef;
  }

  public get beamRef(): Ref<unknown[]> | undefined {
    return this.refs.beamRef;
  }

  public get magicMissileRef(): Ref<unknown[]> | undefined {
    return this.refs.magicMissileRef;
  }

  public get floatingTextRef(): Ref<unknown[]> | undefined {
    return this.refs.floatingTextRef;
  }

  public get playerAnimRef(): Ref<Record<string, AnimState>> | undefined {
    return this.refs.playerAnimRef;
  }

  public get mobAnimRef(): Ref<Record<string, AnimState>> | undefined {
    return this.refs.mobAnimRef;
  }

  public get searchEffectsRef(): Ref<unknown[]> | undefined {
    return this.refs.searchEffectsRef;
  }

  public get flyingItemsRef(): Ref<unknown[]> | undefined {
    return this.refs.flyingItemsRef;
  }

  public get surpriseRef(): Ref<unknown[]> | undefined {
    return this.refs.surpriseRef;
  }

  public get stateEffectsRef(): Ref<unknown[]> | undefined {
    return this.refs.stateEffectsRef;
  }

  public get spellSpriteEffectsRef(): Ref<unknown[]> | undefined {
    return this.refs.spellSpriteEffectsRef;
  }

  public get flareEffectsRef(): Ref<unknown[]> | undefined {
    return this.refs.flareEffectsRef;
  }

  public get transmuteEffectsRef(): Ref<unknown[]> | undefined {
    return this.refs.transmuteEffectsRef;
  }

  public get screenFlashRef(): Ref<{ until: number } | null> | undefined {
    return this.refs.screenFlashRef;
  }

  public get screenShakeRef(): Ref<{ intensity: number; until: number } | null> | undefined {
    return this.refs.screenShakeRef;
  }

  public get warnedTilesRef(): Ref<{ tiles: [number, number][]; untilMs: number } | null> | undefined {
    return this.refs.warnedTilesRef;
  }

  public get projectilesRef(): Ref<Projectile[]> | undefined {
    return this.refs.projectilesRef;
  }

  public spawnFloatingText(
    cx: number,
    cy: number,
    text: string,
    color = '#ffffff',
    iconIndex = -1,
    key: string | number = -1,
    options?: FloatingTextOptions,
  ): void {
    if (this.refs.floatingTextRef) {
      spawnFloatingText(this.refs.floatingTextRef, cx, cy, text, color, iconIndex, key, options);
    }
  }

  public spawnBeam(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    type: string,
    hpRatio?: number,
  ): void {
    if (this.refs.beamRef) {
      spawnBeam(this.refs.beamRef, startX, startY, endX, endY, type, hpRatio);
    }
  }

  public spawnLightning(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color = '#66ccff',
  ): void {
    if (this.refs.lightningRef) {
      spawnLightning(this.refs.lightningRef, startX, startY, endX, endY, color);
    }
  }

  public spawnMagicMissile(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    projType: string,
  ): void {
    if (this.refs.magicMissileRef) {
      spawnMagicMissile(this.refs.magicMissileRef, startX, startY, targetX, targetY, projType);
    }
  }

  public spawnFlyingItem(
    item: string,
    itemType: string | undefined,
    tileX: number,
    tileY: number,
  ): void {
    if (this.refs.flyingItemsRef) {
      spawnFlyingItem(this.refs.flyingItemsRef, item, itemType, tileX, tileY);
    }
  }

  public spawnCheckedCells(
    cells: Array<[number, number]>,
    sourceX: number,
    sourceY: number,
  ): void {
    if (this.refs.searchEffectsRef) {
      spawnCheckedCells(this.refs.searchEffectsRef, cells, sourceX, sourceY);
    }
  }

  public spawnStateParticles(
    x: number,
    y: number,
    effect: string,
    color?: string,
  ): void {
    if (this.refs.stateEffectsRef) {
      spawnStateParticles(this.refs.stateEffectsRef, x, y, effect, color);
    }
  }

  public spawnSpellSprite(
    x: number,
    y: number,
    index: number,
  ): void {
    if (this.refs.spellSpriteEffectsRef) {
      spawnSpellSprite(this.refs.spellSpriteEffectsRef, x, y, index);
    }
  }

  public spawnFlare(
    cx: number,
    cy: number,
    rays = 6,
    radius = 64,
    color = '#ffffff',
    durationMs = 800,
  ): void {
    if (this.refs.flareEffectsRef) {
      spawnFlare(this.refs.flareEffectsRef, cx, cy, rays, radius, color, durationMs);
    }
  }

  public spawnSurprise(cx: number, cy: number): void {
    if (this.refs.surpriseRef) {
      spawnSurprise(this.refs.surpriseRef, cx, cy);
    }
  }

  private createPlayContext(ctx?: Partial<AnimationPlayContext>): AnimationPlayContext {
    return {
      effects: this,
      audio: ctx?.audio,
      world: ctx?.world,
      entities: ctx?.entities,
      myPlayerId: ctx?.myPlayerId,
    };
  }

  public playAnimation(
    effectType: string,
    payload: ItemAnimationPayload,
    ctx?: Partial<AnimationPlayContext>,
  ): boolean {
    return this.animationManager.play(effectType, payload, this.createPlayContext(ctx));
  }

  public playItemAnimation(
    item: AnimateableItem | null | undefined,
    payload: ItemAnimationPayload,
    ctx?: Partial<AnimationPlayContext>,
  ): boolean {
    return this.animationManager.playItem(item, payload, this.createPlayContext(ctx));
  }

  public shakeScreen(intensity: number, durationMs: number): void {
    if (this.refs.screenShakeRef) {
      this.refs.screenShakeRef.current = {
        intensity,
        until: performance.now() + durationMs,
      };
    }
  }

  public flashScreen(durationMs = 350): void {
    if (this.refs.screenFlashRef) {
      this.refs.screenFlashRef.current = { until: performance.now() + durationMs };
    }
  }

  public warnTiles(tiles: [number, number][], durationMs = 1500): void {
    if (this.refs.warnedTilesRef) {
      this.refs.warnedTilesRef.current = tiles.length
        ? { tiles, untilMs: performance.now() + durationMs }
        : null;
    }
  }

  public setPlayerOperate(playerId: string, durationMs = PLAYER_OPERATE_DURATION): void {
    if (!this.refs.playerAnimRef) return;
    if (!this.refs.playerAnimRef.current[playerId]) {
      this.refs.playerAnimRef.current[playerId] = {};
    }
    this.refs.playerAnimRef.current[playerId].operateUntil = performance.now() + durationMs;
  }

  public setPlayerRead(playerId: string, durationMs = PLAYER_READ_DURATION): void {
    if (!this.refs.playerAnimRef) return;
    if (!this.refs.playerAnimRef.current[playerId]) {
      this.refs.playerAnimRef.current[playerId] = {};
    }
    this.refs.playerAnimRef.current[playerId].readUntil = performance.now() + durationMs;
  }

  public setPlayerAttack(playerId: string, durationMs = PLAYER_ATTACK_DURATION): void {
    if (!this.refs.playerAnimRef) return;
    if (!this.refs.playerAnimRef.current[playerId]) {
      this.refs.playerAnimRef.current[playerId] = {};
    }
    this.refs.playerAnimRef.current[playerId].attackUntil = performance.now() + durationMs;
  }

  public setMobAttack(mobId: string, durationMs = 400): void {
    if (!this.refs.mobAnimRef) return;
    if (!this.refs.mobAnimRef.current[mobId]) {
      this.refs.mobAnimRef.current[mobId] = {};
    }
    this.refs.mobAnimRef.current[mobId].attackUntil = performance.now() + durationMs;
  }

  public setMobCharge(mobId: string, durationMs = 1000): void {
    if (!this.refs.mobAnimRef) return;
    if (!this.refs.mobAnimRef.current[mobId]) {
      this.refs.mobAnimRef.current[mobId] = {};
    }
    this.refs.mobAnimRef.current[mobId].chargeUntil = performance.now() + durationMs;
    this.refs.mobAnimRef.current[mobId].attackUntil = 0;
  }

  public setMobPump(mobId: string, durationMs = 1500): void {
    if (!this.refs.mobAnimRef) return;
    if (!this.refs.mobAnimRef.current[mobId]) {
      this.refs.mobAnimRef.current[mobId] = {};
    }
    this.refs.mobAnimRef.current[mobId].pumpUntil = durationMs > 0 ? performance.now() + durationMs : 0;
  }

  public pushProjectile(proj: Projectile): void {
    this.refs.projectilesRef?.current?.push(proj);
  }

  public addTransmuteEffect(effect: unknown): void {
    this.refs.transmuteEffectsRef?.current?.push(effect);
  }

  public clearFloorEffects(): void {
    if (this.refs.projectilesRef) this.refs.projectilesRef.current = [];
    if (this.refs.particlesRef) this.refs.particlesRef.current = [];
    if (this.refs.searchEffectsRef) this.refs.searchEffectsRef.current = [];
    if (this.refs.floatingTextRef) this.refs.floatingTextRef.current = [];
    if (this.refs.warnedTilesRef) this.refs.warnedTilesRef.current = null;
    if (this.refs.transmuteEffectsRef) this.refs.transmuteEffectsRef.current = [];
    if (this.refs.flareEffectsRef) this.refs.flareEffectsRef.current = [];
    if (this.refs.spellSpriteEffectsRef) this.refs.spellSpriteEffectsRef.current = [];
    if (this.refs.lightningRef) this.refs.lightningRef.current = [];
    if (this.refs.beamRef) this.refs.beamRef.current = [];
  }
}
