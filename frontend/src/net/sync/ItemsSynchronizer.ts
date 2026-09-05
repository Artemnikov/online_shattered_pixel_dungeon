import type { StateUpdateMessage, SerializedItem } from '../../types/contract';
import type { IStateSynchronizer, StateSyncContext } from './IStateSynchronizer';

interface DropBounce {
  startTime: number;
  startY: number;
}

export class ItemsSynchronizer implements IStateSynchronizer {
  public sync(data: StateUpdateMessage, ctx: StateSyncContext): void {
    if (!data.items) return;

    const oldItems = ctx.entities.getItems();
    const oldDropBounce = new Map<string, DropBounce>();
    for (const item of oldItems) {
      if (!item.id) continue;
      const bounce = (item as SerializedItem & { dropBounce?: DropBounce }).dropBounce;
      if (bounce) oldDropBounce.set(item.id, bounce);
    }
    const oldItemIds = new Set<string>();
    for (const i of oldItems) {
      if (i.id) oldItemIds.add(i.id);
    }

    const nextItems = data.items.map(newItem => {
      const id = newItem.id;
      if (!id) return newItem;
      const newItemWithBounce = newItem as SerializedItem & { dropBounce?: DropBounce };
      const existing = oldDropBounce.get(id);
      if (existing) {
        newItemWithBounce.dropBounce = existing;
      } else if (!oldItemIds.has(id) && newItem.pos && newItem.just_dropped) {
        newItemWithBounce.dropBounce = {
          startTime: performance.now(),
          startY: newItem.pos.y - 1.5,
        };
      }
      return newItem;
    });

    ctx.entities.setItems(nextItems);
  }
}
