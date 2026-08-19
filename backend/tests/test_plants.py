# Copyright (C) 2026 ArtemNikov
#
import pytest
from app.engine.entities.base import Position
from app.engine.entities.items.consumables import Blandfruit, Seed
from app.engine.entities.player import Player, Mob as MobEntity
from app.engine.game.floor_state import FloorState
from app.engine.game.terrain_effects import press_cell, _trigger_plant_effect
from app.engine.alchemy.recipes import CookBlandfruitRecipe


def create_test_floor():
    grid = [[1 for _ in range(10)] for _ in range(10)]  # TileType.FLOOR = 1
    return FloorState(floor_id=1, grid=grid, rooms=[], mobs={}, items={})


def create_test_player(is_warden=False):
    player = Player(
        id="player_1",
        name="Hero",
        pos=Position(x=1, y=1),
        hp=20,
        max_hp=20,
        floor_id=1,
    )
    if is_warden:
        player.subclass_info.subclass = "warden"
    return player


def test_sungrass_trigger():
    floor = create_test_floor()
    player = create_test_player(is_warden=False)
    player.hp = 10
    plant = {"pos": (1, 1), "plant_type": "sungrass", "triggered": False}
    _trigger_plant_effect(floor, (1, 1), plant, player)

    assert any(b.type == "sungrass_health" for b in player.buffs)


def test_sungrass_warden_trigger():
    floor = create_test_floor()
    player = create_test_player(is_warden=True)
    player.hp = 10
    plant = {"pos": (1, 1), "plant_type": "sungrass", "triggered": False}
    _trigger_plant_effect(floor, (1, 1), plant, player)

    assert player.hp == player.max_hp


def test_earthroot_warden_trigger():
    floor = create_test_floor()
    player = create_test_player(is_warden=True)
    plant = {"pos": (1, 1), "plant_type": "earthroot", "triggered": False}
    _trigger_plant_effect(floor, (1, 1), plant, player)

    assert any(b.type == "barkskin" for b in player.buffs)


def test_swiftthistle_trigger():
    floor = create_test_floor()
    player = create_test_player(is_warden=False)
    plant = {"pos": (1, 1), "plant_type": "swiftthistle", "triggered": False}
    _trigger_plant_effect(floor, (1, 1), plant, player)

    assert any(b.type == "time_bubble" for b in player.buffs)


def test_rotberry_seed_drop():
    floor = create_test_floor()
    player = create_test_player(is_warden=False)
    plant = {"pos": (1, 1), "plant_type": "rotberry", "triggered": False}
    _trigger_plant_effect(floor, (1, 1), plant, player)

    seeds = [i for i in floor.items.values() if isinstance(i, Seed) and i.plant_type == "rotberry"]
    assert len(seeds) == 1


def test_cook_blandfruit_recipe():
    recipe = CookBlandfruitRecipe()
    fruit = Blandfruit(name="Blandfruit")
    seed = Seed(name="Rotberry Seed", plant_type="rotberry")

    assert recipe.test_ingredients(None, [fruit, seed]) is True
    out = recipe.brew(None, [fruit, seed])
    assert out is not None
    assert out.potion_type == "strength"
    assert out.name == "Rotfruit"


def test_lotus_seed_preservation():
    floor = create_test_floor()
    player = create_test_player(is_warden=False)
    lotus = MobEntity(
        id="lotus_1",
        type="mob",
        mob_type="lotus",
        name="Lotus",
        pos=Position(x=1, y=2),
        hp=25,
        max_hp=25,
        attack=0,
        defense=999,
        damage_min=0,
        damage_max=0,
        view_distance=3,
    )
    lotus._wand_level = 10  # 100% preservation rate
    floor.mobs[lotus.id] = lotus

    floor.plants[(1, 1)] = {"pos": (1, 1), "plant_type": "firebloom", "triggered": False}
    press_cell(floor, (1, 1), player)

    seeds = [i for i in floor.items.values() if isinstance(i, Seed) and i.plant_type == "firebloom"]
    assert len(seeds) == 1
