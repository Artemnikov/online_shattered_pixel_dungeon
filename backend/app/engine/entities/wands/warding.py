# Copyright (C) 2026 ArtemNikov
#
# Adapted from Shattered Pixel Dungeon (C) 2014-2024 Evan Debenham
# GNU GPL v3+ — see base.py for full notice.
"""Wand of Warding (SPD WandOfWarding.java)."""
from __future__ import annotations

import random as _random
import uuid as _uuid
from typing import ClassVar, Literal

from app.engine.entities.base import *  # noqa: F401,F403
from app.engine.entities.wands.base import Wand


class WandOfWarding(Wand):
    kind: Literal["wand_warding"] = "wand_warding"
    name: str = "Wand of Warding"
    type: str = "wand"
    damage: int = 0
    projectile_type: str = "ward"
    wand_sound: str = "ATTACK_MAGIC"
    staff_name: str = "Staff of Warding"
    DESC: ClassVar[str] = "A wand that deploys a sentry ward."

    # SPD: ward energy budget = sum of ward tiers <= 2 + wandLevel per charger
    # Tier 1-2: die after (2*tier-1) zaps. Tier 3: HP-based (35 HP, loses 4 per zap).
    # Tier 4+: have HP, defense, DR. Take self-damage per zap (5/6/7 for tier 4/5/6).

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        """Staff proc: heal all wards. Lvl 0=20%, higher = more chance."""
        if attacker is None or floor is None:
            return
        lvl = max(0, self.level)
        proc_chance = (lvl + 1) / (lvl + 5)
        if _random.random() < proc_chance:
            for m in floor.mobs.values():
                if m.is_alive and getattr(m, "mob_type", None) == "ward" and m.faction == attacker.faction:
                    tier = getattr(m, "_ward_tier", 1)
                    wand_level = getattr(m, "_wand_level", 1)
                    heal_factor = max(1.0, proc_chance)
                    heal = _ward_heal_amount(tier, heal_factor)
                    if tier <= 3:
                        # Reduce total zaps (heal by reducing zap count)
                        zaps = getattr(m, "_total_zaps", 0)
                        m._total_zaps = max(0, zaps - heal)
                    else:
                        m.hp = min(m.max_hp, m.hp + heal)
                    if add_event:
                        add_event("PLAY_SOUND", {"sound": "HEAL"},
                                  floor_id=getattr(floor, "floor_id", 0))

    def handle_zap(self, ctx):
        floor = ctx.floor
        if floor is None:
            return
        lvl = self.buffed_lvl()
        tx, ty = ctx.target_x, ctx.target_y
        # Find ward at target
        existing_ward = None
        for m in floor.mobs.values():
            if m.is_alive and getattr(m, "mob_type", None) == "ward" and m.pos.x == tx and m.pos.y == ty:
                existing_ward = m
                break
        if existing_ward:
            # SPD: upgrade or heal existing ward
            old_level = getattr(existing_ward, "_wand_level", 0)
            if lvl > old_level:
                existing_ward._wand_level = lvl
            tier = getattr(existing_ward, "_ward_tier", 1)
            if tier < 6:
                # Upgrade tier
                existing_ward._ward_tier = tier + 1
                existing_ward.view_distance = 3 + tier + 1
                # HP scaling on upgrade
                if tier + 1 == 3:
                    existing_ward.max_hp = 35
                    existing_ward.hp = 15 + max(0, 5 - getattr(existing_ward, "_total_zaps", 0)) * 4
                elif tier + 1 == 4:
                    existing_ward.max_hp = 54
                    existing_ward.hp += 19
                elif tier + 1 == 5:
                    existing_ward.max_hp = 84
                    existing_ward.hp += 30
                elif tier + 1 == 6:
                    heal = _ward_heal_amount(6, 1.0)
                    existing_ward.hp = min(existing_ward.max_hp, existing_ward.hp + heal)
                # Give sentry stats at tier 4+
                if tier + 1 >= 4:
                    depth = getattr(floor, "floor_id", 1)
                    existing_ward.defense = 4 + depth
                    existing_ward.dr_min = 0
                    existing_ward.dr_max = max(1, int((3 + depth // 2) / (7.0 - (tier + 1))))
            ctx.add_event("PLAY_SOUND", {"sound": "HEAL"}, floor_id=ctx.floor_id)
        elif 0 <= ty < floor.height and 0 <= tx < floor.width:
            if floor.flags and floor.flags.passable[ty][tx]:
                ward_id = str(_uuid.uuid4())
                from app.engine.entities.player import Mob as MobEntity
                ward = MobEntity(
                    id=ward_id,
                    type="mob",
                    mob_type="ward",
                    name="Ward Sentinel",
                    pos=Position(x=tx, y=ty),
                    hp=15, max_hp=15,
                    attack=2 + lvl, defense=0,
                    damage_min=2 + lvl, damage_max=8 + 4 * lvl,
                    faction=ctx.attacker.faction,
                    view_distance=4,
                )
                ward._ward_tier = 1
                ward._wand_level = lvl
                ward._total_zaps = 0
                floor.mobs[ward.id] = ward
                ctx.add_event("SUMMON", {
                    "id": ward.id, "x": tx, "y": ty,
                    "name": "Ward Sentinel",
                }, floor_id=ctx.floor_id)


def _ward_heal_amount(tier: int, heal_factor: float = 1.0) -> int:
    """SPD Ward.wandHeal: tier-specific heal amounts."""
    if tier == 1:
        return 0
    elif tier == 2:
        return max(1, round(1 * heal_factor))
    elif tier == 3:
        return max(1, round(_random.randint(1, 2) * heal_factor))
    elif tier == 4:
        return max(1, round(9 * heal_factor))
    elif tier == 5:
        return max(1, round(12 * heal_factor))
    elif tier == 6:
        return max(1, round(16 * heal_factor))
    return 0
