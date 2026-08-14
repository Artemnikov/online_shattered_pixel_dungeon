"""Wand of Lightning water-electrification.

Zapping a water tile must seed an electricity blob and show the bolt even when
no char occupies the target cell (SPD bolt.collisionPos). The blob then spreads
to adjacent water on subsequent ticks.
"""

from app.engine.dungeon.constants import TileType
from app.engine.entities.base import Position
from app.engine.entities.items_wands import WandOfLightning
from app.engine.manager import GameInstance


def _water_grid(w: int = 10, h: int = 10) -> GameInstance:
    game = GameInstance("water-zap")
    game.players = {}
    game.mobs = {}
    game.grid = [[TileType.FLOOR for _ in range(w)] for _ in range(h)]
    floor = game._get_or_create_floor(game.depth)
    floor.grid[1][4] = TileType.FLOOR_WATER
    floor.grid[1][5] = TileType.FLOOR_WATER
    floor.rebuild_flags()
    return game


def _electric_blob_updates(events):
    return [e for e in events
            if e["type"] == "BLOB_UPDATE" and e["data"].get("type") == "electricity"]


def _arc_events(events):
    return [e for e in events if e["type"] == "LIGHTNING_ARC"]


def test_zap_bare_water_seeds_electricity_blob():
    game = _water_grid()
    player = game.add_player("p1", "Player")
    player.pos = Position(x=1, y=1)
    player.last_attack_time = 0.0
    wand = WandOfLightning(id="w1", charges=3)
    player.add_to_inventory(wand)

    game.perform_ranged_attack("p1", "w1", 4, 1)  # empty water tile, no mob

    events = game.flush_events()
    updates = _electric_blob_updates(events)
    assert updates, "zapping bare water must emit an electricity BLOB_UPDATE"

    floor = game._get_or_create_floor(game.depth)
    blobs = [b for b in floor.blob_areas.values() if b.get("type") == "electricity"]
    assert blobs, "electricity blob must exist in floor.blob_areas"
    assert (4, 1) in blobs[0]["cells"], "blob must cover the zapped water tile"

    assert _arc_events(events), "empty-water zap must still show the main bolt"


def test_zap_bare_water_blob_spreads_to_adjacent_water():
    game = _water_grid()
    player = game.add_player("p1", "Player")
    player.pos = Position(x=1, y=1)
    player.last_attack_time = 0.0
    wand = WandOfLightning(id="w1", charges=3)
    player.add_to_inventory(wand)

    game.perform_ranged_attack("p1", "w1", 4, 1)
    game.flush_events()

    for _ in range(10):
        game.update_tick()
    events = game.flush_events()

    updates = _electric_blob_updates(events)
    assert updates, "spreading blob must keep emitting BLOB_UPDATE"

    floor = game._get_or_create_floor(game.depth)
    blobs = [b for b in floor.blob_areas.values() if b.get("type") == "electricity"]
    assert blobs, "electricity blob must persist across ticks"
    assert (5, 1) in blobs[0]["cells"], "blob must spread to adjacent water tile"
