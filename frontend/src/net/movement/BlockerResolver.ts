import type {
  RenderPlayer,
  RenderMob,
  EntitiesState,
  SerializedItem,
  BlockingEntity,
  MoveResult,
  BumpAction,
  TrapInfo,
} from '../types';
import { isPassable } from '../../pathfinding/passableLookup.js';
import { BACKEND_TILE } from '../../rendering/sewers/constants.js';

const MERCHANT_NAMES = new Set(['Shopkeeper']);

const BUMP_PRECEDENCE: Record<BumpAction, number> = {
  'melee-attack': 6,
  'npc-interact': 5,
  'open-chest': 4,
  'open-alchemy': 3,
  'face-only': 2,
  'none': 1,
};

export class BlockerResolver {
  public livingBlocker(m: RenderMob, playerId: string): BlockingEntity | null {
    if (m.is_alive === false) return null;
    if (m.type === 'ghost_hero' || m.type === 'mirror_image') {
      if (m.faction === 'player' && m.owner_id === playerId) return null;
      return { kind: 'ally', id: m.id, name: m.name, action: 'face-only' };
    }
    if (m.type === 'npc') {
      return m.name && MERCHANT_NAMES.has(m.name)
        ? { kind: 'merchant', id: m.id, name: m.name, action: 'npc-interact' }
        : { kind: 'quest-npc', id: m.id, name: m.name, action: 'npc-interact' };
    }
    return { kind: 'mob', id: m.id, name: m.name, action: 'melee-attack' };
  }

  public collectBlockers(
    x: number,
    y: number,
    playerId: string,
    grid: number[][],
    entities: EntitiesState,
    traps?: TrapInfo[],
  ): BlockingEntity[] {
    const blockers: BlockingEntity[] = [];
    const row = grid[y];
    const tile = row?.[x];

    if (tile === undefined) {
      blockers.push({ kind: 'wall', tile: undefined, action: 'none' });
    } else if (tile === BACKEND_TILE.ALCHEMY.id) {
      blockers.push({ kind: 'alchemy-table', action: 'open-alchemy' });
    } else if (!isPassable(tile)) {
      blockers.push({ kind: 'wall', tile, action: 'none' });
    }

    for (const it of entities.items || []) {
      const item = it as SerializedItem & { type?: string; chest_type?: string; opened?: boolean };
      const p = item.pos;
      if (p && Math.round(p.x) === x && Math.round(p.y) === y) {
        blockers.push(
          item.type === 'chest'
            ? { kind: 'chest', id: item.id, chestType: item.chest_type, opened: item.opened, action: 'open-chest' }
            : { kind: 'item', id: item.id, action: 'none' },
        );
      }
    }

    for (const m of Object.values(entities.mobs)) {
      const mx = m.targetPos?.x ?? m.pos.x;
      const my = m.targetPos?.y ?? m.pos.y;
      if (Math.round(mx) === x && Math.round(my) === y) {
        const blocker = this.livingBlocker(m, playerId);
        if (blocker) blockers.push(blocker);
      }
    }

    for (const p of Object.values(entities.players)) {
      if (p.id === playerId || p.is_downed) continue;
      const px = p.targetPos?.x ?? p.pos.x;
      const py = p.targetPos?.y ?? p.pos.y;
      if (Math.round(px) === x && Math.round(py) === y) {
        blockers.push({ kind: 'player', id: p.id, action: 'face-only' });
      }
    }

    if (traps) {
      for (const t of traps) {
        if (t.x === x && t.y === y) blockers.push({ kind: 'trap', trapType: t.trap_type, action: 'none' });
      }
    }

    return blockers;
  }

  public primaryBlocker(blockers: BlockingEntity[]): BlockingEntity | null {
    let best: BlockingEntity | null = null;
    for (const b of blockers) {
      if (!best || BUMP_PRECEDENCE[b.action] > BUMP_PRECEDENCE[best.action]) best = b;
    }
    return best;
  }

  public isBump(blockers: BlockingEntity[]): boolean {
    return blockers.some(b =>
      b.kind === 'wall'
      || b.kind === 'alchemy-table'
      || b.kind === 'chest'
      || b.kind === 'mob'
      || b.kind === 'merchant'
      || b.kind === 'quest-npc'
      || b.kind === 'player'
      || b.kind === 'ally'
    );
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
    traps?: TrapInfo[],
  ): MoveResult | null {
    const blockers = this.collectBlockers(newX, newY, playerId, grid, entities, traps);
    if (!this.isBump(blockers)) return null;
    this.faceLiving(player, newX, newY, blockers);
    return { kind: 'bumped', x: newX, y: newY, blockers };
  }
}
