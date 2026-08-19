# Copyright (C) 2026 ArtemNikov
"""Regression coverage for GameInstance.perform_ranged_attack's thrown-item
floor drop (app/engine/game/movement.py). A stacked throwable (darts, stones,
daggers) must land on the floor on every throw, not just the last unit in the
stack -- consume_backpack_item() returns the split-off unit that was actually
detached, so the floor drop must be gated on that return value alone, not on
whether the original stack id is now fully gone from the backpack."""
from app.engine.entities.base import Position
from app.engine.entities.items_consumable import Throwable


def test_thrown_stack_drops_a_floor_item_on_every_throw(open_game_factory):
    game = open_game_factory(width=12, height=12)
    p = game.add_player("p1", "Hero", "warrior")
    p.pos = Position(x=5, y=5)

    darts = Throwable(id="darts1", name="Dart", quantity=3, min_dmg=1, max_dmg=1)
    p.belongings.backpack.items.append(darts)

    floor = game._get_or_create_floor(p.floor_id)

    for expected_remaining in (2, 1, 0):
        p.last_attack_time = 0  # bypass ranged-attack cooldown between throws
        floor.items.clear()
        game.perform_ranged_attack("p1", "darts1", 8, 5)

        assert len(floor.items) == 1, (
            f"expected a floor item after this throw, remaining stack should be {expected_remaining}"
        )
        remaining = p.belongings.get_item("darts1")
        if expected_remaining == 0:
            assert remaining is None
        else:
            assert remaining is not None and remaining.quantity == expected_remaining
