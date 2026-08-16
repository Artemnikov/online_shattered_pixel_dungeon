# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 ArtemNikov
#
# Adapted from Shattered Pixel Dungeon (C) 2014-2024 Evan Debenham
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
"""Stepping logic for GameInstance (part of MovementCombatMixin).

Held-direction intent, step resolution (doors, chests, wells, chasms, traps,
grass, stairs) and per-step effects like auto-pickup.
"""

import time

from app.engine.dungeon.constants import TileType
from app.engine.entities.base import is_immune
from app.engine.entities.item_union import Chest
from app.engine.entities.items_bombs import Bomb
from app.engine.entities.items_consumable import Amulet, CorpseDust, Dewdrop, EnergyCrystal, Gold, Key, LostBackpack
from app.engine.entities.player import Player
from app.engine.entities.buffs import add_buff, has_buff, is_frozen
from app.engine.game.constants import MAX_FLOOR_ID
from app.engine.game.terrain_effects import press_cell


class MovementMixin:
    def set_move_intent(self, entity_id: str, dx: int, dy: int):
        """Set/clear a player's held keyboard direction. The update tick paces the
        actual stepping at AUTO_MOVE_INTERVAL."""
        player = self.players.get(entity_id)
        if player is None:
            return
        if dx == 0 and dy == 0:
            player.move_intent = None
            return
        was_moving = player.move_intent is not None
        player.move_intent = (dx, dy)
        player.path_queue = []
        # Grant an immediate first step only when starting from rest. Changing
        # direction mid-walk keeps the existing cadence, so rapidly switching keys
        # (e.g. the two keydowns that begin a diagonal) can't burst multiple steps
        # inside one AUTO_MOVE_INTERVAL.
        if not was_moving:
            player.last_auto_move_time = 0.0

    def attack_mob(self, player_id: str, target_id: str) -> None:
        """Click-to-attack (ATTACK): step the player toward a specific mob
        by one tile; a step onto/into an occupied enemy cell resolves as a
        melee attack in move_entity."""
        player = self.players.get(player_id)
        if not player:
            return
        floor = self._get_or_create_floor(player.floor_id)
        mob = floor.mobs.get(target_id)
        if mob and mob.is_alive:
            dx = mob.pos.x - player.pos.x
            dy = mob.pos.y - player.pos.y
            self.move_entity(player_id, dx, dy)

    def move_entity(self, entity_id: str, dx: int, dy: int):
        floor_id, entity = self._get_floor_for_entity(entity_id)
        if entity is None or floor_id is None:
            return

        floor = self._get_or_create_floor(floor_id)

        if isinstance(entity, Player) and time.time() < entity.action_until:
            return

        if isinstance(entity, Player) and entity.is_downed:
            return

        # Stagger blocks all movement and attacks (bump-attacks route through
        # move_entity).  Applied by Wand of Blast Wave wall-slam.
        if has_buff(entity.buffs, "stagger"):
            return

        # SPD Frost roots the character (paralysed++): a frozen player can't move
        # or attack, and a frozen mob can neither step nor strike (mob attacks are
        # move_entity calls into the target's tile, so this gates those too).
        if is_frozen(entity.buffs):
            return

        new_x = entity.pos.x + dx
        new_y = entity.pos.y + dy

        if not (0 <= new_x < floor.width and 0 <= new_y < floor.height):
            return

        # Any movement attempt cancels a stale chasm-fall confirmation prompt
        # (the player did something else instead of confirming).
        if isinstance(entity, Player):
            entity.pending_chasm_fall = None

        # Diagonal moves past a wall corner are allowed, matching SPD's PathFinder
        # (it only checks the destination cell's passability, not the orthogonal cells).

        target_entity = self._entity_at(floor, floor_id, new_x, new_y, entity_id, active_players_only=True)
        if target_entity:
            self._resolve_bump(entity, target_entity, floor, floor_id)
            return

        tile = floor.grid[new_y][new_x]
        if tile == TileType.HERO_LKD_DR and isinstance(entity, Player):
            # SPD Hero.actUnlock (HERO_LKD_DR): a door the hero locked with
            # their SkeletonKey refuses to open by bump while a non-cursed
            # key is equipped; otherwise it opens freely, no key/charge.
            if self._player_has_skeleton_key(entity):
                self.add_event("MESSAGE",
                               {"text": "That door was locked by your skeleton key."},
                               floor_id=floor_id, player_id=entity.id)
                return
            floor.grid[new_y][new_x] = TileType.DOOR
            floor.rebuild_flags()
            self.add_event("MAP_PATCH",
                           {"tiles": [{"x": new_x, "y": new_y, "tile": TileType.DOOR}]},
                           floor_id=floor_id)
            return

        if tile in (TileType.LOCKED_DOOR, TileType.CRYSTAL_DOOR, TileType.LOCKED_EXIT):
            if not isinstance(entity, Player):
                return
            self._try_unlock_locked_door(entity, floor, new_x, new_y)
            return

        if isinstance(entity, Player):
            chest = next((item for item in self._items_at(floor, new_x, new_y) if isinstance(item, Chest)), None)
            if chest is not None:
                self._try_open_chest(entity, floor, floor_id, chest)
                return

        if tile == TileType.WELL:
            if isinstance(entity, Player):
                self._drink_from_well(entity, floor, floor_id, new_x, new_y)
            return

        if tile == TileType.CHASM:
            # Mobs never voluntarily step into a chasm (AI pathing already
            # avoids it via AVOID/PIT — see vision.py); this only guards
            # against an entity somehow ending up adjacent regardless.
            if isinstance(entity, Player) and floor_id < MAX_FLOOR_ID:
                entity.pending_chasm_fall = (new_x, new_y)
                self.add_event("CHASM_PROMPT", {"x": new_x, "y": new_y}, floor_id=floor_id, player_id=entity.id)
            return

        if not floor.flags or not (floor.flags.passable[new_y][new_x] or floor.flags.avoid[new_y][new_x]):
            return

        old_x, old_y = entity.pos.x, entity.pos.y
        entity.move(dx, dy)

        self._ignite_if_on_fire(entity, floor, new_x, new_y)
        self._handle_door_transition(entity, floor, floor_id, old_x, old_y)

        # Position changed: door mutation may have changed flags and FOV.
        self._invalidate_fov_cache()

        # Terrain interaction (trample grass, trigger plants, etc.)
        result = press_cell(floor, (entity.pos.x, entity.pos.y), entity)
        if result["tile_changed"]:
            self.add_event("MAP_PATCH", {"tiles": [{"x": entity.pos.x, "y": entity.pos.y, "tile": floor.grid[entity.pos.y][entity.pos.x]}]}, floor_id=floor_id)
            self.add_event("PLAY_SOUND", {"sound": "STEP_GRASS", "x": entity.pos.x, "y": entity.pos.y}, floor_id=floor_id, source_player_id=entity.id if isinstance(entity, Player) else None)
            # HighGrass.trample()'s CellEmitter.get(pos).burst(LeafParticle.LEVEL_SPECIFIC, 4)
            self.add_event("LEAF_BURST", {"x": entity.pos.x, "y": entity.pos.y}, floor_id=floor_id)
        if result["triggered_plant"]:
            self.add_event("PLAY_SOUND", {"sound": "PLANT_TRIGGER", "x": entity.pos.x, "y": entity.pos.y}, floor_id=floor_id, source_player_id=entity.id if isinstance(entity, Player) else None)

        if isinstance(entity, Player):
            self._player_step_effects(entity, entity_id, floor_id)
            self._auto_pickup_on_step(entity, floor, floor_id)

        self._trigger_trap_if_needed(floor, entity, floor_id)

        if isinstance(entity, Player):
            self._handle_stairs_tile(entity, entity_id, tile, floor, floor_id)

    def _ignite_if_on_fire(self, entity, floor, x: int, y: int) -> None:
        """Fire tiles ignite entities on contact (SPD: Blob checks on movement)."""
        for b in floor.blob_areas.values():
            if b.get("type") == "fire" and (x, y) in b.get("cells", set()):
                if not has_buff(entity.buffs, "burning") and not is_immune(entity, "burning"):
                    add_buff(entity.buffs, "burning", duration=8.0, level=1, stack_mode="extend")

    def _handle_door_transition(self, entity, floor, floor_id: int, old_x: int, old_y: int) -> None:
        """Door enter/leave tile mutation: stepping onto a closed DOOR opens
        it; leaving an open door closes it (if no other entity is on it)."""
        door_changed = False
        door_patches = []
        if floor.grid[entity.pos.y][entity.pos.x] == TileType.DOOR:
            floor.grid[entity.pos.y][entity.pos.x] = TileType.OPEN_DOOR
            door_changed = True
            door_patches.append({"x": entity.pos.x, "y": entity.pos.y, "tile": TileType.OPEN_DOOR})
            if not isinstance(entity, Player):
                # Player door-open sound is inferred client-side from MOVE;
                # mobs never emit MOVE, so broadcast it explicitly here,
                # LOS-filtered by tile position (same as mob HIT_BODY).
                self.add_event("PLAY_SOUND", {"sound": "DOOR_OPEN", "x": entity.pos.x, "y": entity.pos.y}, floor_id=floor_id)
        if floor.grid[old_y][old_x] == TileType.OPEN_DOOR:
            has_entity = any(
                p.pos.x == old_x and p.pos.y == old_y
                for p in self._players_on_floor(floor_id)
            )
            if not has_entity:
                has_entity = any(
                    m.is_alive and m.pos.x == old_x and m.pos.y == old_y
                    for m in floor.mobs.values()
                )
            if not has_entity:
                floor.grid[old_y][old_x] = TileType.DOOR
                door_changed = True
                door_patches.append({"x": old_x, "y": old_y, "tile": TileType.DOOR})

        if door_changed:
            floor.rebuild_flags()
            # StateUpdateMessage doesn't carry the grid (only INIT does, on
            # floor change) — clients only learn about this tile flip via a
            # MAP_PATCH event, same mechanism as unlocking/grass-trample.
            self.add_event("MAP_PATCH", {"tiles": door_patches}, floor_id=floor_id)

    def _player_step_effects(self, entity: Player, entity_id: str, floor_id: int) -> None:
        """MOVE event + per-step player-only effects (Freerunner Momentum,
        Rejuvenating Steps healing)."""
        self.add_event("MOVE", {"entity": entity_id, "x": entity.pos.x, "y": entity.pos.y}, floor_id=floor_id)
        # Freerunner builds Momentum on each step.
        self.gain_momentum(entity)
        # Rejuvenating Steps (huntress T2): heal small amount per step
        rs = entity.talent_info.level("rejuvenating_steps")
        if rs > 0:
            heal = rs
            entity.hp = min(entity.get_total_max_hp(), entity.hp + heal)
            self.add_event("HEAL", {"target": entity.id, "amount": heal, "x": entity.pos.x, "y": entity.pos.y}, floor_id=floor_id)

    def _auto_pickup_on_step(self, entity: Player, floor, floor_id: int) -> None:
        """SPD-style auto-pickup: items under the hero's feet after a step
        (distinct from the explicit PICKUP_FLOOR action -- see
        ItemsMixin.pickup_floor_items)."""
        items_to_pickup = [
            i_id
            for i_id, i in floor.items.items()
            if i.pos and i.pos.x == entity.pos.x and i.pos.y == entity.pos.y
            and i.type != "grave"  # graves are scenery, not pickable
            and not i.for_sale  # shop stock is bought via SHOP_BUY, not auto-picked-up
            and (i.pos.x, i.pos.y) not in floor.pending_unlocks  # chest mid-unlock is not grabbable
        ]
        for i_id in items_to_pickup:
            item = floor.items[i_id]
            if isinstance(item, Gold):
                entity.gold += item.quantity
                del floor.items[i_id]
                self.add_event("PICKUP_GOLD", {"player": entity.id, "amount": item.quantity}, floor_id=floor_id)
                continue
            if isinstance(item, EnergyCrystal):
                entity.energy += item.quantity
                del floor.items[i_id]
                self.add_event("PICKUP_ENERGY", {"player": entity.id, "amount": item.quantity}, floor_id=floor_id)
                continue
            if isinstance(item, Dewdrop):
                self._pickup_dewdrop(entity, floor, floor_id, i_id, item)
                continue
            if isinstance(item, LostBackpack):
                if item.owner_id == entity.id:
                    self._recover_lost_backpack(entity, item)
                    del floor.items[i_id]
                    self.add_event("PICKUP", {
                        "player": entity.id, "item": "Lost Backpack",
                        "x": entity.pos.x, "y": entity.pos.y,
                        "item_type": "lost_backpack",
                    }, floor_id=floor_id)
                continue
            if isinstance(item, Key):
                entity.add_key(item.key_id, floor_id, item.name)
                del floor.items[i_id]
                self.add_event("PICKUP_KEY", {"player": entity.id, "key_id": item.key_id, "name": item.name}, floor_id=floor_id)
                continue
            if isinstance(item, Bomb) and item.fuse_ticks is not None:
                if self.handle_bomb_pickup(entity, floor, floor_id, i_id, item):
                    continue
            if isinstance(item, CorpseDust):
                # CorpseDust.doPickUp(): attaches the DustGhostSpawner
                # buff (very long duration -- dispelled explicitly by
                # wandmaker_claim_reward, never by natural decay).
                if entity.add_to_inventory(item):
                    del floor.items[i_id]
                    entity.add_buff("dust_ghost_spawner", duration=999999.0)
                    self.add_event("PICKUP", {"player": entity.id, "item": item.name, "x": entity.pos.x, "y": entity.pos.y, "item_type": item.type, "item_kind": item.kind}, floor_id=floor_id)
                continue
            if entity.add_to_inventory(item):
                del floor.items[i_id]
                self.add_event("PICKUP", {"player": entity.id, "item": item.name, "x": entity.pos.x, "y": entity.pos.y, "item_type": item.type, "item_kind": item.kind}, floor_id=floor_id)
                if entity.is_admin and item.type in ("potion", "scroll"):
                    self.identify_kind(item, entity)
            else:
                self.add_event("TOAST", {"text": "Your backpack is full. Drop something to make room."}, player_id=entity.id, floor_id=floor_id)

    def _handle_stairs_tile(self, entity: Player, entity_id: str, tile: int, floor, floor_id: int) -> None:
        """STAIRS_DOWN/STAIRS_UP transitions, including the depth-1 victory
        check when stepping onto the surface exit with the Amulet."""
        if tile == TileType.STAIRS_DOWN and entity.floor_id < MAX_FLOOR_ID:
            first_visit = entity.floor_id + 1 > entity.floors_explored
            self._move_player_to_floor(entity, entity.floor_id + 1, TileType.STAIRS_UP)
            self.add_event("STAIRS_DOWN", {"player": entity_id, "first_visit": first_visit}, player_id=entity_id)

        if tile == TileType.STAIRS_UP and entity.floor_id > 1:
            self._move_player_to_floor(entity, entity.floor_id - 1, TileType.STAIRS_DOWN)
            self.add_event("STAIRS_UP", {"player": entity_id}, player_id=entity_id)

        if tile == TileType.STAIRS_UP and entity.floor_id == 1:
            if any(isinstance(it, Amulet) for it in entity.belongings.all_items()):
                self._complete_victory(entity, floor, floor_id)
            else:
                self.add_event(
                    "MESSAGE",
                    {"text": "You can't leave yet, the rest of the dungeon awaits below!"},
                    player_id=entity_id,
                )
