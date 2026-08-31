import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HeroAnimationPipeline,
  defaultHeroAnimationPipeline,
  DownedAnimationState,
  AttackAnimationState,
  OperateAnimationState,
  ReadAnimationState,
  WalkAnimationState,
  IdleAnimationState,
} from './HeroAnimationPipeline.ts';

function createMockPlayer(x = 10, y = 10) {
  return {
    id: 'p1',
    name: 'Player',
    pos: { x, y },
    renderPos: { x, y },
    targetPos: null,
    animStartPos: { x, y },
    animStartTime: null,
    moveDuration: 150,
    is_downed: false,
  };
}

test('HeroAnimationPipeline: returns DownedAnimationState when player is downed', () => {
  const player = createMockPlayer();
  player.is_downed = true;
  const ctx = { player, anim: {}, now: 1000, deathElapsed: 150 };

  const state = defaultHeroAnimationPipeline.getActiveState(ctx);
  assert.equal(state.name, 'downed');
  assert.equal(defaultHeroAnimationPipeline.getFrameIndex(ctx), 11);
});

test('HeroAnimationPipeline: returns AttackAnimationState when attackUntil is active', () => {
  const player = createMockPlayer();
  const ctx = { player, anim: { attackUntil: 1200 }, now: 1000, deathElapsed: 0 };

  const state = defaultHeroAnimationPipeline.getActiveState(ctx);
  assert.equal(state.name, 'attack');
});

test('HeroAnimationPipeline: returns OperateAnimationState when operateUntil is active', () => {
  const player = createMockPlayer();
  const ctx = { player, anim: { operateUntil: 1200 }, now: 1000, deathElapsed: 0 };

  const state = defaultHeroAnimationPipeline.getActiveState(ctx);
  assert.equal(state.name, 'operate');
});

test('HeroAnimationPipeline: returns ReadAnimationState when readUntil is active', () => {
  const player = createMockPlayer();
  const ctx = { player, anim: { readUntil: 1200 }, now: 1000, deathElapsed: 0 };

  const state = defaultHeroAnimationPipeline.getActiveState(ctx);
  assert.equal(state.name, 'read');
});

test('HeroAnimationPipeline: returns WalkAnimationState only when position delta exists', () => {
  const player = createMockPlayer(10, 10);
  player.targetPos = { x: 11, y: 10 };
  player.renderPos = { x: 10.3, y: 10 };
  player.animStartTime = 1000;
  player.moveDuration = 150;

  const ctx = { player, anim: {}, now: 1050, deathElapsed: 0 };

  const state = defaultHeroAnimationPipeline.getActiveState(ctx);
  assert.equal(state.name, 'walk');
  const frame = defaultHeroAnimationPipeline.getFrameIndex(ctx);
  assert.ok([2, 3, 4, 5, 6, 7].includes(frame));
});

test('HeroAnimationPipeline: blocked movement with zero delta resolves to IdleAnimationState, NOT WalkAnimationState', () => {
  const player = createMockPlayer(10, 10);
  player.targetPos = { x: 10, y: 10 };
  player.renderPos = { x: 10, y: 10 };
  player.animStartTime = 1000;
  player.moveDuration = 150;

  const ctx = { player, anim: {}, now: 1050, deathElapsed: 0 };

  const state = defaultHeroAnimationPipeline.getActiveState(ctx);
  assert.equal(state.name, 'idle');
  const frame = defaultHeroAnimationPipeline.getFrameIndex(ctx);
  assert.ok([0, 1].includes(frame));
});

test('HeroAnimationPipeline: returns IdleAnimationState when at rest without targets', () => {
  const player = createMockPlayer(10, 10);
  const ctx = { player, anim: {}, now: 1000, deathElapsed: 0 };

  const state = defaultHeroAnimationPipeline.getActiveState(ctx);
  assert.equal(state.name, 'idle');
});

test('HeroAnimationPipeline: allows registering custom states with precedence', () => {
  const customState = {
    name: 'custom-stun',
    matches: (ctx) => ctx.anim.isStunned === true,
    getFrameIndex: () => 99,
  };

  const pipeline = new HeroAnimationPipeline();
  pipeline.register(customState, true);

  const player = createMockPlayer();
  const ctx = { player, anim: { isStunned: true }, now: 1000, deathElapsed: 0 };

  assert.equal(pipeline.getActiveState(ctx).name, 'custom-stun');
  assert.equal(pipeline.getFrameIndex(ctx), 99);
});
