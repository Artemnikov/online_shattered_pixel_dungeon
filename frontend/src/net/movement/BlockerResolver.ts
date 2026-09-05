import type {
  RenderPlayer,
  RenderMob,
  EntitiesState,
  SerializedItem,
  BlockingEntity,
  MoveResult,
  BumpAction,
} from '../types';
import { getTileDescriptor } from '../../constants.js';

const BUMP_PRECEDENCE: Record<BumpAction, number> = {
  'melee-attack': 8,
  'npc-interact': 7,
  'open-chest': 6,
  'unlock-door': 5,
  'open-alchemy': 4,
  'chasm-jump': 3,
  'face-only': 2,
  'none': 1,
};

const BUMP_BLOCKER_KINDS = new Set([
  'wall',
  'door',
  'chasm',
  'alchemy-table',
  'chest',
  'mob',
  'merchant',
  'quest-npc',
  'player',
  'ally',
]);

const MERCHANT_NAMES = new Set(['Shopkeeper']);

export class BlockerResolver {
  private tileBlocker(tile: number | undefined): BlockingEntity | null {
    return getTileDescriptor(tile).onInteract(tile);
  }

  private evaluateMob(mob: RenderMob, playerId: string): BlockingEntity | null {
    if (mob.is_alive === false) return null;

    if (
      (mob.type === 'ghost_hero' || mob.type === 'mirror_image') &&
      mob.faction === 'player' &&
      mob.owner_id === playerId
    ) return null;

    if (mob.type === 'ghost_hero' || mob.type === 'mirror_image') {
      return { kind: 'ally', id: mob.id, name: mob.name, action: 'face-only' };
    }

    if (mob.type === 'npc' && mob.name && MERCHANT_NAMES.has(mob.name)) {
      return { kind: 'merchant', id: mob.id, name: mob.name, action: 'npc-interact' };
    }

    if (mob.type === 'npc') {
      return { kind: 'quest-npc', id: mob.id, name: mob.name, action: 'npc-interact' };
    }

    return { kind: 'mob', id: mob.id, name: mob.name, action: 'melee-attack' };
  }

  private evaluateItem(
    item: SerializedItem & { type?: string; chest_type?: string; opened?: boolean },
  ): BlockingEntity {
    if (item.type === 'chest') {
      return {
        kind: 'chest',
        id: item.id,
        chestType: item.chest_type,
        opened: item.opened,
        action: 'open-chest',
      };
    }
    return { kind: 'item', id: item.id, action: 'none' };
  }

  private evaluatePlayer(
    player: RenderPlayer,
    myPlayerId: string,
  ): BlockingEntity | null {
    if (player.id === myPlayerId || player.is_downed) return null;
    return { kind: 'player', id: player.id, action: 'face-only' };
  }

  public primaryBlocker(blockers: BlockingEntity[]): BlockingEntity | null {
    let best: BlockingEntity | null = null;
    for (const b of blockers) {
      if (!best || BUMP_PRECEDENCE[b.action] > BUMP_PRECEDENCE[best.action]) best = b;
    }
    return best;
  }

  public isBump(blockers: BlockingEntity[]): boolean {
    return blockers.some(b => BUMP_BLOCKER_KINDS.has(b.kind));
  }

  public faceLiving(player: RenderPlayer, tx: number, ty: number, blockers: BlockingEntity[]): void {
    const primary = this.primaryBlocker(blockers);
    if (!primary || primary.action === 'none') return;
    const dx = tx - Math.round(player.renderPos.x);
    const dy = ty - Math.round(player.renderPos.y);
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) { player.facing = 'RIGHT'; player.flipX = false; }
      else if (dx < 0) { player.facing = 'LEFT'; player.flipX = true; }
    } else {
      if (dy > 0) player.facing = 'DOWN';
      else if (dy < 0) player.facing = 'UP';
    }
  }

  public bumpedOrNull(
    player: RenderPlayer,
    newX: number,
    newY: number,
    playerId: string,
    grid: number[][],
    entities: EntitiesState,
  ): MoveResult | null {
    const blockers: BlockingEntity[] = [];
    const row = grid[newY];
    const tile = row?.[newX];

    const tileB = this.tileBlocker(tile);
    if (tileB) blockers.push(tileB);

    const trap = entities.traps?.find(t => t.x === newX && t.y === newY);
    if (trap) blockers.push({ kind: 'trap', trapType: trap.trap_type, action: 'none' });

    for (const it of entities.items || []) {
      const p = it.pos;
      if (p && Math.round(p.x) === newX && Math.round(p.y) === newY) {
        blockers.push(this.evaluateItem(it));
      }
    }

    for (const m of Object.values(entities.mobs)) {
      const mx = m.targetPos?.x ?? m.pos.x;
      const my = m.targetPos?.y ?? m.pos.y;
      if (Math.round(mx) === newX && Math.round(my) === newY) {
        const b = this.evaluateMob(m, playerId);
        if (b) blockers.push(b);
      }
    }

    for (const p of Object.values(entities.players)) {
      const px = p.targetPos?.x ?? p.pos.x;
      const py = p.targetPos?.y ?? p.pos.y;
      if (Math.round(px) === newX && Math.round(py) === newY) {
        const b = this.evaluatePlayer(p, playerId);
        if (b) blockers.push(b);
      }
    }

    if (!this.isBump(blockers)) return null;
    this.faceLiving(player, newX, newY, blockers);
    return { kind: 'bumped', x: newX, y: newY, blockers };
  }
}
