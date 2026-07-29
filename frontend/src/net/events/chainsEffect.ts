import { TILE_SIZE } from '../../constants';
import AudioManager from '../../audio/AudioManager';
import { spawnLightning } from '../../rendering/draw/lightning';
import type { Ref } from '../types';

const CHAIN_COLOR = '#8B7355';

/** Shared visual+audio for a chain-pull (SPD effects.Chains): a rattling
 * chain-colored line between the puller and the pulled character. Used by
 * both the EtherealChains artifact (CHAINS_PULL) and Guard's ability
 * (GUARD_CHAIN_PULL). */
export function playChainPull(
  lightningRef: Ref<unknown[]> | undefined,
  fromX: number, fromY: number, toX: number, toY: number,
): void {
  AudioManager.play('CHAINS');
  if (lightningRef) {
    spawnLightning(
      lightningRef,
      fromX * TILE_SIZE + TILE_SIZE / 2, fromY * TILE_SIZE + TILE_SIZE / 2,
      toX * TILE_SIZE + TILE_SIZE / 2, toY * TILE_SIZE + TILE_SIZE / 2,
      CHAIN_COLOR,
    );
  }
}
