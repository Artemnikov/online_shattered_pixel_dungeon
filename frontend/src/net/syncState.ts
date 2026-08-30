import AudioManager from '../audio/AudioManager';
import { INVIS_ALPHA, MOVE_DURATION } from '../constants';
import { isDoorTile, isWallTile } from '../rendering/sewers/constants';
import type { StateUpdateMessage, SerializedItem } from '../types/contract';
import type { SyncCtx, RenderPlayer, RenderMob } from './types';
import * as movementPredictor from './movementPredictor';

// 8-neighbour offsets used to light the wall shell around visible open cells.
const WALL_SHELL_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

interface DropBounce {
  startTime: number;
  startY: number;
}

type Fadeable = {
  invisible?: number;
  is_afk?: boolean;
  fadeAlpha?: number;
  fadeStartAlpha?: number;
  fadeTargetAlpha?: number;
  fadeStartTime?: number | null;
  faded?: boolean;
};

// Distance-aware walk duration: single-tile steps keep MOVE_DURATION; larger
// server-driven repositions (lag catch-up, knockback) glide at walking speed
// instead of lunging, capped so genuine teleports don't crawl across the map.
function glideDuration(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.min(4, Math.max(1, Math.round(Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY))))) * MOVE_DURATION;
}

// `newInvis` drives the real invisibility stat (also read for UI elsewhere);
// `afk` is an independent ghost-mode flag (disconnected player) -- either one
// fades the sprite, tracked via a separate `faded` flag so toggling one while
// the other is already active doesn't fight over fadeStartAlpha/fadeTargetAlpha.
function applyInvisFade(entity: Fadeable, newInvis: number, afk = false): void {
  const prev = entity.faded ?? false;
  const next = newInvis > 0 || afk;
  if (!prev && next) {
    entity.fadeStartAlpha = entity.fadeAlpha ?? 1;
    entity.fadeTargetAlpha = INVIS_ALPHA;
    entity.fadeStartTime = performance.now();
  } else if (prev && !next) {
    entity.fadeStartAlpha = entity.fadeAlpha ?? INVIS_ALPHA;
    entity.fadeTargetAlpha = 1;
    entity.fadeStartTime = performance.now();
  }
  entity.invisible = newInvis;
  entity.is_afk = afk;
  entity.faded = next;
}

export function syncState(data: StateUpdateMessage, ctx: SyncCtx): void {
  const {
    myPlayerIdRef, gridRef, entitiesRef, visionRef, openDoorsRef, trapsRef,
    dyingMobsRef, wasDownedRef,
    setInventory, setEquippedItems, setMyStats, setBossInfo, setBelongings, setQuickslot,
    setGold, setEnergy, setHasAmulet, setBossLurking,
  } = ctx;

  // --- Players ---
  if (data.players && data.players.length > 0) {
    const currentServerPlayerIds = new Set(data.players.map(p => p.id));
    Object.keys(entitiesRef.current.players).forEach(id => {
      if (!currentServerPlayerIds.has(id)) delete entitiesRef.current.players[id];
    });
  }

  // Self player detailed update (sent when player state changes / on init)
  if (data.self_player && data.self_player.id === myPlayerIdRef.current) {
    const sp = data.self_player;
    setInventory(sp.inventory || []);
    setEquippedItems({ weapon: sp.equipped_weapon, wearable: sp.equipped_wearable });
    if (setBelongings) setBelongings(sp.belongings || null);
    if (setQuickslot) setQuickslot(sp.quickslot || null);

    if (typeof sp.gold === 'number' && setGold) setGold(sp.gold);
    if (typeof sp.energy === 'number' && setEnergy) setEnergy(sp.energy);
    if (setHasAmulet) {
      const holdsAmulet = Boolean(data.has_amulet && data.has_amulet.player_id === myPlayerIdRef.current)
        || (sp.belongings?.backpack?.items || []).some((i: { kind?: string }) => i.kind === 'Amulet');
      setHasAmulet(holdsAmulet);
    }

    wasDownedRef.current = sp.is_downed;
    setMyStats({
      hp: sp.hp,
      maxHp: sp.max_hp,
      name: sp.name,
      isDowned: sp.is_downed,
      isAdmin: sp.is_admin || false,
      isRegen: (sp.heal_left || 0) > 0,
      exp: sp.experience || 0,
      level: sp.level || 1,
      maxExp: 5 + (sp.level || 1) * 5,
      effects: sp.active_effects || [],
      classType: sp.class_type || 'warrior',
      armorTier: (() => { const a = sp.belongings?.armor; return a && 'tier' in a ? a.tier ?? 0 : 0; })(),
      shield: (sp.shields || []).reduce((sum: number, s: { amount?: number }) => sum + (s.amount || 0), 0),
      strength: sp.strength ?? 10,
      subclass: sp.subclass_info?.subclass || null,
      armorAbility: sp.armor_ability || null,
      armorCharge: sp.armor_charge || 0,
      berserkPower: sp.berserk_power || 0,
      invisible: sp.invisible || 0,
      prepSeconds: sp.prep_seconds || 0,
      comboCount: sp.combo_count || 0,
      pos: sp.pos ? { x: sp.pos.x, y: sp.pos.y } : null,
      talentLevels: sp.subclass_info?.talent_info?.talents || {},
      talentPoints: sp.subclass_info?.talent_points || {},
      bonusTalentPoints: sp.subclass_info?.bonus_talent_points || {},
      keys: sp.keys || [],
      guidePages: sp.guide_pages || [],
      respawnsUsed: sp.respawns_used ?? 0,
    });
  }

  (data.players || []).forEach(p => {
    if (p.id === myPlayerIdRef.current && !data.self_player) {
      wasDownedRef.current = p.is_downed;
      setMyStats(prev => ({
        ...prev,
        hp: p.hp,
        maxHp: p.max_hp,
        level: p.level || prev.level,
        maxExp: 5 + (p.level || prev.level) * 5,
        isDowned: p.is_downed,
        isRegen: (p.heal_left || 0) > 0,
        shield: (p.shields || []).reduce((sum: number, s: { amount?: number }) => sum + (s.amount || 0), 0),
        pos: p.pos ? { x: p.pos.x, y: p.pos.y } : prev.pos,
      }));
    }

    if (!entitiesRef.current.players[p.id]) {
      entitiesRef.current.players[p.id] = {
        ...p,
        renderPos: { x: p.pos.x, y: p.pos.y },
        animStartPos: { x: p.pos.x, y: p.pos.y },
        animStartTime: null,
        facing: 'RIGHT',
        flipX: false,
        deathStart: p.is_downed ? performance.now() : null,
        fadeAlpha: (p.invisible || 0) > 0 || p.is_afk ? INVIS_ALPHA : 1,
        faded: (p.invisible || 0) > 0 || !!p.is_afk,
        fadeStartTime: null,
      } as RenderPlayer;
    } else {
      const existing = entitiesRef.current.players[p.id];
      const isLocalPlayer = p.id === myPlayerIdRef.current;
      const hasPendingPrediction = isLocalPlayer && movementPredictor.isPending();
      const moved = !existing.targetPos
        || existing.targetPos.x !== p.pos.x || existing.targetPos.y !== p.pos.y;
      if (moved && !hasPendingPrediction) {
        const currentTarget = existing.targetPos || existing.renderPos;
        const dx = p.pos.x - currentTarget.x;
        const dy = p.pos.y - currentTarget.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
          if (dx > 0) { existing.facing = 'RIGHT'; existing.flipX = false; }
          else if (dx < 0) { existing.facing = 'LEFT'; existing.flipX = true; }
        } else {
          if (dy > 0) existing.facing = 'DOWN';
          else if (dy < 0) existing.facing = 'UP';
        }
        existing.animStartPos = { x: existing.renderPos.x, y: existing.renderPos.y };
        existing.animStartTime = performance.now();
        existing.targetPos = p.pos;
        existing.moveDuration = glideDuration(existing.renderPos.x, existing.renderPos.y, p.pos.x, p.pos.y);
      }
      existing.name = p.name;
      existing.hp = p.hp;
      existing.max_hp = p.max_hp;
      existing.shields = p.shields;
      existing.equipped_wearable = p.equipped_wearable;
      if (isLocalPlayer) {
        // self_player ships the full equipped_weapon config every state update
        // (get_state) — it only changes when a weapon is equipped/unequipped.
        // Persist it on the entity until the next equip instead of the
        // {kind}-only stub from the players list (whose name/attack_cooldown/
        // hit_sound/hit_sound_pitch drive local melee swing sound + cadence).
        // Other players keep the light stub — their swings are already heard
        // via the server's PLAY_SOUND broadcasts.
        if (data.self_player && 'equipped_weapon' in data.self_player) {
          existing.equipped_weapon = data.self_player.equipped_weapon; // null ⇒ unarmed
        }
      } else {
        existing.equipped_weapon = p.equipped_weapon;
      }
      applyInvisFade(existing, p.invisible || 0, !!p.is_afk);
      if (p.is_downed && !existing.is_downed) {
        existing.deathStart = performance.now();
        if (p.id === myPlayerIdRef.current) AudioManager.play('DEATH');
      }
      existing.is_downed = p.is_downed;
      existing.heal_left = p.heal_left;
      existing.class_type = p.class_type;
      existing.level = p.level;
      existing.strength = p.strength;
    }
  });

  // Reconcile local player's predicted position with server-authoritative state.
  // Must pass the server's pos from this update — passing the client's own
  // targetPos would make every prediction "confirm" against itself.
  const myId = myPlayerIdRef.current;
  if (myId) {
    const myPlayer = entitiesRef.current.players[myId];
    const serverMe = data.players.find(p => p.id === myId);
    if (myPlayer && serverMe?.pos) movementPredictor.reconcile(serverMe.pos, myPlayer);
  }

  // --- Mobs ---
  const currentServerMobIds = new Set(data.mobs.map(m => m.id));

  if (data.events) {
    data.events.forEach(ev => {
      if (ev.type !== 'DEATH') return;
      const id = ev.data.target;
      const mob = entitiesRef.current.mobs[id];
      if (mob && !dyingMobsRef.current[id]) {
        dyingMobsRef.current[id] = { ...mob, renderPos: { ...mob.renderPos }, deathStart: performance.now() };
      }
    });
  }

  Object.keys(entitiesRef.current.mobs).forEach(id => {
    if (!currentServerMobIds.has(id)) delete entitiesRef.current.mobs[id];
  });

  data.mobs.forEach(m => {
    if (!entitiesRef.current.mobs[m.id]) {
      entitiesRef.current.mobs[m.id] = {
        ...m,
        renderPos: { x: m.pos.x, y: m.pos.y },
        animStartPos: { x: m.pos.x, y: m.pos.y },
        animStartTime: null,
        facing: 'RIGHT',
        fadeAlpha: (m.invisible || 0) > 0 ? INVIS_ALPHA : 1,
        fadeStartTime: null,
      } as RenderMob;
    } else {
      const existing = entitiesRef.current.mobs[m.id];
      const moved = !existing.targetPos
        || existing.targetPos.x !== m.pos.x || existing.targetPos.y !== m.pos.y;
      if (moved) {
        const currentTarget = existing.targetPos || existing.renderPos;
        if (m.pos.x > currentTarget.x) existing.facing = 'RIGHT';
        else if (m.pos.x < currentTarget.x) existing.facing = 'LEFT';
        existing.animStartPos = { x: existing.renderPos.x, y: existing.renderPos.y };
        existing.animStartTime = performance.now();
        existing.targetPos = m.pos;
        existing.moveDuration = glideDuration(existing.renderPos.x, existing.renderPos.y, m.pos.x, m.pos.y);
      }
      existing.hp = m.hp;
      existing.ai_state = m.ai_state;
      applyInvisFade(existing, m.invisible || 0);
    }
  });

  if (setBossInfo) {
    const boss = data.mobs.find(m => m.type === 'boss' && m.is_alive !== false);
    setBossInfo(boss ? {
      name: boss.name, hp: boss.hp, maxHp: boss.max_hp,
      shield: (boss.shields || []).reduce((sum, s) => sum + (s.amount || 0), 0),
      effects: boss.buffs || [],
    } : null);
  }

  if (setBossLurking) {
    const isBossLurking = data.mobs.some(m => m.is_alive !== false && (m as { fight_started?: boolean }).fight_started === false);
    setBossLurking(isBossLurking);
  }

  // --- Items with drop bounce animation ---
  // Preserve active dropBounce state from previous items by id, so
  // mid-animation items continue bouncing across state updates.
  if (data.items) {
    const oldItems = entitiesRef.current.items || [];
    const oldDropBounce = new Map<string, DropBounce>();
    for (const item of oldItems) {
      if (!item.id) continue;
      const bounce = (item as SerializedItem & { dropBounce?: DropBounce }).dropBounce;
      if (bounce) oldDropBounce.set(item.id, bounce);
    }
    const oldItemIds = new Set<string>();
    for (const i of oldItems) { if (i.id) oldItemIds.add(i.id); }
    entitiesRef.current.items = data.items.map(newItem => {
      const id = newItem.id;
      if (!id) return newItem;
      const newItemWithBounce = newItem as SerializedItem & { dropBounce?: DropBounce };
      const existing = oldDropBounce.get(id);
      if (existing) {
        newItemWithBounce.dropBounce = existing;
      } else if (!oldItemIds.has(id) && newItem.pos && newItem.just_dropped) {
        // Genuinely fresh chest-open/monster-death drop — start the
        // drop-from-above animation. Items merely re-entering FOV (or seen
        // for the first time as pre-placed loot) don't set just_dropped.
        newItemWithBounce.dropBounce = {
          startTime: performance.now(),
          startY: newItem.pos.y - 1.5,
        };
      }
      return newItem;
    });
  }

  if (data.visible_tiles) {
    const newVisible = new Set(data.visible_tiles.map(t => `${t[0]},${t[1]}`));
    // Reveal the wall shell bounding visible open space. A wall cell only enters
    // a shadowcast FOV if a ray actually reaches it, so wall-tops that border
    // seen floor — the far wall of a room, or the walls framing a hidden/locked
    // door room — would otherwise render as black gaps ("missing top_wall").
    // Lighting the wall neighbours of every visible *open* cell fills those gaps
    // at the same brightness as the floor they bound. (Intentional deviation
    // from SPD, which fogs never-seen walls to solid black.) Door tiles get the
    // same treatment as walls here: a door cell is classified separately
    // (isDoorTile, not isWallTile) but is just as ray-dependent to enter FOV,
    // so a doorway just outside the shadowcast's exact rays was rendering as
    // the same black gap as an un-revealed wall.
    const grid = gridRef.current;
    const isShellTile = (tile: number | undefined) => isWallTile(tile) || isDoorTile(tile);
    for (const t of data.visible_tiles as Array<[number, number]>) {
      const x = t[0], y = t[1];
      if (isShellTile(grid[y]?.[x])) continue; // spread out from open cells only
      for (const [dx, dy] of WALL_SHELL_OFFSETS) {
        const nx = x + dx, ny = y + dy;
        if (isShellTile(grid[ny]?.[nx])) newVisible.add(`${nx},${ny}`);
      }
    }
    visionRef.current.visible = newVisible;
    newVisible.forEach(t => visionRef.current.discovered.add(t));
  }

  if (data.mapped_tiles && data.mapped_tiles.length > 0) {
    data.mapped_tiles.forEach(t => visionRef.current.discovered.add(`${t[0]},${t[1]}`));
  }

  const myPlayer = data.players.find(p => p.id === myPlayerIdRef.current);
  if (myPlayer?.is_admin && gridRef.current.length > 0) {
    const allTiles = new Set<string>();
    for (let y = 0; y < gridRef.current.length; y++) {
      for (let x = 0; x < gridRef.current[0].length; x++) {
        allTiles.add(`${x},${y}`);
      }
    }
    visionRef.current.visible = allTiles;
    allTiles.forEach(t => visionRef.current.discovered.add(t));
  }

  if (data.open_doors) {
    openDoorsRef.current = new Set(data.open_doors.map(d => `${d[0]},${d[1]}`));
  }

  if (data.traps) trapsRef.current = data.traps;
}
