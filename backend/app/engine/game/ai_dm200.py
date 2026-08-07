import random
import time

from app.engine.game.ai_ranged_common import ranged_approach, ranged_death_check, ranged_dr_damage


"""DM-200 / DM-201: vents toxic gas projectile at range with cooldown."""


def _update_dm200(game, mob, floor, floor_id: int) -> bool:
    approach = ranged_approach(game, mob, floor_id)
    if approach is None:
        return False
    target, dist, in_los = approach

    vent_cooldown = getattr(mob, "vent_cooldown", 0)
    if vent_cooldown > 0:
        mob.vent_cooldown = max(0, vent_cooldown - 1)

    if dist <= mob.attack_range and in_los and vent_cooldown <= 0:
        _dm200_vent_gas(game, mob, target, floor, floor_id)
        return True

    return False


def _dm200_vent_gas(game, mob, target, floor, floor_id: int):
    bolt_type = getattr(mob, "bolt_type", "toxic_gas")
    game.add_event("RANGED_ATTACK", {
        "source": mob.id,
        "x": mob.pos.x,
        "y": mob.pos.y,
        "target_x": target.pos.x,
        "target_y": target.pos.y,
        "projectile": bolt_type,
        "is_wand": True,
        "sound": "GAS",
        "crit": False,
        "grim_proc": False,
    }, floor_id=floor_id)
    game.add_event("PLAY_SOUND", {"sound": "GAS"}, floor_id=floor_id)

    mob.last_attack_time = time.time()
    mob.vent_cooldown = 30

    dmg = random.randint(mob.damage_min, mob.damage_max)
    dealt = ranged_dr_damage(game, mob, target, floor_id, dmg, bolt_type)

    if dealt > 0:
        target.add_buff("poison", duration=10.0, level=1, stack_mode="extend")

    ranged_death_check(game, target, floor_id)
