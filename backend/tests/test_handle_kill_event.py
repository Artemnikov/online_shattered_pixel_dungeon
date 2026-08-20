# Copyright (C) 2026 ArtemNikov
"""Regression coverage for GameInstance._handle_kill_event (app/engine/game/
mob_death.py) -- the shared "kill this mob outright" post-processing used
by duelist finishers and by the scroll/runestone blast effects that used to
each reimplement it inline (retribution, psionic blast, stone of blast)."""
from app.engine.entities.base import Position
from app.engine.entities.items.consumables import Gold
from app.engine.entities.mobs import Rat


def test_handle_kill_event_kills_mob_emits_death_and_drops_loot(game, monkeypatch):
    p = game.add_player("p1", "Hero", "warrior")
    floor = game._get_or_create_floor(p.floor_id)
    mob = Rat(id="m1", pos=Position(x=5, y=5))
    floor.mobs[mob.id] = mob
    mob.take_damage(999)  # caller always brings the mob to 0 hp before calling in

    drop = Gold(id="drop1", name="Gold", pos=None, quantity=7)
    monkeypatch.setattr("app.engine.systems.loot.roll_drops", lambda *a, **k: [drop])

    game._handle_kill_event(p, mob, floor)

    assert mob.is_alive is False
    assert any(e["type"] == "DEATH" and e["data"]["target"] == "m1" for e in game.events)
    assert floor.items["drop1"] is drop
