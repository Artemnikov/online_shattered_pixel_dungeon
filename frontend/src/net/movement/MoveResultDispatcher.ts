import type {
  RenderPlayer,
  MoveResult,
  BlockingEntity,
  BumpAction,
  Ref,
  AnimState,
} from '../types';
import { primaryBlocker } from '../movementPredictor';

function sendMoveStep(
  socket: WebSocket | null | undefined,
  seq: number | undefined,
  dx: number,
  dy: number,
  replaces?: number,
): void {
  if (seq !== undefined && socket?.readyState === WebSocket.OPEN) {
    const payload: { type: string; seq: number; dx: number; dy: number; replaces?: number } = {
      type: 'MOVE_STEP',
      seq,
      dx,
      dy,
    };
    if (replaces !== undefined) payload.replaces = replaces;
    socket.send(JSON.stringify(payload));
  }
}

export interface BumpActionContext {
  me: RenderPlayer | null | undefined;
  playerAnimRef?: Ref<Record<string, AnimState>>;
  onOpenAlchemy?: () => void;
  onMeleeAttack?: () => void;
  socket?: WebSocket | null;
  seq?: number;
  dx: number;
  dy: number;
}

export interface IBumpActionStrategy {
  readonly action: BumpAction;
  execute(blocker: BlockingEntity, ctx: BumpActionContext): void;
}

export class MeleeAttackBumpStrategy implements IBumpActionStrategy {
  public readonly action: BumpAction = 'melee-attack';

  public execute(_blocker: BlockingEntity, ctx: BumpActionContext): void {
    ctx.onMeleeAttack?.();
    sendMoveStep(ctx.socket, ctx.seq, ctx.dx, ctx.dy);
  }
}

export class OpenAlchemyBumpStrategy implements IBumpActionStrategy {
  public readonly action: BumpAction = 'open-alchemy';

  public execute(_blocker: BlockingEntity, ctx: BumpActionContext): void {
    ctx.onOpenAlchemy?.();
  }
}

export class OpenChestBumpStrategy implements IBumpActionStrategy {
  public readonly action: BumpAction = 'open-chest';

  public execute(_blocker: BlockingEntity, ctx: BumpActionContext): void {
    sendMoveStep(ctx.socket, ctx.seq, ctx.dx, ctx.dy);
  }
}

export class NpcInteractBumpStrategy implements IBumpActionStrategy {
  public readonly action: BumpAction = 'npc-interact';

  public execute(_blocker: BlockingEntity, ctx: BumpActionContext): void {
    sendMoveStep(ctx.socket, ctx.seq, ctx.dx, ctx.dy);
  }
}

export class ChasmJumpBumpStrategy implements IBumpActionStrategy {
  public readonly action: BumpAction = 'chasm-jump';

  public execute(_blocker: BlockingEntity, ctx: BumpActionContext): void {
    sendMoveStep(ctx.socket, ctx.seq, ctx.dx, ctx.dy);
  }
}

export class UnlockDoorBumpStrategy implements IBumpActionStrategy {
  public readonly action: BumpAction = 'unlock-door';

  public execute(_blocker: BlockingEntity, ctx: BumpActionContext): void {
    sendMoveStep(ctx.socket, ctx.seq, ctx.dx, ctx.dy);
  }
}

export class PassiveBumpStrategy implements IBumpActionStrategy {
  public readonly action: BumpAction;

  constructor(action: BumpAction = 'none') {
    this.action = action;
  }

  public execute(_blocker: BlockingEntity, _ctx: BumpActionContext): void {}
}

export class BumpStrategyRegistry {
  private strategies = new Map<BumpAction, IBumpActionStrategy>();

  constructor() {
    this.register(new MeleeAttackBumpStrategy());
    this.register(new OpenAlchemyBumpStrategy());
    this.register(new OpenChestBumpStrategy());
    this.register(new NpcInteractBumpStrategy());
    this.register(new ChasmJumpBumpStrategy());
    this.register(new UnlockDoorBumpStrategy());
    this.register(new PassiveBumpStrategy('face-only'));
    this.register(new PassiveBumpStrategy('none'));
  }

  public register(strategy: IBumpActionStrategy): void {
    this.strategies.set(strategy.action, strategy);
  }

  public execute(blocker: BlockingEntity, ctx: BumpActionContext): void {
    const strategy = this.strategies.get(blocker.action) ?? this.strategies.get('none');
    strategy?.execute(blocker, ctx);
  }
}

export interface MoveDispatchContext {
  myPlayer: RenderPlayer | null;
  playerAnimRef?: Ref<Record<string, AnimState>>;
  onOpenAlchemyRef?: { current?: () => void };
  onMeleeAttack?: () => void;
  socket?: WebSocket | null;
  dx: number;
  dy: number;
}

export interface IMoveResultHandler {
  canHandle(result: MoveResult & { seq?: number; replacedSeq?: number }): boolean;
  handle(
    result: MoveResult & { seq?: number; replacedSeq?: number },
    ctx: MoveDispatchContext,
  ): void;
}

export class MovedResultHandler implements IMoveResultHandler {
  public canHandle(result: MoveResult): boolean {
    return result.kind === 'moved';
  }

  public handle(
    result: MoveResult & { seq?: number; replacedSeq?: number },
    ctx: MoveDispatchContext,
  ): void {
    sendMoveStep(ctx.socket, result.seq, ctx.dx, ctx.dy, result.replacedSeq);
  }
}

export class BumpedResultHandler implements IMoveResultHandler {
  private bumpRegistry: BumpStrategyRegistry;

  constructor(bumpRegistry: BumpStrategyRegistry = new BumpStrategyRegistry()) {
    this.bumpRegistry = bumpRegistry;
  }

  public canHandle(result: MoveResult): boolean {
    return result.kind === 'bumped';
  }

  public handle(
    result: MoveResult & { seq?: number; replacedSeq?: number },
    ctx: MoveDispatchContext,
  ): void {
    if (result.kind !== 'bumped') return;
    const primary = primaryBlocker(result.blockers);
    if (!primary) return;

    this.bumpRegistry.execute(primary, {
      me: ctx.myPlayer,
      playerAnimRef: ctx.playerAnimRef,
      onOpenAlchemy: () => ctx.onOpenAlchemyRef?.current?.(),
      onMeleeAttack: ctx.onMeleeAttack,
      socket: ctx.socket,
      seq: result.seq,
      dx: ctx.dx,
      dy: ctx.dy,
    });
  }
}

export class BusyResultHandler implements IMoveResultHandler {
  public canHandle(result: MoveResult): boolean {
    return result.kind === 'busy';
  }

  public handle(
    _result: MoveResult & { seq?: number; replacedSeq?: number },
    _ctx: MoveDispatchContext,
  ): void {}
}

export class MoveResultDispatcher {
  private handlers: IMoveResultHandler[];

  constructor(handlers?: IMoveResultHandler[]) {
    this.handlers = handlers ?? [
      new MovedResultHandler(),
      new BumpedResultHandler(),
      new BusyResultHandler(),
    ];
  }

  public register(handler: IMoveResultHandler, atBeginning = false): void {
    if (atBeginning) {
      this.handlers.unshift(handler);
    } else {
      this.handlers.push(handler);
    }
  }

  public dispatch(
    result: MoveResult & { seq?: number; replacedSeq?: number },
    ctx: MoveDispatchContext,
  ): void {
    for (const handler of this.handlers) {
      if (handler.canHandle(result)) {
        handler.handle(result, ctx);
        return;
      }
    }
  }
}

export const defaultMoveResultDispatcher = new MoveResultDispatcher();
