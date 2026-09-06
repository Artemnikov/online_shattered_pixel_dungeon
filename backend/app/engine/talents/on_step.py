from app.engine.entities.talent_enum import Talent
from .constants import REJUVENATING_STEPS_HEAL_PER_LEVEL
from .registry import EffectContext, registry


@registry.on("on_step", Talent.REJUVENATING_STEPS)
def handle_rejuvenating_steps(ctx: EffectContext, level: int) -> None:
    player = ctx.player
    floor_id = ctx.payload.get("floor_id", getattr(player, "floor_id", 0))
    heal = level * REJUVENATING_STEPS_HEAL_PER_LEVEL
    player.hp = min(player.get_total_max_hp(), player.hp + heal)
    if hasattr(ctx.game, "add_event"):
        ctx.game.add_event(
            "HEAL",
            {"target": player.id, "amount": heal, "x": player.pos.x, "y": player.pos.y},
            floor_id=floor_id,
        )
