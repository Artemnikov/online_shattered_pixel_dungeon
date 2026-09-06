from app.engine.entities.talent_enum import Talent
from .constants import MOMENTUM_MAX
from .registry import EffectContext, registry


@registry.on("tick_rogue_momentum", Talent.SPEEDY_STEALTH)
def handle_speedy_stealth_momentum(ctx: EffectContext, level: int) -> None:
    player = ctx.player
    if level >= 1 and getattr(player, "invisible", 0) > 0:
        player.momentum_stacks = min(player.momentum_stacks + 2, MOMENTUM_MAX)
        player._momentum_decay_accum = 0.0
