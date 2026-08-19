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

from typing import List, Optional

from pydantic import Field

from app.engine.entities.base import Faction
from app.engine.entities.player import Mob as MobEntity, DropEntry

# ---------------------------------------------------------------------------
# NPCs / player-faction allies (RatKing, Shopkeeper, Imp, Ghost, MirrorImage)
# ---------------------------------------------------------------------------

class RatKing(MobEntity):
    """Cosmetic NPC in the sewer boss secret treasure room (RatKing.java).
    Sleeps forever, never wakes/attacks, takes no damage and dodges everything."""
    name: str = "Rat King"
    type: str = "npc"
    faction: str = Faction.PLAYER
    hp: int = 1
    max_hp: int = 1
    attack_skill: int = 0
    defense_skill: int = 0
    damage_min: int = 0
    damage_max: int = 0
    dr_min: int = 0
    dr_max: int = 0
    exp: int = 0
    max_lvl: int = -2
    loot_table: List[DropEntry] = []
    ai_state: str = "sleeping"
    # Mirrors RatKing.java: never transitions out of SLEEPING (chooseEnemy()
    # always returns null), so the generic wake-up check in tick.py skips it.
    never_wakes: bool = True

    def take_damage(self, amount: int):
        # RatKing.damage(): does nothing — immune to all damage.
        return 0

    def get_effective_defense_skill(self) -> int:
        # RatKing.defenseSkill(): INFINITE_EVASION — always dodges.
        return 10 ** 9


class Shopkeeper(MobEntity):
    """Friendly trader NPC (Shopkeeper.java): immune, never wakes/attacks,
    sells from a fixed stock and buys items from the player."""
    name: str = "Shopkeeper"
    type: str = "npc"
    faction: str = Faction.PLAYER
    hp: int = 1
    max_hp: int = 1
    attack_skill: int = 0
    defense_skill: int = 0
    damage_min: int = 0
    damage_max: int = 0
    dr_min: int = 0
    dr_max: int = 0
    exp: int = 0
    max_lvl: int = -2
    loot_table: List[DropEntry] = []
    ai_state: str = "sleeping"
    never_wakes: bool = True

    def take_damage(self, amount: int):
        # Shopkeeper.damage(): immune to all damage.
        return 0


class Imp(MobEntity):
    """Imp quest-giver NPC (actors/mobs/npcs/Imp.java): immune, never wakes
    or attacks; offers the Golem/Monk token-collection quest."""
    name: str = "Imp"
    type: str = "npc"
    faction: str = Faction.PLAYER
    hp: int = 1
    max_hp: int = 1
    attack_skill: int = 0
    defense_skill: int = 0
    damage_min: int = 0
    damage_max: int = 0
    dr_min: int = 0
    dr_max: int = 0
    exp: int = 0
    max_lvl: int = -2
    loot_table: List[DropEntry] = []
    ai_state: str = "sleeping"
    never_wakes: bool = True

    def take_damage(self, amount: int):
        # Imp.damage(): immune to all damage.
        return 0

    def get_effective_defense_skill(self) -> int:
        return 10 ** 9


class GhostHeroMob(MobEntity):
    """Ghost of Sir Archibald summoned by the Dried Rose (DriedRose.GhostHero).
    Player-faction ally that auto-attacks enemies and follows the owner.
    Stats are refreshed each tick from the owner's level.
    """
    type: str = "ghost_hero"
    name: str = "Ghost Hero"
    hp: int = 20
    max_hp: int = 20
    faction: str = Faction.PLAYER
    flying: bool = True
    ai_state: str = "hunting"
    owner_id: str = ""
    attack_range: int = 1
    direct_x: Optional[int] = None
    direct_y: Optional[int] = None
    immunities: List[str] = Field(default_factory=lambda: [
        "corrosive_gas", "burning", "ally_buff",
    ])
    properties: List[str] = Field(default_factory=lambda: ["UNDEAD", "INORGANIC"])


class MirrorImage(MobEntity):
    """Hero clone summoned by Scroll of Mirror Image (MirrorImage.java).

    Spawns invisible (guaranteeing a first-strike surprise attack), with
    1 HP and combat stats refreshed each tick from the owning player.
    """
    type: str = "mirror_image"
    name: str = "Mirror Image"
    hp: int = 1
    max_hp: int = 1
    faction: str = Faction.PLAYER
    ai_state: str = "hunting"
    immunities: List[str] = Field(default_factory=lambda: ["toxic_gas", "corrosive_gas", "burning", "ally_buff"])
