# Copyright (C) 2026 ArtemNikov
"""Regression coverage for GameInstance._finish_kill (app/engine/game/
movement.py) -- the shared "combat kill" post-processing used by both melee
bump-attacks and ranged/thrown attacks. Covers ordering-sensitive death hooks:
die() must run before handle_mob_death(), since some hooks (e.g. the
Necromancer's linked-skeleton kill) depend on die()'s side effects."""
from app.engine.entities.base import Position
from app.engine.entities.mobs import Necromancer, Skeleton


def test_finish_kill_necromancer_kills_linked_skeleton_and_emits_death(game):
    p = game.add_player("p1", "Hero", "warrior")
    floor = game._get_or_create_floor(p.floor_id)

    skeleton = Skeleton(id="skel1", pos=Position(x=6, y=5))
    floor.mobs[skeleton.id] = skeleton

    necro = Necromancer(id="necro1", pos=Position(x=5, y=5), my_skeleton_id=skeleton.id)
    floor.mobs[necro.id] = necro
    necro.take_damage(999)  # caller always brings the mob to 0 hp before calling in

    game._finish_kill(p, necro, floor, p.floor_id)

    assert skeleton.is_alive is False
    assert any(e["type"] == "DEATH" and e["data"]["target"] == "skel1" for e in game.events)
