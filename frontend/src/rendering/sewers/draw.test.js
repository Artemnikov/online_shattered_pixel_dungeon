import test from 'node:test';
import assert from 'node:assert/strict';

import { drawInstructions, drawSewerTileBase } from './draw.js';
import { BACKEND_TILE } from '../../constants.js';
import { QUADRANT } from './constants.js';

const makeCtx = () => {
  const calls = [];
  return {
    calls,
    globalAlpha: 1,
    drawImage: (...args) => {
      calls.push(args);
    },
    save: () => {},
    restore: () => {},
  };
};

test('drawInstructions renders full and quarter tiles', () => {
  const ctx = makeCtx();
  const image = { width: 256, height: 256 };

  drawInstructions(
    ctx,
    image,
    [
      { srcIndex: 0, quadrant: QUADRANT.FULL },
      { srcIndex: 1, quadrant: QUADRANT.TR, alpha: 0.5 },
    ],
    2,
    3
  );

  assert.equal(ctx.calls.length, 2);

  const full = ctx.calls[0];
  assert.equal(full[5], 64);
  assert.equal(full[6], 96);

  const quarter = ctx.calls[1];
  assert.equal(quarter[5], 80);
  assert.equal(quarter[6], 96);
});

test('drawSewerTileBase draws instructions for floor water cells', () => {
  const ctx = makeCtx();
  const atlas = { width: 256, height: 256 };
  const grid = [[BACKEND_TILE.FLOOR_WATER.id]];

  const drawn = drawSewerTileBase(ctx, atlas, grid, 0, 0, BACKEND_TILE.FLOOR_WATER.id);

  assert.equal(drawn, true);
});
