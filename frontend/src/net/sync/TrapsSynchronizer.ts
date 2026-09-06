import type { StateUpdateMessage } from '../../types/contract';
import type { RenderTrap } from '../types';
import type { IStateSynchronizer, StateSyncContext } from './IStateSynchronizer';

export class TrapsSynchronizer implements IStateSynchronizer {
  public sync(data: StateUpdateMessage, ctx: StateSyncContext): void {
    if (!data.traps) return;

    const prevTrapsMap = new Map<string, RenderTrap>();
    for (const t of ctx.entities.getTraps()) {
      prevTrapsMap.set(`${t.x},${t.y}`, t);
    }

    const now = performance.now();
    const nextTraps: RenderTrap[] = [];

    for (const serverTrap of data.traps) {
      const key = `${serverTrap.x},${serverTrap.y}`;
      const existing = prevTrapsMap.get(key);

      if (existing) {
        existing.trap_type = serverTrap.trap_type;
        nextTraps.push(existing);
      } else {
        nextTraps.push({
          ...serverTrap,
          renderPos: { x: serverTrap.x, y: serverTrap.y },
          revealStartTime: now,
        });
      }
    }

    ctx.entities.setTraps(nextTraps);
  }
}
