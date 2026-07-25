# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 ArtemNikov
#
# Adapted from Shattered Pixel Dungeon (C) 2014-2024 Evan Debenham
# GNU GPL v3+ — see base.py for full notice.
"""Elemental wands: Fireblast, Frost, Lightning."""
from __future__ import annotations

import random as _random
from typing import ClassVar, Literal

from app.engine.entities.base import *  # noqa: F401,F403
from app.engine.entities.buffs import has_buff, remove_buff
from app.engine.entities.wands.base import Wand, DamageWand, ZapContext


class WandOfFireblast(DamageWand):
    kind: Literal["wand_fireblast"] = "wand_fireblast"
    name: str = "Wand of Fireblast"
    type: str = "wand"
    range: int = 8
    projectile_type: str = "fire_bolt"
    wand_sound: str = "ATTACK_MAGIC"
    staff_name: str = "Staff of Fireblast"
    DESC: ClassVar[str] = "A catastrophic wand that unleashes fire."

    # SPD: min/max scale with chargesPerCast
    def min(self, lvl: int) -> int:
        return (1 + lvl) * self.charges_per_cast()

    def max(self, lvl: int) -> int:
        cpc = self.charges_per_cast()
        if cpc == 1:
            return 2 + 2 * lvl
        elif cpc == 2:
            return 2 * (4 + 2 * lvl)
        else:
            return 3 * (6 + 2 * lvl)

    def charges_per_cast(self) -> int:
        consumed = (self.charges * 3 + 9) // 10
        return max(1, min(3, consumed))

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        if defender is None or not defender.is_alive:
            return
        proc_chance = 0.0
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                cx, cy = defender.pos.x + dx, defender.pos.y + dy
                ch = None
                if floor_mobs:
                    ch = next((m for m in floor_mobs.values() if m.is_alive and m.pos.x == cx and m.pos.y == cy), None)
                if ch and ch.has_buff("burning"):
                    proc_chance += 0.25
                elif floor:
                    if 0 <= cx < floor.width and 0 <= cy < floor.height:
                        for blob in floor.blob_areas.values():
                            if blob.get("type") == "fire" and (cx, cy) in blob.get("cells", set()):
                                proc_chance += 0.05
                                break
        proc_chance = min(1.0, proc_chance)
        if _random.random() < proc_chance:
            power_mult = max(1.0, proc_chance)
            lvl = max(0, self.level)
            dmg_range = (2 + 2 * lvl, 8 + 4 * lvl)
            if floor is None:
                return
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    cx, cy = defender.pos.x + dx, defender.pos.y + dy
                    if not (0 <= cx < floor.width and 0 <= cy < floor.height):
                        continue
                    ch = None
                    if floor_mobs:
                        ch = next((m for m in floor_mobs.values() if m.is_alive and m.pos.x == cx and m.pos.y == cy), None)
                    # Remove burning from all chars in 3×3
                    if ch and ch.has_buff("burning"):
                        ch.remove_buff("burning")
                    # Damage enemies
                    if ch and ch.faction != attacker.faction:
                        aoe_dmg = _random.randint(dmg_range[0], dmg_range[1])
                        aoe_dmg = int(aoe_dmg * power_mult)
                        ch.take_damage(aoe_dmg)
                    # Destroy fire in 3×3 (SPD clears fire on proc)
                    blob_del = [bid for bid, b in floor.blob_areas.items()
                                if b.get("type") == "fire" and (cx, cy) in b.get("cells", set())]
                    for bid in blob_del:
                        del floor.blob_areas[bid]
            if add_event:
                add_event("PLAY_SOUND", {"sound": "BLAST"}, floor_id=getattr(floor, "floor_id", 0))

    def handle_zap(self, ctx):
        charges = self.charges_per_cast()
        fire_vol = 1 + charges
        floor = ctx.floor
        if floor is None:
            return
        tx, ty = ctx.target_x, ctx.target_y
        # SPD: spread fire to all non-water cells in 3×3
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nx, ny = tx + dx, ty + dy
                if 0 <= nx < floor.width and 0 <= ny < floor.height:
                    tile = floor.grid[ny][nx]
                    if tile == TileType.FLOOR_WATER:
                        continue
                    # Also check flamable adjacency for short-range casts (SPD adjacentCells logic)
                    blob_id = f"wand_fireblast_{ctx.attacker.id}_{nx}_{ny}"
                    floor.blob_areas[blob_id] = {
                        "type": "fire",
                        "cells": {(nx, ny)},
                        "volume": {(nx, ny): fire_vol},
                    }
        # SPD: for each cell adjacent to caster that is NOT flamable/solid, ignite closer flamable neighbors
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nx, ny = ctx.attacker.pos.x + dx, ctx.attacker.pos.y + dy
                if not (0 <= nx < floor.width and 0 <= ny < floor.height):
                    continue
                tile = floor.grid[ny][nx]
                is_flamable = tile in (TileType.FLOOR_GRASS, TileType.HIGH_GRASS, TileType.BARRICADE, TileType.BOOKSHELF, TileType.FURROWED_GRASS)
                is_solid = floor.flags.solid[ny][nx] if floor.flags else False
                if abs(dx) + abs(dy) <= 1 and not is_flamable and not is_solid:
                    # This is an adjacent cell to caster that isn't flamable/solid
                    # Ignite closer flamable neighbors (SPD adjacentCells logic)
                    for dx2, dy2 in [(-1,0),(1,0),(0,-1),(0,1)]:
                        mx, my = nx + dx2, ny + dy2
                        if 0 <= mx < floor.width and 0 <= my < floor.height:
                            dist_to_target = abs(mx - tx) + abs(my - ty)
                            dist_adj = abs(nx - tx) + abs(ny - ty)
                            if dist_to_target < dist_adj:
                                t2 = floor.grid[my][mx]
                                if t2 in (TileType.FLOOR_GRASS, TileType.HIGH_GRASS, TileType.BARRICADE, TileType.BOOKSHELF):
                                    blob_id = f"wand_fireblast_{ctx.attacker.id}_{mx}_{my}"
                                    floor.blob_areas[blob_id] = {
                                        "type": "fire",
                                        "cells": {(mx, my)},
                                        "volume": {(mx, my): fire_vol},
                                    }
        # Apply buffs to all chars in 3×3
        if ctx.target_entity and ctx.target_entity.is_alive:
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    cx, cy = tx + dx, ty + dy
                    ch = None
                    if ctx.floor_mobs:
                        ch = next((m for m in ctx.floor_mobs.values()
                                   if m.is_alive and m.pos.x == cx and m.pos.y == cy), None)
                    if ch and ch.is_alive:
                        if ch.has_buff("burning"):
                            ch.remove_buff("burning")
                        from app.engine.entities.buffs import add_buff
                        add_buff(ch.buffs, "burning", duration=4.0, level=1, stack_mode="replace")
                        if charges >= 2:
                            add_buff(ch.buffs, "cripple", duration=4.0, level=1)
                        if charges >= 3:
                            add_buff(ch.buffs, "paralysis", duration=4.0, level=1)
        ctx.add_event("PLAY_SOUND", {"sound": "BLAST"}, floor_id=ctx.floor_id)


class WandOfFrost(DamageWand):
    kind: Literal["wand_frost"] = "wand_frost"
    name: str = "Wand of Frost"
    type: str = "wand"
    range: int = 8
    projectile_type: str = "frost"
    wand_sound: str = "ATTACK_MAGIC"
    staff_name: str = "Staff of Frost"
    DESC: ClassVar[str] = "A wand that freezes enemies solid."

    def min(self, lvl: int) -> int: return 2 + lvl
    def max(self, lvl: int) -> int: return 8 + 5 * lvl

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        if defender is None:
            return
        chill_buff = defender.get_buff("chill")
        if chill_buff:
            chill_turns = int(chill_buff.remaining)
            proc_chance = (chill_turns - 1) / 9.0
            if _random.random() < proc_chance:
                power_mult = max(1.0, proc_chance)
                duration = round(3.0 * power_mult)
                defender.add_buff("frost", duration=duration, level=1)

    def handle_zap(self, ctx):
        if ctx.floor is None:
            return
        lvl = self.buffed_lvl()
        tx, ty = ctx.target_x, ctx.target_y
        # Extinguish fire at target tile
        to_remove = [bid for bid, b in ctx.floor.blob_areas.items()
                     if b.get("type") in ("fire",) and (tx, ty) in b.get("cells", set())]
        for bid in to_remove:
            del ctx.floor.blob_areas[bid]
        if ctx.hit and ctx.target_entity and ctx.target_entity.is_alive:
            chill_turns = 4 + lvl if ctx.floor.grid[ty][tx] == TileType.FLOOR_WATER else 2 + lvl
            ctx.target_entity.add_buff("chill", duration=float(chill_turns), level=1)
            # SPD: if already frozen, no effect; frost proc handled by on_hit for Battlemage


class WandOfLightning(DamageWand):
    kind: Literal["wand_lightning"] = "wand_lightning"
    name: str = "Wand of Lightning"
    type: str = "wand"
    projectile_type: str = "lightning"
    wand_sound: str = "LIGHTNING"
    staff_name: str = "Staff of Lightning"
    DESC: ClassVar[str] = "A wand that arcs lightning to its target."

    def min(self, lvl: int) -> int: return 5 + lvl
    def max(self, lvl: int) -> int: return 10 + 5 * lvl

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        if attacker is None:
            return
        lvl = max(0, self.level)
        proc_chance = (lvl + 1) / (lvl + 4)
        if has_buff(attacker.buffs, "empowered_strike_tracker"):
            proc_chance *= 2.0
            remove_buff(attacker.buffs, "empowered_strike_tracker")
        if _random.random() < proc_chance:
            attacker.add_buff("lightning_charge", duration=10.0, level=1)
            if add_event:
                add_event("PLAY_SOUND", {"sound": "LIGHTNING"}, floor_id=getattr(attacker, "floor_id", 0))

    def handle_zap(self, ctx):
        if not ctx.hit or ctx.damage_dealt <= 0 or not ctx.target_entity:
            return
        from collections import deque
        lvl = self.buffed_lvl()
        affected_ids = {ctx.target_entity.id}
        chain_mobs = []
        floor = ctx.floor
        tx, ty = ctx.target_x, ctx.target_y
        is_main_in_water = floor.grid[ty][tx] == TileType.FLOOR_WATER
        has_charge = has_buff(ctx.attacker.buffs, "lightning_charge")

        def _reachable(from_x, from_y, max_dist):
            visited = {(from_x, from_y)}
            q = deque([(from_x, from_y, 0)])
            while q:
                x, y, d = q.popleft()
                if d >= max_dist:
                    continue
                for dx, dy in [(0, -1), (1, 0), (0, 1), (-1, 0)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < floor.width and 0 <= ny < floor.height:
                        if (nx, ny) not in visited and not floor.flags.solid[ny][nx]:
                            visited.add((nx, ny))
                            q.append((nx, ny, d + 1))
            return visited

        def _wand_find(from_x, from_y):
            dist = 2 if (0 <= from_y < floor.height and 0 <= from_x < floor.width
                        and floor.grid[from_y][from_x] == TileType.FLOOR_WATER) else 1
            if has_charge:
                dist += 1
            reachable = _reachable(from_x, from_y, dist)
            for m in floor.mobs.values():
                if not m.is_alive or m.id in affected_ids:
                    continue
                if m.faction == ctx.attacker.faction:
                    continue
                if (m.pos.x, m.pos.y) not in reachable:
                    continue
                if has_buff(m.buffs, "lightning_charge"):
                    continue
                affected_ids.add(m.id)
                chain_mobs.append(m)
                _wand_find(m.pos.x, m.pos.y)

        _wand_find(tx, ty)

        if chain_mobs:
            base_dmg = self.damage_roll(lvl)
            mult = 1.0 if is_main_in_water else (0.4 + 0.6 / max(len(chain_mobs) + 1, 1))
            for m in chain_mobs:
                dmg = round(base_dmg * mult)
                dr_roll = _random.randint(m.get_dr_min(), m.get_dr_max())
                actual = m.take_damage(max(1, dmg - dr_roll))
                if actual > 0:
                    ctx.add_event("DAMAGE", {"target": m.id, "amount": actual, "shock": True}, floor_id=ctx.floor_id)
                    if not m.is_alive:
                        m.die(floor_mobs=floor.mobs, tile_x=m.pos.x, tile_y=m.pos.y,
                              players=ctx.floor_players)
                        ctx.add_event("DEATH", {"target": m.id}, floor_id=ctx.floor_id)

        ctx.add_event("LIGHTNING_ARC", {
            "source_x": ctx.attacker.pos.x,
            "source_y": ctx.attacker.pos.y,
            "target_x": tx,
            "target_y": ty,
        }, floor_id=ctx.floor_id)
        ctx.add_event("SHOCKING_PROC", {
            "source": ctx.attacker.id,
            "defender": ctx.target_entity.id if ctx.target_entity else ctx.attacker.id,
            "defender_x": tx,
            "defender_y": ty,
            "chain_targets": [{"id": m.id, "x": m.pos.x, "y": m.pos.y} for m in chain_mobs],
        }, floor_id=ctx.floor_id)

        if floor.grid[ty][tx] == TileType.FLOOR_WATER:
            blob_id = f"wand_elec_{ctx.attacker.id}"
            vol = 100
            cells = {(tx, ty)}
            volume = {(tx, ty): vol}
            existing = floor.blob_areas.get(blob_id)
            if existing:
                cells.update(existing["cells"])
                for k, v in existing["volume"].items():
                    volume[k] = max(volume.get(k, 0), v)
            floor.blob_areas[blob_id] = {"type": "electricity", "cells": cells, "volume": volume, "tick_counter": 0}
            cell_list = [(c[0], c[1], volume.get(c, vol)) for c in cells]
            ctx.add_event("BLOB_UPDATE", {"id": blob_id, "type": "electricity", "cells": cell_list}, floor_id=ctx.floor_id)
            ctx.add_event("PLAY_SOUND", {"sound": "LIGHTNING"}, floor_id=ctx.floor_id)
