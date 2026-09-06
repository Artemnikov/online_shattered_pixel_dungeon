import type { GameEvent } from '../../types/contract';
import type { WorldManager } from '../services/WorldManager';
import type { EntityManager } from '../services/EntityManager';
import type { VisualEffectsManager } from '../services/VisualEffectsManager';
import type { GameCallbacks } from '../services/GameCallbacks';

export interface AudioService {
  play(sound: string, rate?: number, timeout?: number): void;
  playStep?(tile: number): void;
}

export interface GameEventContext {
  myPlayerId: string | null;
  world: WorldManager;
  entities: EntityManager;
  effects: VisualEffectsManager;
  ui: GameCallbacks;
  audio: AudioService;
}

export interface IGameEventHandler<T extends GameEvent = GameEvent> {
  readonly eventType: T['type'];
  handle(event: T, ctx: GameEventContext): boolean | void;
}
