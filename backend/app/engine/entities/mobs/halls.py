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

from typing import List

from pydantic import BaseModel, Field

from app.engine.entities.mobs.city import Eye, Scorpio, RipperDemon
from app.engine.entities.player import Mob as MobEntity, DropEntry

# ---------------------------------------------------------------------------
# Boss YogDzewa (floor 25): fists, summons, invincibility helpers
# ---------------------------------------------------------------------------

class YogDzewa(MobEntity):
    """Final boss. IMMOVABLE+DEMONIC. Invulnerable while fists are alive.
    Phases 0-5: phase 0=pre-fight, 1-4=fist phases, 5=finale."""
    type: str = "boss"
    name: str = "Yog-Dzewa"
    hp: int = 1000
    max_hp: int = 1000
    attack_skill: int = 999    # INFINITE_ACCURACY for beam attacks
    defense_skill: int = 0
    damage_min: int = 20
    damage_max: int = 30
    dr_min: int = 0
    dr_max: int = 0
    exp: int = 50
    max_lvl: int = -2
    flying: bool = True
    view_distance: int = 12
    properties: List[str] = ["DEMONIC", "IMMOVABLE"]
    loot_table: List[DropEntry] = []

    # Boss runtime state
    phase: int = 0
    fist_ids: List[str] = Field(default_factory=list)  # currently-alive spawned fist instance IDs
    fist_order: List[str] = Field(default_factory=list)  # ordered fist class names yet to be spawned
    # Tick-scaled (x20 at 20Hz, ~10s) initial cooldowns -- see _TICKS_PER_TURN
    # in ai_yog_dzewa.py for why these aren't the raw SPD turn-count minimums.
    ability_cooldown: float = 200.0
    summon_cooldown: float = 200.0
    fight_started: bool = False

    def defense_proc(self, damage: int, attacker, floor_mobs: dict, tile_x: int, tile_y: int, **kwargs) -> int:
        # Invincible while any fist is alive (phases 0-4).
        if self.phase < 5:
            alive_fists = [m for m in floor_mobs.values()
                           if m.id in self.fist_ids and getattr(m, 'is_alive', False)]
            if alive_fists:
                return 0
        return damage


# Fists are invincible while standing within this many tiles (Manhattan) of
# their Yog-Dzewa.
FIST_INVINCIBILITY_RADIUS = 4


def _is_fist_near_yog(fist, floor_mobs: dict) -> bool:
    """Return True when `fist` is within FIST_INVINCIBILITY_RADIUS tiles of its Yog (Manhattan)."""
    if not fist.yog_id:
        return False
    yog = floor_mobs.get(fist.yog_id)
    if yog is None or not yog.is_alive:
        return False
    return (abs(fist.pos.x - yog.pos.x) + abs(fist.pos.y - yog.pos.y)
            <= FIST_INVINCIBILITY_RADIUS)


class _YogFistMixin(BaseModel):
    """Shared state/behavior for YogDzewa's six fist minions."""
    paired_fist_id: str = ""
    yog_id: str = ""
    view_distance: int = 6
    # YogFist.java:77 sets `state = HUNTING` in the instance initializer --
    # fists know where the hero is immediately, skipping the generic
    # idle/sleeping/wandering detection rolls (tick.py). Without this, a
    # freshly-spawned fist never moves away from its spawn point next to
    # Yog, staying permanently inside FIST_INVINCIBILITY_RADIUS and making
    # Yog permanently invulnerable.
    ai_state: str = "hunting"

    def defense_proc(self, damage: int, attacker, floor_mobs: dict, tile_x: int, tile_y: int, **kwargs) -> int:
        if _is_fist_near_yog(self, floor_mobs):
            return 0
        return damage


class BurningFist(_YogFistMixin, MobEntity):
    """YogDzewa fist. HP=300. FIERY+DEMONIC. Ranged fire attack."""
    type: str = "boss"
    name: str = "Burning Fist"
    hp: int = 300
    max_hp: int = 300
    attack_skill: int = 36
    defense_skill: int = 20
    damage_min: int = 18
    damage_max: int = 36
    dr_min: int = 0
    dr_max: int = 15
    exp: int = 25
    max_lvl: int = -2
    properties: List[str] = ["DEMONIC", "FIERY"]
    attack_range: int = 8
    loot_table: List[DropEntry] = []

    # Boss runtime state
    ranged_cooldown: float = 0.0


class SoiledFist(_YogFistMixin, MobEntity):
    """YogDzewa fist. HP=300. DEMONIC. Roots enemies, spreads grass."""
    type: str = "boss"
    name: str = "Soiled Fist"
    hp: int = 300
    max_hp: int = 300
    attack_skill: int = 36
    defense_skill: int = 20
    damage_min: int = 18
    damage_max: int = 36
    dr_min: int = 0
    dr_max: int = 15
    exp: int = 25
    max_lvl: int = -2
    properties: List[str] = ["DEMONIC"]
    attack_range: int = 8
    loot_table: List[DropEntry] = []

    ranged_cooldown: float = 0.0

    def take_damage(self, amount: int):
        # SoiledFist.damage(): SPD reduces damage based on nearby grass cells
        # (0-6 -> up to 100% reduction). Grass spread isn't ported, so apply a
        # flat 25% reduction as a documented simplification. (SPD also makes
        # Soiled immune to Burning-sourced damage, but take_damage here has no
        # damage-source param to check, so that part is omitted.)
        amount = round(amount * 0.75)
        return super().take_damage(amount)


class RottingFist(_YogFistMixin, MobEntity):
    """YogDzewa fist. HP=300. ACIDIC+DEMONIC. Converts damage to bleeding; zap=toxic gas."""
    type: str = "boss"
    name: str = "Rotting Fist"
    hp: int = 300
    max_hp: int = 300
    attack_skill: int = 36
    defense_skill: int = 20
    damage_min: int = 18
    damage_max: int = 36
    dr_min: int = 0
    dr_max: int = 15
    exp: int = 25
    max_lvl: int = -2
    properties: List[str] = ["DEMONIC", "ACIDIC"]
    attack_range: int = 8
    loot_table: List[DropEntry] = []

    ranged_cooldown: float = 0.0


class RustedFist(_YogFistMixin, MobEntity):
    """YogDzewa fist. HP=300. INORGANIC+DEMONIC. Defers all damage as viscosity. Higher damage (22-44)."""
    type: str = "boss"
    name: str = "Rusted Fist"
    hp: int = 300
    max_hp: int = 300
    attack_skill: int = 36
    defense_skill: int = 20
    damage_min: int = 22
    damage_max: int = 44
    dr_min: int = 0
    dr_max: int = 15
    exp: int = 25
    max_lvl: int = -2
    properties: List[str] = ["DEMONIC", "INORGANIC"]
    attack_range: int = 8
    loot_table: List[DropEntry] = []

    ranged_cooldown: float = 0.0
    viscosity_stacks: int = 0

    def take_damage(self, amount: int):
        # RustedFist.damage(): all incoming damage is deferred via the
        # Viscosity.DeferedDamage buff and released gradually (10%/tick) by
        # _update_yog_fist in tick.py. No immediate HP loss.
        if amount > 0:
            self.viscosity_stacks += amount
        return 0


class BrightFist(_YogFistMixin, MobEntity):
    """YogDzewa fist. HP=300. ELECTRIC+DEMONIC. Light beam blinds; teleports at half HP."""
    type: str = "boss"
    name: str = "Bright Fist"
    hp: int = 300
    max_hp: int = 300
    attack_skill: int = 36
    defense_skill: int = 20
    damage_min: int = 18
    damage_max: int = 36
    dr_min: int = 0
    dr_max: int = 15
    exp: int = 25
    max_lvl: int = -2
    properties: List[str] = ["DEMONIC", "ELECTRIC"]
    attack_range: int = 8
    loot_table: List[DropEntry] = []

    ranged_cooldown: float = 0.0
    teleport_used: bool = False
    pending_teleport: bool = False

    def take_damage(self, amount: int):
        dealt = super().take_damage(amount)
        # BrightFist.damage(): on first crossing below 50% HP, clamp to
        # exactly half HP and teleport away (handled in _update_yog_fist).
        if self.hp <= self.max_hp // 2 and not self.teleport_used:
            self.hp = self.max_hp // 2
            self.is_alive = self.hp > 0
            self.teleport_used = True
            self.pending_teleport = True
        return dealt


class DarkFist(_YogFistMixin, MobEntity):
    """YogDzewa fist. HP=300. DEMONIC. Dark bolt extinguishes light; teleports at half HP."""
    type: str = "boss"
    name: str = "Dark Fist"
    hp: int = 300
    max_hp: int = 300
    attack_skill: int = 36
    defense_skill: int = 20
    damage_min: int = 18
    damage_max: int = 36
    dr_min: int = 0
    dr_max: int = 15
    exp: int = 25
    max_lvl: int = -2
    properties: List[str] = ["DEMONIC"]
    attack_range: int = 8
    loot_table: List[DropEntry] = []

    ranged_cooldown: float = 0.0
    teleport_used: bool = False
    pending_teleport: bool = False

    def take_damage(self, amount: int):
        dealt = super().take_damage(amount)
        # DarkFist.damage(): same 50%-HP teleport pattern as BrightFist.
        if self.hp <= self.max_hp // 2 and not self.teleport_used:
            self.hp = self.max_hp // 2
            self.is_alive = self.hp > 0
            self.teleport_used = True
            self.pending_teleport = True
        return dealt


class YogEye(Eye):
    """YogDzewa summon — Eye minion variant. BOSS_MINION."""
    name: str = "Yog Eye"
    properties: List[str] = ["DEMONIC", "BOSS_MINION"]
    max_lvl: int = -2


class YogScorpio(Scorpio):
    """YogDzewa summon — Scorpio minion variant. BOSS_MINION."""
    name: str = "Yog Scorpio"
    properties: List[str] = ["DEMONIC", "BOSS_MINION"]
    max_lvl: int = -2


class YogRipper(RipperDemon):
    """YogDzewa summon — RipperDemon minion variant. BOSS_MINION."""
    name: str = "Yog Ripper"
    properties: List[str] = ["DEMONIC", "BOSS_MINION"]
    max_lvl: int = -2
