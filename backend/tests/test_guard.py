import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.engine.entities.base import Position
from app.engine.entities.buffs import get_buff
from app.engine.entities.mobs import Guard
from app.engine.game.ai_guard import _update_guard
from app.engine.manager import GameInstance
from app.engine.systems.loot import roll_drops


def _game_corridor(px=15, py=15, length=8):
    g = GameInstance("t")
    p = g.add_player("p1", "Hero", "warrior")
    floor = g._get_or_create_floor(p.floor_id)
    floor.mobs.clear()
    p.pos = Position(x=px, y=py)
    for x in range(px - 1, px + length + 2):
        for y in (py - 1, py, py + 1):
            floor.flags.solid[y][x] = False
            floor.flags.passable[y][x] = True
    return g, p, floor


def _guard(x, y):
    guard = Guard(id="g", pos=Position(x=x, y=y))
    guard.ai_state = "hunting"
    return guard


# --- chain-pull gating and effect -------------------------------------------

def test_chain_pulls_player_into_range():
    g, p, floor = _game_corridor()
    p.pos = Position(x=19, y=15)
    guard = _guard(15, 15)
    floor.mobs[guard.id] = guard

    fired = _update_guard(g, guard, floor, p.floor_id)

    assert fired is True
    assert guard.chain_pulled is True
    assert (p.pos.x, p.pos.y) == (16, 15)          # earliest open cell toward the guard
    cripple = get_buff(p.buffs, "cripple")
    assert cripple is not None and cripple.remaining == 4.0


def test_too_close_is_noop():
    g, p, floor = _game_corridor()
    p.pos = Position(x=16, y=15)                   # dist 1 == already in melee range
    guard = _guard(15, 15)
    floor.mobs[guard.id] = guard

    fired = _update_guard(g, guard, floor, p.floor_id)

    assert fired is False
    assert guard.chain_pulled is False
    assert (p.pos.x, p.pos.y) == (16, 15)


def test_too_far_is_noop():
    g, p, floor = _game_corridor(length=10)
    p.pos = Position(x=20, y=15)                   # dist 5
    guard = _guard(15, 15)
    floor.mobs[guard.id] = guard

    fired = _update_guard(g, guard, floor, p.floor_id)

    assert fired is False
    assert guard.chain_pulled is False


def test_blocked_los_is_noop():
    g, p, floor = _game_corridor()
    p.pos = Position(x=18, y=15)
    floor.flags.solid[15][17] = True               # wall between guard and target
    guard = _guard(15, 15)
    floor.mobs[guard.id] = guard

    fired = _update_guard(g, guard, floor, p.floor_id)

    assert fired is False
    assert guard.chain_pulled is False
    assert (p.pos.x, p.pos.y) == (18, 15)


def test_chasm_in_front_of_guard_is_noop():
    g, p, floor = _game_corridor()
    p.pos = Position(x=18, y=15)
    floor.flags.pit[15][16] = True                 # tile immediately in front of the guard

    guard = _guard(15, 15)
    floor.mobs[guard.id] = guard

    fired = _update_guard(g, guard, floor, p.floor_id)

    assert fired is False
    assert guard.chain_pulled is False


def test_no_open_landing_cell_is_noop():
    g, p, floor = _game_corridor()
    p.pos = Position(x=18, y=15)
    guard = _guard(15, 15)
    floor.mobs[guard.id] = guard
    # occupy every cell between the guard and the target so no landing spot exists
    floor.mobs["b1"] = Guard(id="b1", pos=Position(x=16, y=15))
    floor.mobs["b2"] = Guard(id="b2", pos=Position(x=17, y=15))

    fired = _update_guard(g, guard, floor, p.floor_id)

    assert fired is False
    assert guard.chain_pulled is False
    assert (p.pos.x, p.pos.y) == (18, 15)


def test_one_shot_never_fires_twice():
    g, p, floor = _game_corridor()
    p.pos = Position(x=19, y=15)
    guard = _guard(15, 15)
    floor.mobs[guard.id] = guard

    assert _update_guard(g, guard, floor, p.floor_id) is True

    p.pos = Position(x=19, y=15)                   # as if the player walked back
    assert _update_guard(g, guard, floor, p.floor_id) is False


# --- diminishing armor-drop chance ------------------------------------------

def test_guard_loot_entry_has_decay_key():
    guard = Guard(id="g", pos=Position(x=0, y=0))
    assert guard.loot_table[0].decay_key == "guard_arm"


def test_guard_loot_chance_decays_per_kill(monkeypatch):
    guard = Guard(id="g", pos=Position(x=0, y=0))
    counters = {}

    # A fixed 0.15 draw clears the base 0.2 chance but not 0.2/3 ~= 0.067.
    monkeypatch.setattr("app.engine.systems.loot.random.random", lambda: 0.15)

    first = roll_drops(guard, counters, 0, 0)
    assert len(first) == 1
    assert counters["guard_arm"] == 1

    second = roll_drops(guard, counters, 0, 0)
    assert len(second) == 0
    assert counters["guard_arm"] == 1          # unchanged: no drop, no further decay
