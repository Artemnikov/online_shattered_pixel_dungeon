import type { StateUpdateMessage } from '../../types/contract';
import type { IStateSynchronizer, StateSyncContext } from './IStateSynchronizer';

export class EnvironmentSynchronizer implements IStateSynchronizer {
  public sync(data: StateUpdateMessage, ctx: StateSyncContext): void {
    if (typeof data.depth === 'number') {
      ctx.world.setDepth(data.depth);
    }
    if (typeof data.gold === 'number') {
      ctx.heroState.syncGold(data.gold);
    }
    if (typeof data.energy === 'number') {
      ctx.heroState.syncEnergy(data.energy);
    }

    ctx.world.updateOpenDoors(data.open_doors);
    ctx.heroState.syncBossInfo(data.mobs || []);
    ctx.heroState.syncBossLurking(data.mobs || []);
  }
}
