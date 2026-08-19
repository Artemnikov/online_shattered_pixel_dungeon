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
# Re-export hub for MovementCombatMixin, split by concern:
#   chest.py    - floor interactions (chests, tombs, wells, dewdrops)
#   movement.py - stepping, doors, stairs, auto-pickup
#   melee.py    - bump combat, kill handling
#   ranged.py   - ranged/thrown/wand attacks

from app.engine.game.movement.chest import ChestMixin
from app.engine.game.movement.movement import MovementMixin
from app.engine.game.movement.melee import MeleeCombatMixin
from app.engine.game.movement.ranged import RangedAttackMixin


class MovementCombatMixin(
    ChestMixin,
    MovementMixin,
    MeleeCombatMixin,
    RangedAttackMixin,
):
    pass


__all__ = [
    "MovementCombatMixin",
    "ChestMixin",
    "MovementMixin",
    "MeleeCombatMixin",
    "RangedAttackMixin",
]
