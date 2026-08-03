import random
import time

from app.engine.game.ai_ranged_common import ranged_approach, ranged_death_check, ranged_dr_damage


"""NewbornFireElemental (Wandmaker quest, Ceremonial Candle variant):
a cooldown-gated ranged fire bolt, dealing damage directly on hit and
applying `burning`. Java's version is a 2-turn "aim then fire" telegraph
(predictive targeting a cell ahead of the target's movement, dodgeable
by moving out of the way before the second turn); this substitutes a
same-turn hit-scan bolt, matching the existing DM-200/DM-201 vent-gas
pattern already in this engine (ai_dm200.py) rather than adding new
multi-turn-commit AI infrastructure just for this one mob."""


def _update_newborn_elemental(game, mob, floor, floor_id: int) -> bool:
    approach = ranged_approach(game, mob, floor_id)
    if approach is None:
        return False
    target, dist, in_los = approach

    cooldown = getattr(mob, "ranged_cooldown", 0)
    if cooldown > 0:
        mob.ranged_cooldown = max(0, cooldown - 1)

    if dist <= mob.attack_range and in_los and cooldown <= 0:
        _newborn_elemental_fire_bolt(game, mob, target, floor_id)
        return True

    return False


def _newborn_elemental_fire_bolt(game, mob, target, floor_id: int):
    game.add_event("RANGED_ATTACK", {
        "source": mob.id,
        "x": mob.pos.x,
        "y": mob.pos.y,
        "target_x": target.pos.x,
        "target_y": target.pos.y,
        "projectile": "fire_bolt",
        "is_wand": True,
        "sound": "BLAST",
        "crit": False,
        "grim_proc": False,
    }, floor_id=floor_id)
    game.add_event("PLAY_SOUND", {"sound": "BLAST"}, floor_id=floor_id)

    mob.last_attack_time = time.time()
    mob.ranged_cooldown = 40

    dmg = random.randint(mob.damage_min, mob.damage_max)
    dealt = ranged_dr_damage(game, mob, target, floor_id, dmg, "fire_bolt")

    if dealt > 0:
        target.add_buff("burning", duration=4.0, level=1, stack_mode="extend")

    ranged_death_check(game, target, floor_id)
