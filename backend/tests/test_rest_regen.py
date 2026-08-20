# Copyright (C) 2026 ArtemNikov
#
# Tests for the online-only rest-healing and the nourished food buff:
#   - base rest heal: 1 HP / REST_HEAL_INTERVAL while standing still with no
#     hostile mob within REST_ENEMY_RADIUS,
#   - nourished: doubles the rest rate and adds reduced-rate combat healing,
#   - well_fed stays independent of rest heal.
from app.engine.manager import GameInstance
from app.engine.entities.base import Position
from app.engine.entities.items.consumables import Ration
from app.engine.entities.player import Mob as MobEntity
from app.engine.game.constants import (
    NOURISHED_COMBAT_HEAL_FRACTION,
    NOURISHED_DURATION_PER_ENERGY,
    NOURISHED_HEAL_BOOST,
    REST_ENEMY_RADIUS,
    REST_HEAL_INTERVAL,
    REST_STILL_TICKS,
)

DT = 0.05
HEAL_AMOUNT = 10


def _make_game():
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")
    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()
    return game, player, floor


def _tick_regen(game, player, ticks):
    for _ in range(ticks):
        game._apply_rest_regen(player, DT)


def _add_mob(floor, mob_id, x, y):
    floor.mobs[mob_id] = MobEntity(
        id=mob_id, name="Rat", pos=Position(x=x, y=y),
        hp=10, max_hp=10,
    )


def test_rest_regen_heals_at_base_rate_when_stationary():
    game, player, floor = _make_game()
    player.hp = player.max_hp - HEAL_AMOUNT
    player.stationary_ticks = REST_STILL_TICKS

    _tick_regen(game, player, int(1.2 * REST_HEAL_INTERVAL / DT))
    # 1 HP per REST_HEAL_INTERVAL: 1.2 intervals -> exactly 1 HP
    assert player.hp == player.max_hp - HEAL_AMOUNT + 1


def test_rest_regen_requires_stationary():
    game, player, floor = _make_game()
    player.hp = player.max_hp - HEAL_AMOUNT
    player.stationary_ticks = REST_STILL_TICKS - 1

    _tick_regen(game, player, int(3 * REST_HEAL_INTERVAL / DT))
    assert player.hp == player.max_hp - HEAL_AMOUNT


def test_rest_regen_paused_by_hostile_mob_and_resumes():
    game, player, floor = _make_game()
    player.hp = player.max_hp - HEAL_AMOUNT
    player.stationary_ticks = REST_STILL_TICKS

    _add_mob(floor, "m1", player.pos.x + 3, player.pos.y)
    _tick_regen(game, player, int(3 * REST_HEAL_INTERVAL / DT))
    assert player.hp == player.max_hp - HEAL_AMOUNT

    floor.mobs["m1"].pos = Position(
        x=player.pos.x + REST_ENEMY_RADIUS + 1, y=player.pos.y,
    )
    _tick_regen(game, player, int(1.2 * REST_HEAL_INTERVAL / DT))
    assert player.hp == player.max_hp - HEAL_AMOUNT + 1


def test_rest_regen_paused_while_boss_arena_sealed():
    game, player, floor = _make_game()
    player.hp = player.max_hp - HEAL_AMOUNT
    player.stationary_ticks = REST_STILL_TICKS
    player.locked_floor_left = 0.5

    _tick_regen(game, player, int(3 * REST_HEAL_INTERVAL / DT))
    assert player.hp == player.max_hp - HEAL_AMOUNT


def test_nourished_boosts_rest_rate():
    game, player, floor = _make_game()
    player.hp = player.max_hp - HEAL_AMOUNT
    player.stationary_ticks = REST_STILL_TICKS
    game.on_food_eaten(player, Ration(id="food1"))

    assert player.has_buff("nourished")
    # boosted rate = base * NOURISHED_HEAL_BOOST; tick enough for exactly 2 HP
    ticks = int(2 * REST_HEAL_INTERVAL / DT / NOURISHED_HEAL_BOOST) + 2
    _tick_regen(game, player, ticks)
    assert player.hp == player.max_hp - HEAL_AMOUNT + 2


def test_nourished_grants_reduced_combat_heal():
    game, player, floor = _make_game()
    player.hp = player.max_hp - HEAL_AMOUNT
    player.stationary_ticks = 0
    game.on_food_eaten(player, Ration(id="food1"))

    _add_mob(floor, "m1", player.pos.x + 1, player.pos.y)
    # combat rate = base * NOURISHED_COMBAT_HEAL_FRACTION; enough for 2 HP
    ticks = int(2 * REST_HEAL_INTERVAL / DT / NOURISHED_COMBAT_HEAL_FRACTION) + 2
    _tick_regen(game, player, ticks)
    assert player.hp == player.max_hp - HEAL_AMOUNT + 2


def test_no_combat_heal_without_nourished():
    game, player, floor = _make_game()
    player.hp = player.max_hp - HEAL_AMOUNT
    player.stationary_ticks = 0

    _add_mob(floor, "m1", player.pos.x + 1, player.pos.y)
    _tick_regen(game, player, int(3 * REST_HEAL_INTERVAL / DT))
    assert player.hp == player.max_hp - HEAL_AMOUNT


def test_nourished_duration_scales_with_food_energy():
    game, player, floor = _make_game()
    food = Ration(id="food1")
    game.on_food_eaten(player, food)
    buff = player.get_buff("nourished")
    assert buff is not None
    assert abs(buff.remaining - food.energy * NOURISHED_DURATION_PER_ENERGY) < 0.01
    assert abs(getattr(player, "_nourished_duration", 0.0) - buff.remaining) < 0.01


def test_well_fed_heals_independently_of_rest_conditions():
    game, player, floor = _make_game()
    player.hp = player.max_hp - HEAL_AMOUNT
    player.stationary_ticks = 0
    player.add_buff("well_fed", duration=450.0)

    _add_mob(floor, "m1", player.pos.x + 1, player.pos.y)
    for _ in range(int(18.0 / DT)):
        game._apply_passive_regen(player, DT)

    assert player.hp == player.max_hp - HEAL_AMOUNT + 1
