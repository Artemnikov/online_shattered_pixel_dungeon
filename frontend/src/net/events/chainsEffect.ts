import { TILE_SIZE } from '../../constants';
import { spawnLightning } from '../../rendering/draw/lightning';
import type { Ref } from '../types';

const CHAIN_COLOR = '#8B7355';

export function playChainPull(
  lightningRef: Ref<unknown[]> | undefined,
  fromX: number, fromY: number, toX: number, toY: number,
  audio?: { play: (sound: string) => void },
): void {
  audio?.play('CHAINS');
  if (lightningRef) {
    spawnLightning(
      lightningRef,
      fromX * TILE_SIZE + TILE_SIZE / 2, fromY * TILE_SIZE + TILE_SIZE / 2,
      toX * TILE_SIZE + TILE_SIZE / 2, toY * TILE_SIZE + TILE_SIZE / 2,
      CHAIN_COLOR,
    );
  }
}
