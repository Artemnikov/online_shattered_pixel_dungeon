from app.engine.entities.talent_enum import Talent
from .constants import (
    LIQUID_WILLPOWER_BASE_RATIO,
    LIQUID_WILLPOWER_RATIO_PER_LEVEL,
    LIQUID_WILLPOWER_SHIELD_DECAY,
)
from .registry import EffectContext, registry


@registry.on("on_potion", Talent.LIQUID_WILLPOWER)
def handle_liquid_willpower(ctx: EffectContext, level: int) -> None:
    player = ctx.player
    shield_amt = round(
        player.get_total_max_hp() * (LIQUID_WILLPOWER_BASE_RATIO + LIQUID_WILLPOWER_RATIO_PER_LEVEL * level)
    )
    if shield_amt > 0:
        player.add_shield("liquid_willpower", shield_amt, priority=1, decay=LIQUID_WILLPOWER_SHIELD_DECAY)
