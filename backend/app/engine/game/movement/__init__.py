# Copyright (C) 2026 ArtemNikov
#
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
