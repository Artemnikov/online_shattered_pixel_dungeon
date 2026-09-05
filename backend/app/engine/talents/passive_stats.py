from app.engine.entities.talent_enum import Talent
from .constants import (
    STRONGMAN_BASE_BONUS,
    STRONGMAN_BONUS_PER_LEVEL,
    FARSIGHT_VIEW_BONUS_PER_LEVEL,
    SPEEDY_STEALTH_SPEED_MULT,
)
from .registry import MODIFIERS


@MODIFIERS.register("strength", Talent.STRONGMAN)
def strongman_modifier(player, base: int, level: int) -> int:
    return int(base * (1.0 + STRONGMAN_BASE_BONUS + STRONGMAN_BONUS_PER_LEVEL * level))


@MODIFIERS.register("view_distance", Talent.FARSIGHT)
def farsight_modifier(player, base: int, level: int) -> int:
    return base + FARSIGHT_VIEW_BONUS_PER_LEVEL * level


@MODIFIERS.register("movement_speed", Talent.SPEEDY_STEALTH)
def speedy_stealth_speed_modifier(player, base: float, level: int) -> float:
    if level >= 3 and getattr(player, "invisible", 0) > 0:
        return base * SPEEDY_STEALTH_SPEED_MULT
    return base
