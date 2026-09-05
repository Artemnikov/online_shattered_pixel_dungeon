import type { StateUpdateMessage } from '../../types/contract';
import type { IStateSynchronizer, StateSyncContext } from './IStateSynchronizer';

export class SelfPlayerSynchronizer implements IStateSynchronizer {
  public sync(data: StateUpdateMessage, ctx: StateSyncContext): void {
    const myId = ctx.entities.getMyPlayerId();
    if (data.self_player && data.self_player.id === myId) {
      const sp = data.self_player;
      if (ctx.entities.wasDownedRef) {
        ctx.entities.wasDownedRef.current = sp.is_downed;
      }
      ctx.heroState.syncSelfPlayer(sp, data.has_amulet, myId);
    }
  }
}
