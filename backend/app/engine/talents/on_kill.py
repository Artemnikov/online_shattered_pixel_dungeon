import random
from app.engine.entities.base import Faction
from app.engine.entities.buffs import add_buff
from app.engine.entities.subclasses import Subclass
from app.engine.entities.talent_enum import Talent
from .constants import SOUL_EATER_BASE_HEAL, SOUL_EATER_HEAL_PER_LEVEL
from .registry import EffectContext, registry


@registry.on("on_kill", Talent.CLEAVE)
def handle_cleave(ctx: EffectContext, level: int) -> None:
    player = ctx.player
    if player.subclass_info.subclass == Subclass.GLADIATOR and player.combo_count > 0:
        player.combo_timer = 15.0 + 15.0 * level


@registry.on("on_kill", Talent.LETHAL_MOMENTUM)
def handle_lethal_momentum(ctx: EffectContext, level: int) -> None:
    player = ctx.player
    floor_id = ctx.payload.get("floor_id", getattr(player, "floor_id", 0))
    if random.random() < 0.34 + 0.33 * level:
        add_buff(player.buffs, "lethal_momentum_tracker", duration=5.0, level=1)
        if hasattr(ctx.game, "add_event"):
            ctx.game.add_event(
                "LETHAL_MOMENTUM",
                {"player": player.id},
                floor_id=floor_id,
                source_player_id=player.id,
            )


@registry.on("on_kill", Talent.SOUL_EATER)
def handle_soul_eater(ctx: EffectContext, level: int) -> None:
    player = ctx.player
    floor_id = ctx.payload.get("floor_id", getattr(player, "floor_id", 0))
    healing = SOUL_EATER_BASE_HEAL + SOUL_EATER_HEAL_PER_LEVEL * level
    player.hp = min(player.get_total_max_hp(), player.hp + healing)
    if hasattr(ctx.game, "add_event"):
        ctx.game.add_event(
            "HEAL",
            {"target": player.id, "amount": healing, "x": player.pos.x, "y": player.pos.y},
            floor_id=floor_id,
        )


@registry.on("on_death_mark_kill", Talent.DEATHLY_DURABILITY)
def handle_deathly_durability(ctx: EffectContext, level: int) -> None:
    player = ctx.player
    mob = ctx.payload.get("mob")
    floor_id = ctx.payload.get("floor_id", getattr(player, "floor_id", 0))
    if mob is not None:
        shield = round(mob.max_hp * 0.125 * level)
        if shield > 0:
            player.add_shield("death_mark", shield, priority=1, decay=600)
            if hasattr(ctx.game, "add_event"):
                ctx.game.add_event(
                    "SHIELD",
                    {"player": player.id, "amount": shield},
                    floor_id=floor_id,
                    source_player_id=player.id,
                )


@registry.on("on_death_mark_kill", Talent.FEAR_THE_REAPER)
def handle_fear_the_reaper(ctx: EffectContext, level: int) -> None:
    mob = ctx.payload.get("mob")
    floor = ctx.payload.get("floor")
    game = ctx.game
    if mob is None:
        return

    add_buff(mob.buffs, "cripple", duration=5.0, level=1)
    if level >= 2:
        add_buff(mob.buffs, "terror", duration=5.0, level=1)
    if level >= 3 and floor is not None and hasattr(floor, "mobs"):
        for other in floor.mobs.values():
            if other is mob or not other.is_alive or other.faction == Faction.PLAYER:
                continue
            dist_fn = getattr(game, "_get_distance", None)
            dist = dist_fn(mob.pos, other.pos) if dist_fn else max(abs(mob.pos.x - other.pos.x), abs(mob.pos.y - other.pos.y))
            if dist <= 3:
                add_buff(other.buffs, "cripple", duration=5.0, level=1)
                if level == 4:
                    add_buff(other.buffs, "terror", duration=5.0, level=1)
