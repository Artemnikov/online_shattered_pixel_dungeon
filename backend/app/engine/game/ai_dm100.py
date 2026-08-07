import time

from app.engine.entities.base import normal_int_range as _normal_int_range
from app.engine.game.ai_ranged_common import ranged_accuracy_roll, ranged_approach, ranged_death_check


"""DM-100: fires an electric zap at range (SPD DM100.doAttack's else branch).
Unlike a wand bolt, the zap skips armor DR entirely -- Java's doAttack calls
enemy.damage(dmg, ...) directly, never enemy.drRoll(), so it always ignores
defense reduction."""


def _update_dm100(game, mob, floor, floor_id: int) -> bool:
    approach = ranged_approach(game, mob, floor_id)
    if approach is None:
        return False
    target, dist, in_los = approach

    if dist <= mob.attack_range and in_los:
        now = time.time()
        if now - mob.last_attack_time < mob.attack_cooldown:
            return False
        _dm100_zap(game, mob, target, floor_id)
        return True

    return False


def _dm100_zap(game, mob, target, floor_id: int):
    game.add_event("LIGHTNING_ARC", {
        "source_x": mob.pos.x, "source_y": mob.pos.y,
        "target_x": target.pos.x, "target_y": target.pos.y,
    }, floor_id=floor_id)
    game.add_event("PLAY_SOUND", {"sound": "LIGHTNING"}, floor_id=floor_id)

    mob.last_attack_time = time.time()

    if not ranged_accuracy_roll(game, mob, target, floor_id):
        return

    dmg = _normal_int_range(3, 10)
    dealt = target.take_damage(dmg)

    game.add_event("ATTACK", {
        "source": mob.id, "target": target.id,
        "damage": dealt, "surprise": False,
    }, floor_id=floor_id)
    game.add_event("DAMAGE", {
        "target": target.id, "amount": dealt,
    }, floor_id=floor_id)

    ranged_death_check(game, target, floor_id)
