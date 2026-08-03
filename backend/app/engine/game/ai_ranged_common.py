# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 ArtemNikov
"""Shared building blocks for the ranged-spellcaster mob AI modules
(ai_dm100, ai_dm200, ai_shaman, ai_spinner, ai_warlock,
ai_newborn_elemental). Each mob keeps its own cooldown strategy, damage
roll, and on-hit effects in its own file -- only the identical
targeting/accuracy/DR-resolution boilerplate lives here."""
import random
from typing import Optional, Tuple


def ranged_approach(game, mob, floor_id: int) -> Optional[Tuple[object, int, bool]]:
    """Shared targeting gate: nearest player, hunting state, and the
    already-adjacent short-circuit. Returns (target, dist, in_los) if the
    caller should go on to check its own attack-range/cooldown gate, else
    None."""
    target = game._find_nearest_player(mob.pos, floor_id)
    if target is None:
        return None
    if mob.ai_state != "hunting":
        return None

    dist = game._get_distance(mob.pos, target.pos)
    in_los = game._is_in_los(mob.pos, target.pos, floor_id=floor_id)

    if dist == 1:
        return None

    return target, dist, in_los


def ranged_accuracy_roll(game, mob, target, floor_id: int, miss_event_fields: Optional[dict] = None) -> bool:
    """SPD's acu/df spellcaster accuracy check. Emits the ATTACK(damage=0)
    + MISS event pair on a miss (merging in `miss_event_fields`, e.g. a
    caller-specific {"fire": True} flag). Returns True on a hit, False on a
    miss."""
    acu = random.random() * mob.attack_skill
    df = random.random() * target.get_effective_defense_skill()
    if acu < df:
        attack_data = {
            "source": mob.id, "target": target.id,
            "damage": 0, "surprise": False,
        }
        if miss_event_fields:
            attack_data.update(miss_event_fields)
        game.add_event("ATTACK", attack_data, floor_id=floor_id)
        game.add_event("MISS", {
            "source": mob.id, "target": target.id,
            "defense_verb": target.defense_verb,
        }, floor_id=floor_id)
        return False
    return True


def ranged_dr_damage(game, mob, target, floor_id: int, dmg: int, bolt_type: str) -> int:
    """Rolls the target's DR, applies damage, and emits the
    ATTACK/DAMAGE/PLAY_SOUND(HIT_MAGIC) event triad shared by every
    DR-reducible ranged bolt. Returns the amount actually dealt."""
    dr = random.randint(target.get_dr_min(), target.get_dr_max())
    dealt = target.take_damage(max(0, dmg - dr))

    game.add_event("ATTACK", {
        "source": mob.id, "target": target.id,
        "damage": dealt, "surprise": False,
    }, floor_id=floor_id)
    game.add_event("DAMAGE", {
        "target": target.id, "amount": dealt,
        "projectile": bolt_type,
        "source_x": mob.pos.x, "source_y": mob.pos.y,
    }, floor_id=floor_id)
    game.add_event("PLAY_SOUND", {"sound": "HIT_MAGIC"}, floor_id=floor_id)
    return dealt


def ranged_death_check(game, target, floor_id: int) -> None:
    if not target.is_alive:
        game.add_event("DEATH", {"target": target.id}, floor_id=floor_id)
