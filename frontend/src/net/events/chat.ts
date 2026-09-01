import { TILE_SIZE } from '../../constants';
import { spawnFloatingText } from '../../rendering/draw/floatingText';
import type { GameEvent } from '../../types/contract';
import type { HandlerCtx } from '../types';

const CHAT_BUBBLE_COLORS = { global: '#7fbfff', direct: '#7fff7f' };
const BUBBLE_MAX_CHARS = 48;

export function handleChatEvents(event: GameEvent, ctx: HandlerCtx): boolean {
  if (event.type !== 'CHAT') return false;
  const { player, name, channel, text } = event.data;
  const self = player === ctx.myPlayerIdRef.current;
  window.dispatchEvent(new CustomEvent('chat-message', { detail: { channel, name, text, self } }));

  const speaker = ctx.entitiesRef?.current?.players?.[player];
  if (speaker && ctx.floatingTextRef) {
    const visible = ctx.visionRef?.current?.visible?.has(
      `${Math.round(speaker.renderPos.x)},${Math.round(speaker.renderPos.y)}`,
    );
    if (self || visible) {
      const display = text.length > BUBBLE_MAX_CHARS ? `${text.slice(0, BUBBLE_MAX_CHARS)}…` : text;
      if (display) {
        spawnFloatingText(
          ctx.floatingTextRef,
          speaker.renderPos.x * TILE_SIZE + TILE_SIZE / 2,
          speaker.renderPos.y * TILE_SIZE - 2,
          display,
          CHAT_BUBBLE_COLORS[channel] || '#ffffff',
          -1,
          player,
          { fontSize: 11, lineWidth: 3, life: 2.0 },
        );
      }
    }
  }
  return true;
}
