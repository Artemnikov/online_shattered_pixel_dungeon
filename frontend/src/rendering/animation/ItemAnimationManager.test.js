import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ItemAnimationManager,
  PickupFlyAnimationStrategy,
  ProjectileAnimationStrategy,
  MagicMissileAnimationStrategy,
  BeamAnimationStrategy,
  LightningAnimationStrategy,
  FlareAnimationStrategy,
  SpellSpriteAnimationStrategy,
  StateParticlesAnimationStrategy,
  FloatingTextAnimationStrategy,
  SurpriseAnimationStrategy,
  ScreenShakeAnimationStrategy,
  ScreenFlashAnimationStrategy,
  defaultItemAnimationManager,
} from './ItemAnimationManager.ts';
import { VisualEffectsManager } from '../../net/services/VisualEffectsManager.ts';

function createMockEffects() {
  const flyingItemsRef = { current: [] };
  const projectilesRef = { current: [] };
  const magicMissileRef = { current: [] };
  const beamRef = { current: [] };
  const lightningRef = { current: [] };
  const flareEffectsRef = { current: [] };
  const spellSpriteEffectsRef = { current: [] };
  const stateEffectsRef = { current: [] };
  const floatingTextRef = { current: [] };
  const surpriseRef = { current: [] };
  const screenShakeRef = { current: null };
  const screenFlashRef = { current: null };

  const effects = new VisualEffectsManager({
    flyingItemsRef,
    projectilesRef,
    magicMissileRef,
    beamRef,
    lightningRef,
    flareEffectsRef,
    spellSpriteEffectsRef,
    stateEffectsRef,
    floatingTextRef,
    surpriseRef,
    screenShakeRef,
    screenFlashRef,
  });

  return {
    effects,
    flyingItemsRef,
    projectilesRef,
    magicMissileRef,
    beamRef,
    lightningRef,
    flareEffectsRef,
    spellSpriteEffectsRef,
    stateEffectsRef,
    floatingTextRef,
    surpriseRef,
    screenShakeRef,
    screenFlashRef,
  };
}

test('ItemAnimationManager: plays pickup fly animation with valid coords', () => {
  const mocks = createMockEffects();
  const manager = new ItemAnimationManager([new PickupFlyAnimationStrategy()]);

  const handled = manager.play(
    'pickup_fly',
    { itemName: 'Potion of Healing', itemType: 'potion', tileX: 5, tileY: 10 },
    { effects: mocks.effects }
  );

  assert.equal(handled, true);
  assert.equal(mocks.flyingItemsRef.current.length, 1);
  const entry = mocks.flyingItemsRef.current[0];
  assert.ok(Array.isArray(entry.coords), 'coords should be an array');
  assert.equal(entry.tileX, 5);
  assert.equal(entry.tileY, 10);
  assert.ok(typeof entry.startTime === 'number');
});

test('ItemAnimationManager: select item by desired effect (playItem)', () => {
  const mocks = createMockEffects();
  const manager = defaultItemAnimationManager;

  const itemWithEffect = {
    name: 'Wand of Magic Missile',
    type: 'wand',
    animationEffect: 'magic_missile',
  };

  const handled = manager.playItem(
    itemWithEffect,
    { startX: 10, startY: 10, targetX: 50, targetY: 50, projType: 'magic_missile' },
    { effects: mocks.effects }
  );

  assert.equal(handled, true);
  assert.equal(mocks.magicMissileRef.current.length, 1);
  const missile = mocks.magicMissileRef.current[0];
  assert.equal(missile.startX, 10);
  assert.equal(missile.startY, 10);
  assert.equal(missile.endX, 50);
  assert.equal(missile.endY, 50);
  assert.ok(typeof missile.duration === 'number');
});

test('ItemAnimationManager: plays beam animation', () => {
  const mocks = createMockEffects();
  const manager = defaultItemAnimationManager;

  const handled = manager.play(
    'beam',
    { startX: 0, startY: 0, targetX: 100, targetY: 100, beamType: 'death_ray' },
    { effects: mocks.effects }
  );

  assert.equal(handled, true);
  assert.equal(mocks.beamRef.current.length, 1);
  const beam = mocks.beamRef.current[0];
  assert.equal(beam.type, 'death_ray');
  assert.ok(beam.atlas !== undefined);
  assert.ok(typeof beam.duration === 'number');
});

test('ItemAnimationManager: plays projectile animation', () => {
  const mocks = createMockEffects();
  const manager = defaultItemAnimationManager;

  const handled = manager.play(
    'projectile',
    { startX: 0, startY: 0, targetX: 32, targetY: 64, projType: 'arrow' },
    { effects: mocks.effects }
  );

  assert.equal(handled, true);
  assert.equal(mocks.projectilesRef.current.length, 1);
  const proj = mocks.projectilesRef.current[0];
  assert.equal(proj.type, 'arrow');
  assert.equal(proj.targetX, 32);
});

test('ItemAnimationManager: plays flare and spell sprite animations', () => {
  const mocks = createMockEffects();
  const manager = defaultItemAnimationManager;

  manager.play('flare', { startX: 50, startY: 50, rays: 8, radius: 40, color: '#ff0000', durationMs: 500 }, { effects: mocks.effects });
  assert.equal(mocks.flareEffectsRef.current.length, 1);
  const flare = mocks.flareEffectsRef.current[0];
  assert.equal(flare.cx, 50);
  assert.equal(flare.nRays, 8);
  assert.equal(flare.durationMs, 500);

  manager.play('spell_sprite', { startX: 60, startY: 70, index: 2 }, { effects: mocks.effects });
  assert.equal(mocks.spellSpriteEffectsRef.current.length, 1);
  const spell = mocks.spellSpriteEffectsRef.current[0];
  assert.equal(spell.cx, 60);
  assert.equal(spell.cy, 70);
  assert.equal(spell.index, 2);
});

test('ItemAnimationManager: plays state particles and floating text', () => {
  const mocks = createMockEffects();
  const manager = defaultItemAnimationManager;

  manager.play('state_particles', { startX: 10, startY: 20, projType: 'burning' }, { effects: mocks.effects });
  assert.equal(mocks.stateEffectsRef.current.length, 1);
  const state = mocks.stateEffectsRef.current[0];
  assert.equal(state.cx, 10);
  assert.equal(state.type, 'burning');

  manager.play('floating_text', { startX: 15, startY: 25, text: 'CRIT!', color: '#ff0000' }, { effects: mocks.effects });
  assert.equal(mocks.floatingTextRef.current.length, 1);
  assert.equal(mocks.floatingTextRef.current[0].text, 'CRIT!');
});

test('ItemAnimationManager: returns false on unregistered effect without throwing', () => {
  const mocks = createMockEffects();
  const manager = new ItemAnimationManager();

  const handled = manager.play('non_existent_effect', {}, { effects: mocks.effects });
  assert.equal(handled, false);
});
