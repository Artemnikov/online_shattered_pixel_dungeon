# Copyright (C) 2026 ArtemNikov
#
# Adapted from Shattered Pixel Dungeon (C) 2014-2024 Evan Debenham
# GNU GPL v3+ — see base.py for full notice.
"""Wand of Living Earth (SPD WandOfLivingEarth.java)."""
from __future__ import annotations

import random as _random
import uuid as _uuid
from typing import ClassVar, Literal

from app.engine.entities.base import *  # noqa: F401,F403
from app.engine.entities.wands.base import DamageWand


class WandOfLivingEarth(DamageWand):
    kind: Literal["wand_living_earth"] = "wand_living_earth"
    name: str = "Wand of Living Earth"
    type: str = "wand"
    projectile_type: str = "earth"
    wand_sound: str = "ATTACK_MAGIC"
    staff_name: str = "Staff of Living Earth"
    DESC: ClassVar[str] = "A wand that summons an earth guardian."

    def min(self, lvl: int) -> int:
        return 4

    def max(self, lvl: int) -> int:
        return 6 + 2 * lvl

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        """Staff proc:33% of damage goes to rock armor or guardian."""
        if attacker is None or damage <= 0 or floor is None:
            return
        armor = round(damage * 0.33)
        if armor <= 0:
            return
        # Find existing guardian
        guardian = None
        for m in floor.mobs.values():
            if m.is_alive and getattr(m, "mob_type", None) == "earth_guardian" and m.faction == attacker.faction:
                guardian = m
                break
        if guardian:
            # SPD: heal guardian's HP by armor amount
            old_ht = getattr(guardian, "_base_ht", None)
            wand_level = self.buffed_lvl()
            new_ht = 16 + 8 * wand_level
            if old_ht is None or new_ht > old_ht:
                guardian.max_hp = new_ht
                guardian._base_ht = new_ht
            guardian.hp = min(guardian.max_hp, guardian.hp + armor)
            if add_event:
                add_event("PLAY_SOUND", {"sound": "HEAL"}, floor_id=getattr(floor, "floor_id", 0))
        else:
            # Add rock armor buff to attacker
            attacker.add_buff("rock_armor", duration=999.0, level=armor,
                              stack_mode="extend")

    def handle_zap(self, ctx):
        lvl = self.buffed_lvl()
        floor = ctx.floor
        if floor is None:
            return
        # Find existing guardian
        guardian = None
        for m in floor.mobs.values():
            if m.is_alive and getattr(m, "mob_type", None) == "earth_guardian" and m.faction == ctx.attacker.faction:
                guardian = m
                break
        tx, ty = ctx.target_x, ctx.target_y
        armor_to_add = self.damage_roll(lvl)
        guardian_threshold = 8 + lvl * 4
        if guardian:
            # SPD: shooting at existing guardian heals it
            guardian.max_hp = 16 + 8 * lvl
            guardian.hp = min(guardian.max_hp, guardian.hp + armor_to_add)
            # Tell guardian to aggro on target
            if ctx.target_entity and hasattr(guardian, "aggro"):
                guardian.aggro(ctx.target_entity)
            ctx.add_event("PLAY_SOUND", {"sound": "HEAL"}, floor_id=ctx.floor_id)
        elif armor_to_add >= guardian_threshold:
            # SPD: enough armor accumulated → spawn guardian
            # Find nearest free cell to target
            gx, gy = tx, ty
            if ctx.target_entity and ctx.target_entity.pos:
                # Find closest passable cell to caster
                best_dist = 999
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = tx + dx, ty + dy
                        if 0 <= nx < floor.width and 0 <= ny < floor.height:
                            if floor.flags and floor.flags.passable[ny][nx]:
                                occupied = any(
                                    m.is_alive and m.pos.x == nx and m.pos.y == ny
                                    for m in floor.mobs.values()
                                )
                                if not occupied:
                                    dist = abs(nx - ctx.attacker.pos.x) + abs(ny - ctx.attacker.pos.y)
                                    if dist < best_dist:
                                        best_dist = dist
                                        gx, gy = nx, ny
            guard_id = str(_uuid.uuid4())
            from app.engine.entities.player import Mob as MobEntity
            depth = getattr(floor, "floor_id", 1)
            hero_level = getattr(ctx.attacker, "level", 1)
            defense_skill = (hero_level + 4) // 2
            guard = MobEntity(
                id=guard_id,
                type="mob",
                mob_type="earth_guardian",
                name="Earth Guardian",
                pos=Position(x=gx, y=gy),
                hp=16 + 8 * lvl, max_hp=16 + 8 * lvl,
                attack=2 * defense_skill + 5, defense=defense_skill,
                damage_min=2, damage_max=4 + depth // 2,
                dr_min=lvl, dr_max=3 + 3 * lvl,
                faction=ctx.attacker.faction,
                view_distance=6,
            )
            floor.mobs[guard.id] = guard
            # Aggro on target if present
            if ctx.target_entity and hasattr(guard, "aggro"):
                guard.aggro(ctx.target_entity)
            ctx.add_event("SUMMON", {
                "id": guard.id, "x": gx, "y": gy,
                "name": "Earth Guardian",
            }, floor_id=ctx.floor_id)
        else:
            # Not enough armor for guardian → grant rock armor to caster
            ctx.attacker.add_buff("rock_armor", duration=999.0, level=armor_to_add,
                                  stack_mode="extend")
