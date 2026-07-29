import random
import time


"""DM-100: fires an electric zap at range (SPD DM100.doAttack's else branch).
Unlike a wand bolt, the zap skips armor DR entirely -- Java's doAttack calls
enemy.damage(dmg, ...) directly, never enemy.drRoll(), so it always ignores
defense reduction."""


def _normal_int_range(lo: int, hi: int) -> int:
    # SPD Random.NormalIntRange: mean-biased average of two uniforms.
    return round((random.randint(lo, hi) + random.randint(lo, hi)) / 2)


def _update_dm100(game, mob, floor, floor_id: int) -> bool:
    target = game._find_nearest_player(mob.pos, floor_id)
    if target is None:
        return False

    if mob.ai_state != "hunting":
        return False

    dist = game._get_distance(mob.pos, target.pos)
    in_los = game._is_in_los(mob.pos, target.pos, floor_id=floor_id)

    if dist == 1:
        return False

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

    acu = random.random() * mob.attack_skill
    df = random.random() * target.get_effective_defense_skill()
    if acu < df:
        game.add_event("ATTACK", {
            "source": mob.id, "target": target.id,
            "damage": 0, "surprise": False,
        }, floor_id=floor_id)
        game.add_event("MISS", {
            "source": mob.id, "target": target.id,
            "defense_verb": target.defense_verb,
        }, floor_id=floor_id)
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

    if not target.is_alive:
        game.add_event("DEATH", {"target": target.id}, floor_id=floor_id)
