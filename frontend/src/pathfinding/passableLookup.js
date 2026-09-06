import { getTileDescriptor } from '../constants';

export const CHASM_TILE = 33;

export function isPassable(tileId) {
  return getTileDescriptor(tileId).passable === true;
}
