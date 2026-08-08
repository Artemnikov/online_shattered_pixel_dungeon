"""SkeletonKey AC_INSERT (action_unlock) — SPD flow port tests."""
import time

from app.engine.dungeon.constants import TileType
from app.engine.entities.base import Action
from app.engine.entities.item_union import Chest
from app.engine.entities.items_artifacts import SkeletonKey
from app.engine.entities.player import Mob as MobEntity
from app.engine.manager import GameInstance


def _make(charge=10):
    g = GameInstance("skeleton-key-test")
    floor = g._get_or_create_floor(1)
    p = g.add_player("p1", "Hero")
    key = SkeletonKey(id="sk1", charge=charge, charge_cap=10)
    p.add_to_inventory(key)
    p.equip_item("sk1")
    p.pos.x, p.pos.y = 5, 5
    return g, floor, p, key


def _set(floor, x, y, tile):
    floor.grid[y][x] = tile
    floor.rebuild_flags()


def _unlock(g, p, key, tx, ty):
    g.execute_item_action(p.id, key.id, Action.UNLOCK, tx, ty)
    return g.flush_events()


def test_locked_door_unlock_spends_one_charge():
    g, floor, p, key = _make()
    _set(floor, 6, 5, TileType.LOCKED_DOOR)
    floor.locked_doors[(6, 5)] = "iron"
    floor.rebuild_flags()

    events = _unlock(g, p, key, 6, 5)

    assert floor.grid[5][6] == TileType.DOOR
    assert (6, 5) not in floor.locked_doors
    assert key.charge == 9
    assert any(e["type"] == "UNLOCK" for e in events)
    assert any(e["type"] == "MAP_PATCH" for e in events)


def test_crystal_door_unlock_spends_five_charges():
    g, floor, p, key = _make(charge=5)
    _set(floor, 6, 5, TileType.CRYSTAL_DOOR)
    floor.locked_doors[(6, 5)] = "crystal"
    floor.rebuild_flags()

    _unlock(g, p, key, 6, 5)

    assert floor.grid[5][6] == TileType.FLOOR
    assert (6, 5) not in floor.locked_doors
    assert key.charge == 0


def test_hero_locked_door_opens_free():
    g, floor, p, key = _make()
    _set(floor, 6, 5, TileType.HERO_LKD_DR)

    _unlock(g, p, key, 6, 5)

    assert floor.grid[5][6] == TileType.DOOR
    assert key.charge == 10


def test_normal_door_locks_into_hero_door():
    g, floor, p, key = _make()
    _set(floor, 6, 5, TileType.DOOR)

    _unlock(g, p, key, 6, 5)

    assert floor.grid[5][6] == TileType.HERO_LKD_DR
    assert key.charge == 8


def test_door_lock_refused_without_push_space():
    g, floor, p, key = _make()
    _set(floor, 6, 5, TileType.DOOR)
    # wall off every neighbour so no door-push cell exists
    for x in (5, 6, 7):
        for y in (4, 5, 6):
            if (x, y) == (6, 5) or (x, y) == (5, 5):
                continue
            _set(floor, x, y, TileType.WALL)
    # a char occupies the door — SPD only refuses when someone is in the way
    mob = MobEntity(id="m1", name="Rat", pos=p.pos.__class__(x=6, y=5), hp=10, max_hp=10)
    floor.mobs[mob.id] = mob
    floor.rebuild_flags()

    events = _unlock(g, p, key, 6, 5)

    assert floor.grid[5][6] == TileType.DOOR
    assert key.charge == 10
    assert any("no space" in e["data"].get("text", "") for e in events if e["type"] == "MESSAGE")


def test_locked_chest_unlock_spends_two_charges():
    g, floor, p, key = _make()
    chest = Chest(id="c1", pos=p.pos.__class__(x=6, y=5), chest_type="LOCKED_CHEST")
    floor.items[chest.id] = chest
    floor.rebuild_flags()

    _unlock(g, p, key, 6, 5)

    assert key.charge == 8
    assert (6, 5) in floor.pending_unlocks


def test_crystal_chest_unlock_spends_five_charges():
    g, floor, p, key = _make(charge=5)
    chest = Chest(id="c1", pos=p.pos.__class__(x=6, y=5), chest_type="CRYSTAL_CHEST")
    floor.items[chest.id] = chest
    floor.rebuild_flags()

    _unlock(g, p, key, 6, 5)

    assert key.charge == 0
    assert (6, 5) in floor.pending_unlocks


def test_insufficient_charge_is_noop():
    g, floor, p, key = _make(charge=0)
    _set(floor, 6, 5, TileType.LOCKED_DOOR)
    floor.locked_doors[(6, 5)] = "iron"
    floor.rebuild_flags()

    events = _unlock(g, p, key, 6, 5)

    # charge 0 hides UNLOCK from item.actions(), so the action is never dispatched
    assert floor.grid[5][6] == TileType.LOCKED_DOOR
    assert Action.UNLOCK not in key.actions(p)
    assert not any(e["type"] in ("MAP_PATCH", "UNLOCK") for e in events)


def test_unequipped_key_is_noop():
    g, floor, p, key = _make()
    p.unequip_item(key.id)
    _set(floor, 6, 5, TileType.LOCKED_DOOR)
    floor.locked_doors[(6, 5)] = "iron"
    floor.rebuild_flags()

    _unlock(g, p, key, 6, 5)

    assert floor.grid[5][6] == TileType.LOCKED_DOOR


def _clear_around(floor, x, y):
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            _set(floor, x + dx, y + dy, TileType.FLOOR)
    floor.mobs = {}
    floor.rebuild_flags()


def test_distant_target_summons_key_wall_blobs():
    g, floor, p, key = _make(charge=4)
    _clear_around(floor, 5, 5)

    events = _unlock(g, p, key, 12, 12)

    assert key.charge == 2
    key_walls = [b for b in floor.blob_areas.values() if b.get("type") == "key_wall"]
    assert key_walls
    assert any(e["type"] == "BLOB_UPDATE" for e in events)


def test_wall_blobs_expire_after_ten_seconds():
    g, floor, p, key = _make(charge=2)
    _clear_around(floor, 5, 5)
    _unlock(g, p, key, 12, 12)

    key_walls = [b for b in floor.blob_areas.values() if b.get("type") == "key_wall"]
    assert key_walls
    for blob in key_walls:
        blob["remaining"] = 0.01
    g.update_tick()

    assert not [b for b in floor.blob_areas.values() if b.get("type") == "key_wall"]


def test_bump_hero_locked_door_refused_with_key():
    g, floor, p, key = _make()
    _set(floor, 6, 5, TileType.HERO_LKD_DR)

    g.move_entity(p.id, 1, 0)

    assert floor.grid[5][6] == TileType.HERO_LKD_DR
    assert (p.pos.x, p.pos.y) == (5, 5)


def test_bump_hero_locked_door_opens_without_key():
    g, floor, p, key = _make()
    p.unequip_item(key.id)
    _set(floor, 6, 5, TileType.HERO_LKD_DR)

    g.move_entity(p.id, 1, 0)

    assert floor.grid[5][6] == TileType.DOOR
