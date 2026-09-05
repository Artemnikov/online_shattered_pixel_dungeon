import type { StateUpdateMessage } from '../../types/contract';
import type { IStateSynchronizer, StateSyncContext } from './IStateSynchronizer';

export class VisionSynchronizer implements IStateSynchronizer {
  public sync(data: StateUpdateMessage, ctx: StateSyncContext): void {
    const myPlayer = ctx.entities.getMyPlayer();
    const isAdmin = Boolean(myPlayer?.is_admin);
    ctx.world.updateVision(data.visible_tiles, data.mapped_tiles, isAdmin);
  }
}
