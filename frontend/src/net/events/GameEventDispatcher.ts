import type { GameEvent } from '../../types/contract';
import type { IGameEventHandler, GameEventContext } from './IGameEventHandler';

export class GameEventDispatcher {
  private handlers = new Map<string, IGameEventHandler[]>();

  public register<T extends GameEvent>(handler: IGameEventHandler<T>): this {
    const list = this.handlers.get(handler.eventType) ?? [];
    list.push(handler as IGameEventHandler);
    this.handlers.set(handler.eventType, list);
    return this;
  }

  public registerAll(handlers: IGameEventHandler[]): this {
    for (const h of handlers) {
      this.register(h);
    }
    return this;
  }

  public dispatch(event: GameEvent, ctx: GameEventContext): boolean {
    const list = this.handlers.get(event.type);
    if (!list || list.length === 0) return false;
    let handled = false;
    for (const handler of list) {
      const res = handler.handle(event, ctx);
      if (res !== false) handled = true;
    }
    return handled;
  }
}
