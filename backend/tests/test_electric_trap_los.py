"""Electric effects (trap blob + lightning sound) are LOS-scoped to the
activating player and same-floor players in line of sight — never broadcast to
players on other floors or out of LOS."""

from app.engine.dungeon.constants import TileType, TrapType
from app.engine.dungeon.models import TrapInfo
from app.engine.entities.base import Position
from app.engine.game.floor_state import FloorState
from app.engine.manager import GameInstance


def _make_floor(floor_id, wall_x=5):
    grid = [[TileType.FLOOR for _ in range(11)] for _ in range(11)]
    for y in range(11):
        grid[y][wall_x] = TileType.WALL
    floor = FloorState(floor_id=floor_id, grid=grid, rooms=[], mobs={}, items={})
    floor.rebuild_flags()
    return floor


def _lightning_sounds(events):
    return [e for e in events
            if e["type"] == "PLAY_SOUND" and e["data"].get("sound") == "LIGHTNING"]


def _electric_blob_updates(events):
    return [e for e in events
            if e["type"] == "BLOB_UPDATE" and e["data"].get("type") == "electricity"]


def _mob_damage(events, mob_id):
    return [e for e in events
            if e["type"] == "DAMAGE" and e["data"].get("target") == mob_id]


def _setup_los_scene():
    g = GameInstance("trap-los")
    f1 = _make_floor(1)
    g.floors[1] = f1
    g.floors[2] = _make_floor(2)

    p1 = g.add_player("p1", "Activator")
    p2 = g.add_player("p2", "OtherFloor")
    p3 = g.add_player("p3", "OutOfLOS")
    p4 = g.add_player("p4", "InLOS")

    p1.pos = Position(x=2, y=5)
    p2.floor_id = 2
    p2.pos = Position(x=1, y=1)
    p3.pos = Position(x=9, y=5)
    p4.pos = Position(x=3, y=5)

    f1.traps[(2, 5)] = TrapInfo(x=2, y=5, trap_type=TrapType.SHOCKING_TRAP,
                                hidden=False, active=True, can_be_searched=True)
    return g, f1, p1, p2, p3, p4


def test_electric_trap_reaches_only_activator_and_los_players():
    g, f1, p1, p2, p3, p4 = _setup_los_scene()

    g.flush_events()
    g._trigger_trap_if_needed(f1, p1, 1)
    for _ in range(5):
        g.update_tick()

    events = g.flush_events()

    p1_ev = g.filter_events_for_player(events, "p1")
    assert _lightning_sounds(p1_ev), "activator should hear the zap"
    assert _electric_blob_updates(p1_ev), "activator should see the spark grid"

    p4_ev = g.filter_events_for_player(events, "p4")
    assert _lightning_sounds(p4_ev), "in-LOS teammate should hear the zap"
    assert _electric_blob_updates(p4_ev), "in-LOS teammate should see the spark grid"

    p3_ev = g.filter_events_for_player(events, "p3")
    assert not _lightning_sounds(p3_ev), "out-of-LOS player must not hear the zap"
    assert not _electric_blob_updates(p3_ev), "out-of-LOS player must not see the spark grid"

    p2_ev = g.filter_events_for_player(events, "p2")
    assert not _lightning_sounds(p2_ev), "other-floor player must not hear the zap"
    assert not _electric_blob_updates(p2_ev), "other-floor player must not see the spark grid"


def test_electric_trap_mob_damage_los_scoped():
    g, f1, p1, p2, p3, p4 = _setup_los_scene()
    from app.engine.entities.player import Mob
    mob = Mob(id="m1", name="Rat", pos=Position(x=1, y=4),
              hp=1000, max_hp=1000, faction="dungeon")
    f1.mobs["m1"] = mob

    g.flush_events()
    g._trigger_trap_if_needed(f1, p1, 1)
    for _ in range(5):
        g.update_tick()

    events = g.flush_events()

    assert _mob_damage(g.filter_events_for_player(events, "p1"), "m1"), \
        "activator must see the mob get zapped"
    assert _mob_damage(g.filter_events_for_player(events, "p4"), "m1"), \
        "in-LOS teammate must see the mob get zapped"
    assert not _mob_damage(g.filter_events_for_player(events, "p3"), "m1"), \
        "out-of-LOS player must not see the mob get zapped"
    assert not _mob_damage(g.filter_events_for_player(events, "p2"), "m1"), \
        "other-floor player must not see the mob get zapped"


def test_electric_trap_origin_los_survives_trigger_respawn():
    """Blob events are anchored at the trap cell, not the trigger's current
    position — so a trigger who moves/respawns away doesn't yank the LOS
    window, and in-LOS teammates keep seeing the effect."""
    g, f1, p1, p2, p3, p4 = _setup_los_scene()

    g.flush_events()
    g._trigger_trap_if_needed(f1, p1, 1)
    # Simulate respawn/movement: trigger teleports to the far, out-of-LOS corner.
    p1.pos = Position(x=9, y=5)
    for _ in range(5):
        g.update_tick()

    events = g.flush_events()

    p4_ev = g.filter_events_for_player(events, "p4")
    assert _electric_blob_updates(p4_ev), "in-LOS teammate must still see the blob after trigger moved"
    assert _lightning_sounds(p4_ev), "in-LOS teammate must still hear the zap after trigger moved"

    p3_ev = g.filter_events_for_player(events, "p3")
    assert not _electric_blob_updates(p3_ev), "out-of-LOS player still must not see the blob"
    assert not _lightning_sounds(p3_ev), "out-of-LOS player still must not hear the zap"
