import random
import time

from app.engine.entities.mobs import RedShaman, BlueShaman, PurpleShaman
from app.engine.game.ai_ranged_common import (
    ranged_accuracy_roll, ranged_approach, ranged_death_check, ranged_dr_damage,
)


def _update_shaman(game, mob, floor, floor_id: int) -> bool:
    approach = ranged_approach(game, mob, floor_id)
    if approach is None:
        return False
    target, dist, in_los = approach

    if dist <= mob.attack_range and in_los:
        now = time.time()
        last = getattr(mob, "last_attack_time", 0)
        if now - last < 1.5:
            return False
        _shaman_zap(game, mob, target, floor, floor_id)
        return True

    return False


def _shaman_zap(game, mob, target, floor, floor_id: int):
    bolt_type = getattr(mob, "bolt_type", "shaman_purple")
    game.add_event("RANGED_ATTACK", {
        "source": mob.id,
        "x": mob.pos.x,
        "y": mob.pos.y,
        "target_x": target.pos.x,
        "target_y": target.pos.y,
        "projectile": bolt_type,
        "is_wand": True,
        "sound": "ZAP",
        "crit": False,
        "grim_proc": False,
    }, floor_id=floor_id)
    game.add_event("PLAY_SOUND", {"sound": "ZAP"}, floor_id=floor_id)

    mob.last_attack_time = time.time()

    if not ranged_accuracy_roll(game, mob, target, floor_id):
        return

    dmg = random.randint(6, 15)
    dealt = ranged_dr_damage(game, mob, target, floor_id, dmg, bolt_type)

    if dealt > 0:
        if isinstance(mob, RedShaman) and random.random() < 0.5:
            target.add_buff("weakness", duration=10.0, level=1)
            game.add_event("PLAY_SOUND", {"sound": "DEBUFF"}, floor_id=floor_id)
        elif isinstance(mob, BlueShaman) and random.random() < 0.5:
            target.add_buff("vulnerable", duration=15.0, level=1)
            game.add_event("PLAY_SOUND", {"sound": "DEBUFF"}, floor_id=floor_id)
        elif isinstance(mob, PurpleShaman) and random.random() < 0.5:
            target.add_buff("hex", duration=10.0, level=1)
            game.add_event("PLAY_SOUND", {"sound": "DEBUFF"}, floor_id=floor_id)

    ranged_death_check(game, target, floor_id)
