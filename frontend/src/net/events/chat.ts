import { TILE_SIZE } from '../../constants';
import type { GameEvent } from '../../types/contract';
import type { GameEventContext, IGameEventHandler } from './IGameEventHandler';

const CHAT_BUBBLE_COLORS: Record<string, string> = { global: '#7fbfff', direct: '#7fff7f' };
const BUBBLE_MAX_CHARS = 48;

export function createChatEventHandlers(): IGameEventHandler[] {
  return [
    {
      eventType: 'CHAT',
      handle(event: Extract<GameEvent, { type: 'CHAT' }>, ctx: GameEventContext) {
        const { player, name, channel, text } = event.data;
        const self = player === ctx.myPlayerId;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-message', { detail: { channel, name, text, self } }));
        }

        const speaker = ctx.entities.getPlayer(player);
        if (speaker) {
          const visible = ctx.world.isVisible(
            Math.round(speaker.renderPos.x),
            Math.round(speaker.renderPos.y),
          );
          if (self || visible) {
            const display = text.length > BUBBLE_MAX_CHARS ? `${text.slice(0, BUBBLE_MAX_CHARS)}…` : text;
            if (display) {
              ctx.effects.spawnFloatingText(
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
      },
    },
  ];
}
