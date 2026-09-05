import { TILE_SIZE } from '../../constants';
import type { GameEvent } from '../../types/contract';
import type { GameEventContext, IGameEventHandler } from './IGameEventHandler';

export function createAlchemyEventHandlers(): IGameEventHandler[] {
  return [
    {
      eventType: 'PICKUP_ENERGY',
      handle(event: Extract<GameEvent, { type: 'PICKUP_ENERGY' }>, ctx: GameEventContext) {
        const pid = event.data.player;
        if (pid === ctx.myPlayerId) {
          ctx.audio.play('PICKUP');
          const me = ctx.entities.getPlayer(pid);
          if (me) {
            const px = me.renderPos.x * TILE_SIZE + TILE_SIZE / 2;
            const py = me.renderPos.y * TILE_SIZE;
            ctx.effects.spawnFloatingText(px, py, `+${event.data.amount}`, '#44ccff');
          }
        }
        return true;
      },
    },
    {
      eventType: 'ALCHEMY_PREVIEW_RESULT',
      handle(event: Extract<GameEvent, { type: 'ALCHEMY_PREVIEW_RESULT' }>, ctx: GameEventContext) {
        if (event.data.player === ctx.myPlayerId) {
          ctx.ui.alchemyPreviewResult(event.data);
        }
        return true;
      },
    },
    {
      eventType: 'ALCHEMY_BREWED',
      handle(event: Extract<GameEvent, { type: 'ALCHEMY_BREWED' }>, ctx: GameEventContext) {
        if (event.data.player === ctx.myPlayerId) {
          ctx.audio.play('PUFF');
          ctx.ui.alchemyBrewed(event.data);
        }
        return true;
      },
    },
    {
      eventType: 'ALCHEMY_ENERGIZED',
      handle(event: Extract<GameEvent, { type: 'ALCHEMY_ENERGIZED' }>, ctx: GameEventContext) {
        if (event.data.player === ctx.myPlayerId) {
          ctx.audio.play('LIGHTNING');
          ctx.ui.alchemyEnergized(event.data);
        }
        return true;
      },
    },
    {
      eventType: 'TRINKET_CHOICE',
      handle(event: Extract<GameEvent, { type: 'TRINKET_CHOICE' }>, ctx: GameEventContext) {
        if (event.data.player === ctx.myPlayerId) {
          ctx.ui.trinketChoice(event.data);
        }
        return true;
      },
    },
    {
      eventType: 'TOOLKIT_BREW',
      handle(event: Extract<GameEvent, { type: 'TOOLKIT_BREW' }>, ctx: GameEventContext) {
        if (event.data.player === ctx.myPlayerId) {
          ctx.ui.openAlchemy();
        }
        return true;
      },
    },
    {
      eventType: 'TOOLKIT_ENERGIZE_PROMPT',
      handle(event: Extract<GameEvent, { type: 'TOOLKIT_ENERGIZE_PROMPT' }>, ctx: GameEventContext) {
        if (event.data.player === ctx.myPlayerId) {
          ctx.ui.toolkitEnergizePrompt(event.data);
        }
        return true;
      },
    },
    {
      eventType: 'TOOLKIT_ENERGIZED',
      handle(event: Extract<GameEvent, { type: 'TOOLKIT_ENERGIZED' }>, ctx: GameEventContext) {
        if (event.data.player === ctx.myPlayerId) {
          ctx.audio.play('DRINK');
          setTimeout(() => ctx.audio.play('PUFF'), 500);
        }
        return true;
      },
    },
  ];
}
